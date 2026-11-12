import { backup } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { db, initDb } from '../db.js';

const destination = resolve(process.argv[2] || `backups/calendar-${new Date().toISOString().replaceAll(':', '-')}.db`);
initDb();
await mkdir(dirname(destination), { recursive: true });
await backup(db, destination);
db.close();
console.log(`Database backup saved to ${destination}`);
console.log('Copy the uploads directory alongside this backup to preserve event images.');
