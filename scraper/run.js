// Runs every source, filters the results, and saves new events as 'pending'.
// Run it with:  npm run scrape
import { initDb, saveEvent } from '../db.js';
import { keepEvent } from './filters.js';
import { SOURCES } from './sources/index.js';

initDb();
for (const source of SOURCES) {
  console.log(`Scraping ${source.NAME} ...`);
  let events;
  try {
    events = await source.scrape();
  } catch (err) { // one broken source shouldn't stop the others
    console.log(`  FAILED: ${err.message}`);
    continue;
  }

  let added = 0, skipped = 0;
  for (const event of events) {
    event.source_name = source.NAME;
    const [ok, reason] = keepEvent(event);
    if (!ok) {
      console.log(`  skipped '${event.title}' (${reason})`);
      skipped++;
      continue;
    }
    if (saveEvent(event)) added++;
  }
  console.log(`  found ${events.length}, new ${added}, filtered out ${skipped}`);
}
