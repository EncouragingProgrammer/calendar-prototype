import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, initDb } from './db.js';
import { getEvent, listEvents, createEvent, updateEvent, reviewEvent, publicEvent } from './repositories/events.js';
import { validateEvent, invalid, text, eventId } from './services/validation.js';
import { storePhoto, uploadDirectory } from './services/images.js';

class SQLiteSessions extends session.Store {
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

export function createApp({ adminPassword, sessionSecret, production = false }) {
  if (!adminPassword || !sessionSecret) throw new Error('Reviewer password and session secret are required');
  initDb();
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: {
    'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'http:'],
    'upgrade-insecure-requests': production ? [] : null,
  } } }));
  app.use(session({ secret: sessionSecret, store: new SQLiteSessions(), resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', secure: production, maxAge: 8 * 3600000 } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      if (!req.is('application/json')) return res.status(415).json({ error: 'Send application/json' });
      const origin = req.get('origin');
      if (origin && origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'Request origin is not allowed' });
    }
    next();
  });
  app.use(express.json({ limit: '8mb' }));
  const requireAdmin = (req, res, next) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Sign in as a reviewer' });
    next();
  };
  const loginLimit = rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
  const submissionLimit = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
  app.get('/api/session', (req, res) => res.json({ authenticated: !!req.session.admin }));
  app.post('/api/session', loginLimit, (req, res, next) => {
    const password = text(req.body?.password, 'password', 1000, true);
    const digest = value => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(digest(password), digest(adminPassword))) return res.status(401).json({ error: 'Incorrect password' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.admin = true;
      res.json({ authenticated: true });
    });
  });
  app.delete('/api/session', (req, res, next) => req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('connect.sid').json({ ok: true });
  }));
  app.get('/api/events', (req, res) => {
    const status = text(req.query.status, 'status', 20) || 'approved';
    if (!['pending', 'approved', 'rejected', 'archived'].includes(status)) throw invalid('Invalid event status');
    if (status !== 'approved' && !req.session.admin) return res.status(401).json({ error: 'Sign in as a reviewer' });
    const rows = listEvents({ status, q: text(req.query.q, 'search', 300) || '', category: text(req.query.category, 'category', 300) || '' });
    res.json(req.session.admin ? rows : rows.map(publicEvent));
  });
  app.post('/api/events/archive-past', requireAdmin, (req, res) => {
    const localNow = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 16);
    // Events with no end time stay live through their start date.
    const result = db.prepare(`UPDATE events SET status = 'archived' WHERE status = 'approved'
      AND COALESCE(NULLIF(end_time, ''), substr(start_time, 1, 10) || 'T23:59') < ?`).run(localNow);
    res.json({ archived: result.changes });
  });
  app.get('/api/events/:id', (req, res) => {
    const row = getEvent(eventId(req.params.id));
    if (!row || (row.status !== 'approved' && !req.session.admin)) return res.status(404).json({ error: 'Event not found' });
    res.json(req.session.admin ? row : publicEvent(row));
  });
  app.post('/api/events', submissionLimit, async (req, res) => {
    const event = validateEvent(req.body ?? {});
    event.photo_url = await storePhoto(req.body.photo_url);
    res.status(201).json({ id: createEvent(event) });
  });
  app.put('/api/events/:id', requireAdmin, async (req, res) => {
    const id = eventId(req.params.id);
    const existing = getEvent(id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    const event = validateEvent({ ...existing, ...req.body });
    event.photo_url = await storePhoto(req.body.photo_url === undefined ? existing.photo_url : req.body.photo_url);
    updateEvent(id, event);
    res.json({ ok: true });
  });
  app.post('/api/events/:id/review', requireAdmin, (req, res) => {
    const { status } = req.body ?? {};
    if (!['approved', 'rejected', 'archived', 'pending'].includes(status)) throw invalid('Invalid event status');
    const changed = reviewEvent(eventId(req.params.id), status, text(req.body.notes, 'notes', 2000));
    if (!changed) return res.status(404).json({ error: 'Event not found' });
    res.json({ ok: true });
  });
  app.get('/api/imports', requireAdmin, (req, res) => {
    const changes = db.prepare(`SELECT s.*, e.title FROM source_events s JOIN events e ON e.id = s.event_id WHERE proposed IS NOT NULL`).all();
    const runs = db.prepare('SELECT * FROM scrape_runs ORDER BY id DESC LIMIT 20').all();
    res.json({ changes, runs });
  });
  app.post('/api/imports/resolve', requireAdmin, (req, res) => {
    const { source_name, source_id, proposed, accept } = req.body;
    if (typeof accept !== 'boolean') throw invalid('Choose accept or dismiss');
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = db.prepare('SELECT * FROM source_events WHERE source_name = ? AND source_id = ?').get(text(source_name, 'source_name', 300, true), text(source_id, 'source_id', 2000, true));
      if (!row?.proposed || row.proposed !== proposed) throw Object.assign(new Error('Source changed. Reload before reviewing.'), { status: 409 });
      if (accept) {
        const existing = getEvent(row.event_id);
        updateEvent(row.event_id, { ...existing, ...JSON.parse(row.proposed) });
      }
      db.prepare('UPDATE source_events SET snapshot = proposed, proposed = NULL WHERE source_name = ? AND source_id = ?').run(source_name, source_id);
      db.exec('COMMIT');
      res.json({ ok: true });
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  });
  app.use('/uploads', express.static(uploadDirectory));
  app.get('/vendor/fullcalendar.js', (req, res) => res.sendFile(fileURLToPath(new URL('./node_modules/fullcalendar/index.global.min.js', import.meta.url))));
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? 'The server could not complete this request' : error.message });
  });
  return app;
}
