import json
import os


def dump_to_json(data, filename="dump_result.json"):
    """Dump data to JSON file in the utils directory."""
    dir_path = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(dir_path, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Dumped {len(data)} items to {filepath}")
