"""Template for adding a compliant event source."""
import time

import requests
from bs4 import BeautifulSoup

NAME = "My News Site"
URL = "https://example.com/events"
HEADERS = {"User-Agent": "SoutheastCollege-CSTTP-CalendarBot/0.1 (class project)"}


def scrape():
    response = requests.get(URL, headers=HEADERS, timeout=15)
    response.raise_for_status()
    time.sleep(2)
    soup = BeautifulSoup(response.text, "html.parser")
    events = []
    for card in soup.select("div.event"):
        events.append(
            {
                "title": card.select_one("h2").get_text(strip=True),
                "start_time": "TODO: convert to ISO 8601",
                "source_url": URL,
            }
        )
    return events
