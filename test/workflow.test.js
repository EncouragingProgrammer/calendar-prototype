import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

const directory = mkdtempSync(join(tmpdir(), 'calendar-test-'));
process.env.DATABASE_PATH = join(directory, 'test.db');
process.env.UPLOAD_DIR = join(directory, 'uploads');
// Exercise an older database before optional contact fields and archived status existed.
const legacy = new DatabaseSync(process.env.DATABASE_PATH);
legacy.exec(`CREATE TABLE events (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  start_time TEXT NOT NULL, end_time TEXT, location TEXT, category TEXT,
  source_name TEXT NOT NULL, source_url TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  review_notes TEXT, reviewed_at TEXT, scraped_at TEXT);
  INSERT INTO events (id,title,start_time,source_name,source_url,status) VALUES (1,'Existing event','2020-01-01T10:00','Legacy','https://example.com/old','approved');`);
legacy.close();
const { createApp } = await import('../app.js');
const { db, initDb } = await import('../db.js');
const { ingestEvent } = await import('../services/ingestion.js');
const { getEvent } = await import('../repositories/eventRepository.js');
const app = createApp({ adminPassword: 'test-password-long', sessionSecret: 'test-secret-long-enough-for-session' });
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let cookie = '';
async function request(path, method = 'GET', body, admin = false) {
  return fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(admin ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
const event = { title: 'Community skate', start_time: '2030-11-12T18:00', category: 'Family', location: 'Arena' };

test('existing database migrates once and preserves its events', () => {
  assert.equal(getEvent(1).title, 'Existing event');
  initDb();
  assert.equal(getEvent(1).status, 'approved');
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
});
test('submission, private review, editing, approval and archive work through HTTP', async () => {
  let response = await request('/api/events', 'POST', event);
  assert.equal(response.status, 201);
  const { id } = await response.json();
  assert.equal((await request('/api/events/' + id)).status, 404);
  assert.equal((await request('/api/events?status=pending')).status, 401);
  assert.equal((await request(`/api/events/${id}/review`, 'POST', { status: 'approved' })).status, 401);
  response = await request('/api/session', 'POST', { password: 'test-password-long' });
  cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal(response.status, 200);
  assert.equal((await request('/api/events/' + id, 'PUT', { location: 'Updated arena' }, true)).status, 200);
  assert.equal((await request(`/api/events/${id}/review`, 'POST', { status: 'approved', notes: 'Private editorial note' }, true)).status, 200);
  const published = await (await request('/api/events/' + id)).json();
  assert.equal(published.location, 'Updated arena');
  assert.equal(published.review_notes, undefined);
  const filtered = await (await request('/api/events?category=Family&q=Updated')).json();
  assert.deepEqual(filtered.map(row => row.id), [id]);
  assert.deepEqual(await (await request('/api/events?category=Arts&q=Updated')).json(), []);
  assert.deepEqual(await (await request('/api/events?q=%27%20OR%201%3D1--')).json(), []);
  assert.equal((await request('/api/events/99999/review', 'POST', { status: 'approved' }, true)).status, 404);
  response = await request('/api/events/archive-past', 'POST', {}, true);
  assert.equal((await response.json()).archived, 1);
  assert.equal(getEvent(1).status, 'archived');
});
test('server rejects invalid dates, reversed times, unsafe images and malformed inputs', async () => {
  for (const change of [{ title: ' ' }, { title: {} }, { start_time: '2030-02-30T10:00' }, { end_time: '2020-01-01T10:00' }, { photo_url: 'javascript:alert(1)' }, { photo_url: 'data:image/jpeg;base64,YWJj' }]) {
    assert.equal((await request('/api/events', 'POST', { ...event, ...change })).status, 400);
  }
  assert.equal((await request('/api/events?status[x]=pending')).status, 200);
  assert.equal((await request('/api/events/NaN')).status, 400);
  assert.equal((await request('/api/events?q=%27%20OR%201%3D1--')).status, 200);
});
test('image is decoded, stored as a file and served as JPEG', async () => {
  const bytes = await sharp({ create: { width: 600, height: 315, channels: 3, background: 'red' } }).png().toBuffer();
  const response = await request('/api/events', 'POST', { ...event, photo_url: 'data:image/png;base64,' + bytes.toString('base64') });
  assert.equal(response.status, 201);
  const row = getEvent((await response.json()).id);
  assert.match(row.photo_url, /^\/uploads\/[a-f0-9]{64}\.jpg$/);
  assert.equal((await fetch(base + row.photo_url)).headers.get('content-type'), 'image/jpeg');
});
test('repeated imports stay single and changed details await review', async () => {
  const raw = { ...event, source_name: 'Test source', source_url: 'https://example.com/events/skate' };
  assert.equal(ingestEvent(raw), 'added');
  assert.equal(ingestEvent(raw), 'unchanged');
  const row = db.prepare('SELECT * FROM events WHERE source_url = ?').get(raw.source_url);
  db.prepare("UPDATE events SET status = 'approved', title = 'Editor title' WHERE id = ?").run(row.id);
  assert.equal(ingestEvent({ ...raw, start_time: '2030-11-13T18:00' }), 'updated');
  assert.equal(getEvent(row.id).title, 'Editor title');
  assert.equal(getEvent(row.id).start_time, event.start_time);
  assert.equal(db.prepare('SELECT count(*) AS n FROM events WHERE source_url = ?').get(raw.source_url).n, 1);
  const proposal = db.prepare('SELECT * FROM source_events WHERE event_id = ?').get(row.id);
  assert.equal((await request('/api/imports/resolve', 'POST', { ...proposal, accept: true }, true)).status, 200);
  assert.equal(getEvent(row.id).start_time, '2030-11-13T18:00');
  assert.equal(getEvent(row.id).status, 'approved');
  assert.equal((await request('/api/imports/resolve', 'POST', { ...proposal, accept: true }, true)).status, 409);
});
test('cross-origin writes are denied and logout removes access', async () => {
  const response = await fetch(base + '/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://elsewhere.example' }, body: JSON.stringify(event) });
  assert.equal(response.status, 403);
  assert.equal((await request('/api/session', 'DELETE', {}, true)).status, 200);
  assert.equal((await request('/api/events?status=pending', 'GET', undefined, true)).status, 401);
});

test('10 MB parser accepts a 9 MB request and rejects oversized or malformed JSON consistently', async () => {
  const accepted = await request('/api/events', 'POST', { ...event, padding: 'x'.repeat(9 * 1024 * 1024) });
  assert.equal(accepted.status, 201);
  const oversized = await request('/api/events', 'POST', { ...event, padding: 'x'.repeat(10 * 1024 * 1024) });
  assert.equal(oversized.status, 413);
  assert.deepEqual(Object.keys(await oversized.json()), ['error']);
  const malformed = await fetch(base + '/api/events', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(Object.keys(await malformed.json()), ['error']);
});

test('scraper filter retains existing decisions through the service and compatibility entry point', async () => {
  const { keepEvent } = await import('../services/eventService.js');
  const { keepEvent: legacyFilter } = await import('../scraper/filters.js');
  assert.equal(keepEvent, legacyFilter);
  assert.deepEqual(keepEvent({ ...event, source_url: 'https://example.com/event' }), [true, 'ok']);
  assert.deepEqual(keepEvent({ ...event, source_url: 'https://example.com/event', description: 'BUY CHEAP tickets' }), [false, "blocked word 'buy cheap'"]);
  assert.deepEqual(keepEvent(event), [false, 'missing source_url']);
});

test('rate limit failures return the same JSON error shape', async () => {
  let response;
  for (let attempt = 0; attempt < 21; attempt++) {
    response = await request('/api/events', 'POST', {});
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.deepEqual(Object.keys(await response.json()), ['error']);
  for (let attempt = 0; attempt < 11; attempt++) {
    response = await request('/api/session', 'POST', { password: 'wrong' });
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.deepEqual(Object.keys(await response.json()), ['error']);
});
