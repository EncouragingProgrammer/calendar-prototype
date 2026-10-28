"""Copy this file to start a new source, e.g. scraper/sources/my_news_site.py

Before you write any code:
  1. Read the site's Terms of Use and https://THESITE/robots.txt
  2. Look for an RSS or iCal feed first. Feeds are much easier and more reliable than HTML.
  3. Open the events page, right click an event, choose Inspect, and find the HTML pattern.
"""
import time

import requests
from bs4 import BeautifulSoup

NAME = "My News Site"
URL = "https://example.com/events"
HEADERS = {"User-Agent": "SoutheastCollege-CSTTP-CalendarBot/0.1 (class project)"}


def scrape():
    response = requests.get(URL, headers=HEADERS, timeout=15)
    response.raise_for_status()
    time.sleep(2)  # be polite. Never hammer a site.

    soup = BeautifulSoup(response.text, "html.parser")
    events = []
    # TODO: change these selectors to match the real site
    for card in soup.select("div.event"):
        events.append({
            "title": card.select_one("h2").get_text(strip=True),
            "start_time": "TODO convert the site's date text into 2026-11-07T10:00 format",
            "source_url": URL,
        })
    return events
