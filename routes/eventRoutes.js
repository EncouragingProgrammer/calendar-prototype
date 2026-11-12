import { Router } from 'express';
import * as events from '../services/eventService.js';
import { text, eventId } from '../services/validation.js';

export function createEventRoutes({ requireAdmin, submissionLimit }) {
  const router = Router();
  router.get('/events', (req, res) => {
    const filters = {
      status: text(req.query.status, 'status', 20) || 'approved',
      q: text(req.query.q, 'search', 300) || '',
      category: text(req.query.category, 'category', 300) || '',
    };
    res.json(events.listEvents(filters, !!req.session.admin));
  });
  router.post('/events/archive-past', requireAdmin, (req, res) => {
    res.json({ archived: events.archivePastEvents() });
  });
  router.get('/events/:id', (req, res) => {
    res.json(events.getEvent(eventId(req.params.id), !!req.session.admin));
  });
  router.post('/events', submissionLimit, async (req, res) => {
    res.status(201).json({ id: await events.submitEvent(req.body ?? {}) });
  });
  router.put('/events/:id', requireAdmin, async (req, res) => {
    await events.updateEvent(eventId(req.params.id), req.body ?? {});
    res.json({ ok: true });
  });
  router.post('/events/:id/review', requireAdmin, (req, res) => {
    events.reviewEvent(eventId(req.params.id), req.body ?? {});
    res.json({ ok: true });
  });
  router.get('/imports', requireAdmin, (req, res) => res.json(events.getImports()));
  router.post('/imports/resolve', requireAdmin, (req, res) => {
    events.resolveImport(req.body ?? {});
    res.json({ ok: true });
  });
  return router;
}
