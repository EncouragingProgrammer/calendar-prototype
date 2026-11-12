import { initDb, db } from '../db.js';
import { ingestEvent } from '../services/ingestion.js';
import { keepEvent, startScrapeRun, finishScrapeRun } from '../services/eventService.js';
import { SOURCES } from './sources/index.js';

initDb();
let failures = 0;
for (const source of SOURCES) {
  const runId = startScrapeRun(source.NAME);
  const counts = { added: 0, updated: 0, skipped: 0 };
  const errors = [];
  try {
    const events = await source.scrape();
    if (!Array.isArray(events)) throw new Error('Source must return an array');
    for (const raw of events) {
      try {
        const event = { ...raw, source_name: source.NAME };
        const [keep, reason] = keepEvent(event);
        if (!keep) {
          counts.skipped++;
          console.log(`Skipped ${event.title}: ${reason}`);
          continue;
        }
        const result = ingestEvent(event);
        if (result in counts) counts[result]++;
      } catch (error) {
        counts.skipped++;
        errors.push(error.message);
      }
    }
  } catch (error) { errors.push(error.message); }
  finishScrapeRun(runId, counts, errors);
  console.log(source.NAME, counts, errors);
  if (errors.length) failures++;
}
db.close();
if (failures) process.exitCode = 1;
