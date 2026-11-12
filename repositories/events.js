import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

export const editable = ['title', 'description', 'start_time', 'end_time', 'location', 'address', 'category', 'contact_name', 'contact_phone', 'contact_email', 'photo_url'];
export function getEvent(id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}
export function listEvents({ status = 'approved', q = '', category = '' }) {
  let sql = 'SELECT * FROM events WHERE status = ?';
  const params = [status];
  if (q) {
    sql += ' AND (title LIKE ? OR location LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  return db.prepare(sql + ' ORDER BY start_time, id').all(...params);
}
export function createEvent(event, source = { name: 'User Form', url: `manual-${randomUUID()}` }) {
  const fields = [...editable, 'source_name', 'source_url'];
  const values = [...editable.map(key => event[key] ?? null), source.name, source.url];
  return Number(db.prepare(`INSERT INTO events (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`).run(...values).lastInsertRowid);
}
export function updateEvent(id, event) {
  return db.prepare(`UPDATE events SET ${editable.map(key => `${key} = ?`).join(', ')} WHERE id = ?`)
    .run(...editable.map(key => event[key] ?? null), id).changes;
}
export function reviewEvent(id, status, notes) {
  return db.prepare('UPDATE events SET status = ?, review_notes = ?, reviewed_at = ? WHERE id = ?')
    .run(status, notes, new Date().toISOString(), id).changes;
}
export function publicEvent(event) {
  const { review_notes, reviewed_at, account_id, attachments, ...visible } = event;
  return visible;
}
