// Example source. Reads the fake news page in data/ so it works without internet.
//
// Every source module needs:
//   NAME      a short display name
//   scrape()  returns a list of objects with title, start_time, source_url (required)
//             and description, end_time, location, category (optional)
import { readFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

export const NAME = 'Sample News';
const PAGE = new URL('../../data/sample_news_page.html', import.meta.url);

export async function scrape() {
  const $ = cheerio.load(readFileSync(PAGE, 'utf8'));

  // CSS selector: every <div class="event">
  return $('div.event').map((i, card) => {
    const c = $(card);
    return {
      title: c.find('.event-title').text().trim(),
      start_time: c.find('.event-date').attr('datetime'),
      location: c.find('.event-location').text().trim(),
      category: c.find('.event-category').text().trim(),
      description: c.find('.event-description').text().trim(),
      source_url: c.find('.event-link').attr('href'),
    };
  }).get();
}
