"""Offline example source used to verify the complete pipeline."""
from pathlib import Path

from bs4 import BeautifulSoup

NAME = "Sample News"
PAGE = Path(__file__).parents[2] / "data" / "sample_news_page.html"


def scrape():
    soup = BeautifulSoup(PAGE.read_text(encoding="utf-8"), "html.parser")
    events = []
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
    return events
