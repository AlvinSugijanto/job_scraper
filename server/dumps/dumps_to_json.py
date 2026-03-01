import json
import os

DUMPS_DIR = os.path.dirname(os.path.abspath(__file__))


def dump_to_json(data, source="jobstreet"):
    """Dump parsed job data (structured) to JSON.

    Output: dumps/<source>.json
    Example: dump_to_json(jobs, source="jobstreet")
             dump_to_json(jobs, source="linkedin")
    """
    filepath = os.path.join(DUMPS_DIR, f"{source}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"[dump] Parsed → {filepath} ({len(data)} items)")


def dump_raw_to_json(raw_cards, source="jobstreet"):
    """Dump raw scraped data (may contain HTML strings) to JSON.

    Output: dumps/<source>_raw.json
    Example: dump_raw_to_json(raw_cards, source="jobstreet")
             dump_raw_to_json(raw_cards, source="linkedin")

    Args:
        raw_cards: List of dicts. Values may contain raw HTML strings.
        source: 'jobstreet' or 'linkedin'
    """
    filepath = os.path.join(DUMPS_DIR, f"{source}_raw.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(raw_cards, f, indent=2, ensure_ascii=False)
    print(f"[dump] Raw     → {filepath} ({len(raw_cards)} items)")
