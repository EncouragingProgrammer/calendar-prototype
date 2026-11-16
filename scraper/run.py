"""Run configured event sources and save valid records as pending."""

# I now import logging so source failures remain visible without stopping other sources.
import logging

# I now import the project database, filter, and source registry modules.
import db
from scraper.filters import keep_event
from scraper.sources import SOURCES


# I now configure readable console messages for people running the pipeline locally.
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
LOGGER = logging.getLogger(__name__)


def main():
    """Run every configured source and return a process status code."""

    # I now create the database before any source tries to save an event.
    db.init_db()
    source_failures = 0

    # I now process sources independently so one unavailable source does not hide others.
    for source in SOURCES:
        LOGGER.info("Scraping %s", source.NAME)
        try:
            events = source.scrape()
        except Exception:
            # I now log the full traceback because a source failure needs actionable evidence.
            LOGGER.exception("Source failed: %s", source.NAME)
            source_failures += 1
            continue

        # I now count accepted, duplicate, and rejected records for a useful run summary.
        new_count = 0
        duplicate_count = 0
        filtered_count = 0
        for event in events:
            event["source_name"] = source.NAME
            accepted, reason = keep_event(event)
            if not accepted:
                LOGGER.info(
                    "Skipped '%s' (%s)", event.get("title", "<untitled>"), reason
                )
                filtered_count += 1
                continue
            if db.save_event(event):
                new_count += 1
            else:
                duplicate_count += 1

        # I now report enough detail to verify the offline demo and diagnose source changes.
        LOGGER.info(
            "Source summary: found=%d new=%d duplicates=%d filtered=%d",
            len(events),
            new_count,
            duplicate_count,
            filtered_count,
        )

    # I now return a non-zero status when a source failed while still allowing other sources to finish.
    return 1 if source_failures else 0


if __name__ == "__main__":
    # I now make the module usable with `python -m scraper.run` on every supported platform.
    raise SystemExit(main())
