// Express web server. Serves the frontend in public/ and the JSON API in docs/API.md
// Run it with:  npm start   then open http://localhost:3000
import express from 'express';
import { db, initDb } from './db.js';

initDb();
const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/api/events', (req, res) => {
  const { status = 'approved', category = '', q = '' } = req.query;

  let sql = 'SELECT * FROM events WHERE status = ?';
  const params = [status];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (title LIKE ? OR location LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY start_time';

  res.json(db.prepare(sql).all(...params));
});

app.get('/api/events/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.post('/api/events/:id/review', (req, res) => {
  // TODO (Sprint 4): only logged in reviewers should be allowed to do this
  const { status, notes = null } = req.body ?? {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  }
  db.prepare('UPDATE events SET status = ?, review_notes = ?, reviewed_at = ? WHERE id = ?')
    .run(status, notes, new Date().toISOString().slice(0, 19), Number(req.params.id));
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Calendar running at http://localhost:${PORT}`));
