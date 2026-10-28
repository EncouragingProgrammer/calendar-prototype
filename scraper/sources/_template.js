// Copy this file to start a new source, e.g. scraper/sources/my-news-site.js
//
// Before you write any code:
//   1. Read the site's Terms of Use and https://THESITE/robots.txt
//   2. Look for an RSS or iCal feed first. Feeds are much easier and more reliable than HTML.
//   3. Open the events page, right click an event, choose Inspect, and find the HTML pattern.
import * as cheerio from 'cheerio';

export const NAME = 'My News Site';
const URL = 'https://example.com/events';
const HEADERS = { 'User-Agent': 'SoutheastCollege-CSTTP-CalendarBot/0.1 (class project)' };

export async function scrape() {
  const response = await fetch(URL, { headers: HEADERS }); // fetch is built into Node
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  await new Promise(r => setTimeout(r, 2000)); // be polite. Never hammer a site.

  const $ = cheerio.load(await response.text());
  // TODO: change these selectors to match the real site
  return $('div.event').map((i, card) => ({
    title: $(card).find('h2').text().trim(),
    start_time: "TODO convert the site's date text into 2026-11-07T10:00 format",
    source_url: URL,
  })).get();
}
