import { initDb, db } from '../db.js';
import { ingestEvent } from '../services/ingestion.js';
import { keepEvent } from './filters.js';
import { SOURCES } from './sources/index.js';

initDb();
let failures = 0;
for (const source of SOURCES) {
  const run = db.prepare('INSERT INTO scrape_runs (source_name, started_at) VALUES (?, ?)').run(source.NAME, new Date().toISOString());
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
  db.prepare('UPDATE scrape_runs SET finished_at = ?, added = ?, updated = ?, skipped = ?, error = ? WHERE id = ?')
    .run(new Date().toISOString(), counts.added, counts.updated, counts.skipped, errors.join('\n') || null, run.lastInsertRowid);
  console.log(source.NAME, counts, errors);
  if (errors.length) failures++;
}
db.close();
if (failures) process.exitCode = 1;
