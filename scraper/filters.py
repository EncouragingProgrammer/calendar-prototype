"""Automatic quality filters applied before human review."""
from datetime import datetime

REQUIRED_FIELDS = ["title", "start_time", "source_url"]
BLOCKED_WORDS = ["buy cheap", "casino", "crypto giveaway"]


def keep_event(event):
    for field in REQUIRED_FIELDS:
        if not event.get(field):
            return False, f"missing {field}"

    text = (event["title"] + " " + (event.get("description") or "")).lower()
    for word in BLOCKED_WORDS:
        if word in text:
            return False, f"blocked word '{word}'"

    try:
        start = datetime.fromisoformat(event["start_time"])
    except ValueError:
        return False, "invalid start_time"
    if start < datetime.now():
        return False, "event is in the past"

    return True, "ok"
