import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { ingestEvent } from './services/ingestion.js';

export const db = new DatabaseSync(process.env.DATABASE_PATH || new URL('calendar.db', import.meta.url));
export function initDb() {
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
  if (db.prepare('PRAGMA user_version').get().user_version >= 1) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    const schema = readFileSync(new URL('data/schema.sql', import.meta.url), 'utf8');
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
    if (exists) {
      db.exec(schema.replace('IF NOT EXISTS events', 'IF NOT EXISTS events_upgrade'));
      const old = new Set(db.prepare('PRAGMA table_info(events)').all().map(column => column.name));
      const common = db.prepare('PRAGMA table_info(events_upgrade)').all().map(column => column.name).filter(name => old.has(name));
      const columns = common.map(name => `"${name}"`).join(', ');
      db.exec(`INSERT INTO events_upgrade (${columns}) SELECT ${columns} FROM events;
        DROP TABLE events; ALTER TABLE events_upgrade RENAME TO events;`);
    } else {
      db.exec(schema);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS events_status_start ON events(status, start_time);
      CREATE TABLE source_events (
        source_name TEXT NOT NULL, source_id TEXT NOT NULL, event_id INTEGER NOT NULL,
        snapshot TEXT NOT NULL, proposed TEXT, checked_at TEXT NOT NULL,
        PRIMARY KEY(source_name, source_id)
      );
      CREATE TABLE scrape_runs (
        id INTEGER PRIMARY KEY, source_name TEXT NOT NULL, started_at TEXT NOT NULL,
        finished_at TEXT, added INTEGER DEFAULT 0, updated INTEGER DEFAULT 0,
        skipped INTEGER DEFAULT 0, error TEXT
      );
      PRAGMA user_version = 1;`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
// Retained for callers that only need to know whether a row was added.
export function saveEvent(event) {
  return ingestEvent(event) === 'added';
}
