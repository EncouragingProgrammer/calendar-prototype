"""Run configured sources and save new events as pending."""
import db
from scraper.filters import keep_event
from scraper.sources import SOURCES


def main():
    db.init_db()
    for source in SOURCES:
        print(f"Scraping {source.NAME} ...")
        try:
            events = source.scrape()
        except Exception as err:
            print(f"  FAILED: {err}")
            continue

        new, skipped = 0, 0
        for event in events:
            event["source_name"] = source.NAME
            ok, reason = keep_event(event)
            if not ok:
                print(f"  skipped '{event.get('title', '<untitled>')}' ({reason})")
                skipped += 1
                continue
            if db.save_event(event):
                new += 1
        print(f"  found {len(events)}, new {new}, filtered out {skipped}")


if __name__ == "__main__":
    main()
