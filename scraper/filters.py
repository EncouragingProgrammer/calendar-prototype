"""Automatic filters that run BEFORE a human sees an event.

Filters catch the obvious junk. Humans make the final call in the review queue.
Each rule returns (keep?, reason).
"""
from datetime import datetime

REQUIRED_FIELDS = ["title", "start_time", "source_url"]

# TODO (Sprint 3): grow this list as a class. What else signals spam or unacceptable content?
BLOCKED_WORDS = ["buy cheap", "casino", "crypto giveaway"]


def keep_event(event):
    for field in REQUIRED_FIELDS:
        if not event.get(field):
            return False, f"missing {field}"

    text = (event["title"] + " " + (event.get("description") or "")).lower()
    for word in BLOCKED_WORDS:
        if word in text:
            return False, f"blocked word '{word}'"

    # TODO (Sprint 3): skip events that are already in the past.
    # Hint: datetime.fromisoformat(event["start_time"]) < datetime.now()

    # TODO (Sprint 3): skip events too far in the future (more than a year away?)

    return True, "ok"
