import csv
import json
import random
from collections import Counter
from pathlib import Path

data_dir = Path(__file__).parent / "data"
symptoms = ["runny", "stuffy", "itchy"]
rng = random.Random(42)

with (data_dir / "training_cases.csv").open(encoding="utf-8-sig", newline="") as file:
    cases = list(csv.DictReader(file))

# Hold out 20% of each cause so both labels appear in the test set.
causes = sorted({case["assigned_cause"] for case in cases})
training = []
testing = []

for cause in causes:
    group = [case for case in cases if case["assigned_cause"] == cause]
    rng.shuffle(group)
    split = len(group) // 5
    testing.extend(group[:split])
    training.extend(group[split:])

model = {"symptoms": symptoms, "classes": {}}

for cause in causes:
    group = [case for case in training if case["assigned_cause"] == cause]
    likelihoods = {}

    for symptom in symptoms:
        counts = Counter(case[symptom] for case in group)
        definite = counts["Yes"] + counts["No"]

        # Add one to each count so an unseen answer still has a small probability.
        likelihoods[symptom] = {
            answer: (counts[answer] + 1) / (definite + 2)
            for answer in ["Yes", "No"]
        }

    model["classes"][cause] = {
        "prior": len(group) / len(training),
        "likelihoods": likelihoods,
    }


def predict(case):
    scores = {}

    for cause, learned in model["classes"].items():
        score = learned["prior"]
        for symptom in symptoms:
            answer = case[symptom]
            if answer != "Unsure":
                score *= learned["likelihoods"][symptom][answer]
        scores[cause] = score

    best = max(scores.values())
    winners = [cause for cause, score in scores.items() if score == best]
    return winners[0] if len(winners) == 1 else None


correct = sum(predict(case) == case["assigned_cause"] for case in testing)
baseline_cause = Counter(case["assigned_cause"] for case in training).most_common(1)[0][0]
baseline_correct = sum(case["assigned_cause"] == baseline_cause for case in testing)

print(f"Training cases: {len(training)} | Test cases: {len(testing)}")
print(f"Model accuracy: {correct}/{len(testing)} ({correct / len(testing):.1%})")
print(f"Baseline accuracy: {baseline_correct / len(testing):.1%}")

output = data_dir / "nose_model.json"
output.write_text(json.dumps(model, indent=2), encoding="utf-8")
print(f"Saved model: {output}")