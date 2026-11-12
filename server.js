import { randomBytes } from 'node:crypto';
import { createApp } from './app.js';
import { db } from './db.js';

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
