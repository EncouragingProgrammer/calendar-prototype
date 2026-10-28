// Database helpers. SQLite stores everything in one file: calendar.db
// node:sqlite is built into Node 22.13+, so there is nothing extra to install.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const root = new URL('./', import.meta.url);
export const db = new DatabaseSync(new URL('calendar.db', root));

// Create the events table if it doesn't exist yet
export function initDb() {
  db.exec(readFileSync(new URL('data/schema.sql', root), 'utf8'));
}

// Insert a scraped event as 'pending'. Returns true if it was new.
export function saveEvent(event) {
  const result = db.prepare(`
    INSERT OR IGNORE INTO events
      (title, description, start_time, end_time, location, category, source_name, source_url)
    VALUES (:title, :description, :start_time, :end_time, :location, :category, :source_name, :source_url)
  `).run({ description: null, end_time: null, location: null, category: 'Other', ...event });
  return result.changes === 1;
}
