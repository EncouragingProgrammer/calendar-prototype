import { Router } from 'express';
import { text } from '../services/validation.js';
import { passwordMatches } from '../services/sessionService.js';

export function createSessionRoutes({ adminPassword, loginLimit }) {
  const router = Router();
  router.get('/session', (req, res) => res.json({ authenticated: !!req.session.admin }));
  router.post('/session', loginLimit, (req, res, next) => {
    const password = text(req.body?.password, 'password', 1000, true);
    if (!passwordMatches(password, adminPassword)) return res.status(401).json({ error: 'Incorrect password' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.admin = true;
      res.json({ authenticated: true });
    });
  });
  router.delete('/session', (req, res, next) => req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('connect.sid').json({ ok: true });
  }));
  return router;
}
