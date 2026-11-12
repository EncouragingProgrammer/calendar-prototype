import { randomUUID } from 'node:crypto';
import * as repository from '../repositories/eventRepository.js';
import { validateEvent, invalid, text } from './validation.js';
import { storePhoto } from './images.js';

const statuses = ['pending', 'approved', 'rejected', 'archived'];
const requiredScrapeFields = ['title', 'start_time', 'source_url'];
const blockedWords = ['buy cheap', 'casino', 'crypto giveaway'];

export function publicEvent(event) {
  const { review_notes, reviewed_at, account_id, attachments, ...visible } = event;
  return visible;
}

function checkStatus(status) {
  if (!statuses.includes(status)) throw invalid('Invalid event status');
}

function requireReviewer(isReviewer) {
  if (!isReviewer) throw Object.assign(new Error('Sign in as a reviewer'), { status: 401 });
}

function requireEvent(id) {
  const event = repository.getEvent(id);
  if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
  return event;
}

export function listEvents(filters, isReviewer) {
  checkStatus(filters.status);
  if (filters.status !== 'approved') requireReviewer(isReviewer);
  const events = repository.listEvents(filters);
  return isReviewer ? events : events.map(publicEvent);
}

export function getEvent(id, isReviewer) {
  const event = requireEvent(id);
  if (event.status !== 'approved' && !isReviewer) throw Object.assign(new Error('Event not found'), { status: 404 });
  return isReviewer ? event : publicEvent(event);
}

export async function submitEvent(body) {
  const event = validateEvent(body);
  event.photo_url = await storePhoto(body.photo_url);
  return repository.createEvent(event, { name: 'User Form', url: `manual-${randomUUID()}` });
}

export async function updateEvent(id, body) {
  const existing = requireEvent(id);
  const event = validateEvent({ ...existing, ...body });
  event.photo_url = await storePhoto(body.photo_url === undefined ? existing.photo_url : body.photo_url);
  repository.updateEvent(id, event);
}

export function reviewEvent(id, body) {
  checkStatus(body.status);
  const notes = text(body.notes, 'notes', 2000);
  const changed = repository.reviewEvent(id, body.status, notes, new Date().toISOString());
  if (!changed) throw Object.assign(new Error('Event not found'), { status: 404 });
}

export function archivePastEvents() {
  const localNow = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 16);
  return repository.transaction(() => {
    const events = repository.listEvents({ status: 'approved', q: '', category: '' });
    // An event without an end time remains live through its start date.
    const ids = events.filter(event => {
      const end = event.end_time || event.start_time.slice(0, 10) + 'T23:59';
      return end < localNow;
    }).map(event => event.id);
    return repository.archiveEvents(ids);
  });
}

export function keepEvent(event) {
  for (const field of requiredScrapeFields) {
    if (!event[field]) return [false, `missing ${field}`];
  }
  const content = `${event.title} ${event.description ?? ''}`.toLowerCase();
  for (const word of blockedWords) {
    if (content.includes(word)) return [false, `blocked word '${word}'`];
  }
  return [true, 'ok'];
}

export function getImports() {
  return { changes: repository.listSourceChanges(), runs: repository.listScrapeRuns() };
}

export function resolveImport(body) {
  const { proposed, accept } = body;
  if (typeof accept !== 'boolean') throw invalid('Choose accept or dismiss');
  const sourceName = text(body.source_name, 'source_name', 300, true);
  const sourceId = text(body.source_id, 'source_id', 2000, true);
  repository.transaction(() => {
    const row = repository.getSourceEvent(sourceName, sourceId);
    if (!row?.proposed || row.proposed !== proposed) {
      throw Object.assign(new Error('Source changed. Reload before reviewing.'), { status: 409 });
    }
    if (accept) {
      repository.updateEvent(row.event_id, { ...requireEvent(row.event_id), ...JSON.parse(row.proposed) });
    }
    repository.acknowledgeSourceUpdate(sourceName, sourceId);
  });
}

export function startScrapeRun(sourceName) {
  return repository.startScrapeRun(sourceName, new Date().toISOString());
}

export function finishScrapeRun(id, counts, errors) {
  repository.finishScrapeRun(id, new Date().toISOString(), counts, errors.join('\n') || null);
}
