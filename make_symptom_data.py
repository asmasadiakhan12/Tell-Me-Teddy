import json
from itertools import product
from pathlib import Path

rows = []

for runny, stuffy, itchy in product(["Yes", "No", "Unsure"], repeat=3):
    answers = {"runny": runny, "stuffy": stuffy, "itchy": itchy}
    def join_words(words, conjunction):
        if len(words) < 3:
            return f" {conjunction} ".join(words)
        return f"{words[0]}, {words[1]}, {conjunction} {words[2]}"

    sentences = []
    for answer, phrase, conjunction in [
        ("Yes", "My nose feels", "and"),
        ("No", "My nose isn’t", "or"),
        ("Unsure", "I’m not sure if my nose feels", "or"),
    ]:
        words = [name for name, value in answers.items() if value == answer]
        if words:
            sentences.append(f"{phrase} {join_words(words, conjunction)}.")

    result = " ".join(sentences)

    rows.append({**answers, "result": result})

output = Path(__file__).parent / "data" / "nose_combinations.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(rows, indent=2), encoding="utf-8")
print(f"Saved {len(rows)} combinations to {output}")