"""Offline example source used to verify the complete pipeline."""

# I now import Path so the sample source works from any directory.
from pathlib import Path

# I now import BeautifulSoup to parse the same HTML structure a public source adapter would parse.
from bs4 import BeautifulSoup


# I now give the source a stable display name for logs and database records.
NAME = "Sample News"

# I now locate the fixture relative to this file instead of relying on the current directory.
PAGE = Path(__file__).resolve().parents[2] / "data" / "sample_news_page.html"


def scrape():
    """Read the offline fixture and return events in the shared event format."""

    # I now load the fixture as UTF-8 so the demo behaves consistently on all computers.
    soup = BeautifulSoup(PAGE.read_text(encoding="utf-8"), "html.parser")
    events = []

    # I now convert each HTML event card into one normalized dictionary.
    for card in soup.select("div.event"):
        events.append(
            {
                "title": card.select_one(".event-title").get_text(strip=True),
                "start_time": card.select_one(".event-date")["datetime"],
                "location": card.select_one(".event-location").get_text(strip=True),
                "category": card.select_one(".event-category").get_text(strip=True),
                "description": card.select_one(".event-description").get_text(strip=True),
                "source_url": card.select_one(".event-link")["href"],
            }
        )

    # I now return only source data; shared filtering and persistence happen elsewhere.
    return events
