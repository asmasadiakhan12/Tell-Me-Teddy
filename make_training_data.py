import csv
import random
from pathlib import Path

rng = random.Random(42)

# Invented probabilities for a coding demo, not clinical estimates.
# Each number is the chance of a Yes among definite answers.
profiles = {
    "seasonal_allergy": {"runny": 0.75, "stuffy": 0.55, "itchy": 0.70},
    "common_cold":      {"runny": 0.75, "stuffy": 0.70, "itchy": 0.30},
}

rows = []

for cause, profile in profiles.items():
    for _ in range(150):
        row = {"assigned_cause": cause}

        for symptom, yes_chance in profile.items():
            if rng.random() < 0.15:
                row[symptom] = "Unsure"
            else:
                row[symptom] = "Yes" if rng.random() < yes_chance else "No"

        rows.append(row)

rng.shuffle(rows)

output = Path(__file__).parent / "data" / "training_cases.csv"
output.parent.mkdir(exist_ok=True)

with output.open("w", newline="", encoding="utf-8") as file:
    columns = ["case_id", "runny", "stuffy", "itchy", "assigned_cause"]
    writer = csv.DictWriter(file, fieldnames=columns)
    writer.writeheader()

    for number, row in enumerate(rows, start=1):
        writer.writerow({"case_id": f"fiction_{number:03}", **row})

print(f"Saved {len(rows)} fictional cases to {output}")
