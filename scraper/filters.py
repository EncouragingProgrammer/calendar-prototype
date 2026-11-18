"""Automatic quality filters applied before human review."""

# I now import date utilities that let the filter compare local and UTC timestamps safely.
from datetime import datetime, timezone


# I now define the minimum fields every candidate event must provide.
REQUIRED_FIELDS = ("title", "start_time", "source_url")

# I now keep a small demonstrable blocklist for obvious promotional or unsafe records.
BLOCKED_WORDS = ("buy cheap", "casino", "crypto giveaway")


def _as_utc(value):
    """Convert an ISO timestamp into a timezone-aware UTC datetime."""

    # I now support the common ISO 8601 UTC suffix used by feeds and APIs.
    normalized = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)

    # I now treat a timestamp without an offset as UTC for deterministic local testing.
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def keep_event(event):
    """Return whether an event is complete, acceptable, valid, and in the future."""

    # I now reject records with missing required values before reading optional fields.
    for field in REQUIRED_FIELDS:
        if not isinstance(event.get(field), str) or not event[field].strip():
            return False, f"missing {field}"

    # I now combine searchable text so obvious blocked content is rejected consistently.
    text = " ".join(
        str(event.get(field) or "") for field in ("title", "description")
    ).lower()
    for word in BLOCKED_WORDS:
        if word in text:
            return False, f"blocked word '{word}'"

    # I now parse the event date and report malformed source data instead of crashing the run.
    try:
        start = _as_utc(event["start_time"])
    except (TypeError, ValueError):
        return False, "invalid start_time"

    # I now prevent old events from entering a new review queue.
    if start <= datetime.now(timezone.utc):
        return False, "event is in the past"

    # I now accept the candidate because all automatic checks succeeded.
    return True, "ok"
