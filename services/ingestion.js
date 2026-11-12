import { db } from '../db.js';
import { createEvent } from '../repositories/events.js';
import { validateEvent, text, invalid } from './validation.js';

export function ingestEvent(raw) {
  const event = validateEvent(raw);
  const sourceName = text(raw.source_name, 'source_name', 300, true);
  const url = text(raw.source_url, 'source_url', 2000, true);
  if (!/^https?:\/\//.test(url)) throw invalid('Source URL must use HTTP or HTTPS');
  new URL(url);
  // Recurring listings must supply an occurrence-specific source_id.
  const sourceId = text(raw.source_id || url, 'source_id', 2000, true);
  const snapshot = JSON.stringify(event);
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT * FROM source_events WHERE source_name = ? AND source_id = ?').get(sourceName, sourceId);
    let result;
    if (existing) {
      const proposed = existing.snapshot === snapshot ? null : snapshot;
      db.prepare('UPDATE source_events SET proposed = ?, checked_at = ? WHERE source_name = ? AND source_id = ?').run(proposed, now, sourceName, sourceId);
      result = proposed && proposed !== existing.proposed ? 'updated' : 'unchanged';
    } else {
      // Associate historical imports by their source URL, preserving editorial state.
      const legacy = !raw.source_id && db.prepare('SELECT id FROM events WHERE source_name = ? AND source_url = ? ORDER BY id LIMIT 1').get(sourceName, url);
      const id = legacy?.id || createEvent(event, { name: sourceName, url });
      db.prepare('INSERT INTO source_events VALUES (?, ?, ?, ?, ?, ?)').run(sourceName, sourceId, id, snapshot, legacy ? snapshot : null, now);
      result = legacy ? 'updated' : 'added';
    }
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
