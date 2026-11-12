import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { db, initDb } from './db.js';
import { SQLiteSessions } from './repositories/sessionRepository.js';
import { createEventRoutes } from './routes/eventRoutes.js';
import { createSessionRoutes } from './routes/sessionRoutes.js';
import { uploadDirectory } from './services/images.js';

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
  app.use(express.json({ limit: '10mb' }));
  const requireAdmin = (req, res, next) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Sign in as a reviewer' });
    next();
  };
  const loginLimit = rateLimit({ windowMs: 15 * 60000, limit: 10, message: { error: 'Too many login attempts. Try again later.' }, standardHeaders: 'draft-7', legacyHeaders: false });
  const submissionLimit = rateLimit({ windowMs: 15 * 60000, limit: 20, message: { error: 'Too many submissions. Try again later.' }, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use('/api', createSessionRoutes({ adminPassword, loginLimit }));
  app.use('/api', createEventRoutes({ requireAdmin, submissionLimit }));
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

// Importing the factory for tests does not start a listening server.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const production = process.env.NODE_ENV === 'production';
  if (production && (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET)) {
    throw new Error('Set ADMIN_PASSWORD and SESSION_SECRET for production');
  }
  const adminPassword = process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url');
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  const app = createApp({ adminPassword, sessionSecret, production });
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, process.env.HOST || '127.0.0.1', () => {
    console.log(`Calendar running at http://localhost:${port}`);
    if (!process.env.ADMIN_PASSWORD) console.log(`Local reviewer password: ${adminPassword}`);
  });
  function shutdown() {
    server.close(() => { db.close(); process.exit(0); });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
