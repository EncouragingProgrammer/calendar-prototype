import { db } from '../db.js';

const editable = ['title', 'description', 'start_time', 'end_time', 'location', 'address', 'category', 'contact_name', 'contact_phone', 'contact_email', 'photo_url'];

export function getEvent(id) {
  const params = [id];
  return db.prepare('SELECT * FROM events WHERE id = ?').get(...params);
}

export function listEvents({ status, q, category }) {
  const params = [status, q, `%${q}%`, `%${q}%`, category, category];
  return db.prepare(`SELECT * FROM events WHERE status = ?
    AND (? = '' OR title LIKE ? OR location LIKE ?)
    AND (? = '' OR category = ?) ORDER BY start_time, id`).all(...params);
}

export function createEvent(event, source) {
  const params = [...editable.map(key => event[key] ?? null), source.name, source.url];
  const result = db.prepare(`INSERT INTO events (
    title, description, start_time, end_time, location, address, category,
    contact_name, contact_phone, contact_email, photo_url, source_name, source_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...params);
  return Number(result.lastInsertRowid);
}

export function updateEvent(id, event) {
  const params = [...editable.map(key => event[key] ?? null), id];
  return db.prepare(`UPDATE events SET title = ?, description = ?, start_time = ?, end_time = ?,
    location = ?, address = ?, category = ?, contact_name = ?, contact_phone = ?,
    contact_email = ?, photo_url = ? WHERE id = ?`).run(...params).changes;
}

export function reviewEvent(id, status, notes, reviewedAt) {
  const params = [status, notes, reviewedAt, id];
  return db.prepare('UPDATE events SET status = ?, review_notes = ?, reviewed_at = ? WHERE id = ?').run(...params).changes;
}

// Called inside the service's archive transaction, including its selection read.
export function archiveEvents(ids) {
  let archived = 0;
  const statement = db.prepare('UPDATE events SET status = ? WHERE id = ? AND status = ?');
  for (const id of ids) {
    const params = ['archived', id, 'approved'];
    archived += statement.run(...params).changes;
  }
  return archived;
}

// Callbacks must be synchronous so SQLite never holds a transaction across awaits.
export function transaction(operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function getSourceEvent(sourceName, sourceId) {
  const params = [sourceName, sourceId];
  return db.prepare('SELECT * FROM source_events WHERE source_name = ? AND source_id = ?').get(...params);
}

export function findLegacyEvent(sourceName, url) {
  const params = [sourceName, url, 1];
  return db.prepare('SELECT id FROM events WHERE source_name = ? AND source_url = ? ORDER BY id LIMIT ?').get(...params);
}

export function proposeSourceUpdate(sourceName, sourceId, proposed, checkedAt) {
  const params = [proposed, checkedAt, sourceName, sourceId];
  db.prepare('UPDATE source_events SET proposed = ?, checked_at = ? WHERE source_name = ? AND source_id = ?').run(...params);
}

export function createSourceEvent(sourceName, sourceId, eventId, snapshot, proposed, checkedAt) {
  const params = [sourceName, sourceId, eventId, snapshot, proposed, checkedAt];
  db.prepare(`INSERT INTO source_events (source_name, source_id, event_id, snapshot, proposed, checked_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(...params);
}

export function acknowledgeSourceUpdate(sourceName, sourceId) {
  const params = [null, sourceName, sourceId];
  db.prepare('UPDATE source_events SET snapshot = proposed, proposed = ? WHERE source_name = ? AND source_id = ?').run(...params);
}

export function listSourceChanges() {
  const params = [null];
  return db.prepare(`SELECT s.*, e.title FROM source_events s
    JOIN events e ON e.id = s.event_id WHERE proposed IS NOT ?`).all(...params);
}

export function listScrapeRuns() {
  const params = [20];
  return db.prepare('SELECT * FROM scrape_runs ORDER BY id DESC LIMIT ?').all(...params);
}

export function startScrapeRun(sourceName, startedAt) {
  const params = [sourceName, startedAt];
  return db.prepare('INSERT INTO scrape_runs (source_name, started_at) VALUES (?, ?)').run(...params).lastInsertRowid;
}

export function finishScrapeRun(id, finishedAt, counts, error) {
  const params = [finishedAt, counts.added, counts.updated, counts.skipped, error, id];
  db.prepare('UPDATE scrape_runs SET finished_at = ?, added = ?, updated = ?, skipped = ?, error = ? WHERE id = ?').run(...params);
}
