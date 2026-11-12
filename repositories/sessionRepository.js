import session from 'express-session';
import { db } from '../db.js';

export class SQLiteSessions extends session.Store {
  constructor() {
    super();
    db.exec('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL)');
  }
  get(id, callback) {
    try {
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
      const row = db.prepare('SELECT data FROM sessions WHERE id = ?').get(id);
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) { callback(error); }
  }
  set(id, value, callback) {
    try {
      db.prepare('INSERT OR REPLACE INTO sessions VALUES (?, ?, ?)').run(id, JSON.stringify(value), new Date(value.cookie.expires).getTime());
      callback?.();
    } catch (error) { callback?.(error); }
  }
  destroy(id, callback) {
    try { db.prepare('DELETE FROM sessions WHERE id = ?').run(id); callback?.(); }
    catch (error) { callback?.(error); }
  }
}

