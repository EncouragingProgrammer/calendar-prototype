import * as repository from '../repositories/eventRepository.js';
import { validateEvent, text, invalid } from './validation.js';

export function ingestEvent(raw) {
  const event = validateEvent(raw);
  const sourceName = text(raw.source_name, 'source_name', 300, true);
  const url = text(raw.source_url, 'source_url', 2000, true);
  if (!/^https?:\/\//.test(url)) throw invalid('Source URL must use HTTP or HTTPS');
  new URL(url);
  // Recurring listings must supply an occurrence-specific source_id.
  const sourceId = text(raw.source_id || url, 'source_id', 2000, true);
  const snapshot = JSON.stringify(event);
  const now = new Date().toISOString();
  return repository.transaction(() => {
    const existing = repository.getSourceEvent(sourceName, sourceId);
    if (existing) {
      const proposed = existing.snapshot === snapshot ? null : snapshot;
      repository.proposeSourceUpdate(sourceName, sourceId, proposed, now);
      return proposed && proposed !== existing.proposed ? 'updated' : 'unchanged';
    }
    // Associate historical imports by their source URL, preserving editorial state.
    const legacy = !raw.source_id && repository.findLegacyEvent(sourceName, url);
    const id = legacy?.id || repository.createEvent(event, { name: sourceName, url });
    repository.createSourceEvent(sourceName, sourceId, id, snapshot, legacy ? snapshot : null, now);
    return legacy ? 'updated' : 'added';
  });
}
