// Automatic filters that run BEFORE a human sees an event.
// Filters catch the obvious junk. Humans make the final call in the review queue.
// Each rule returns [keep?, reason].

const REQUIRED_FIELDS = ['title', 'start_time', 'source_url'];

// TODO (Sprint 3): grow this list as a class. What else signals spam or unacceptable content?
const BLOCKED_WORDS = ['buy cheap', 'casino', 'crypto giveaway'];

export function keepEvent(event) {
  for (const field of REQUIRED_FIELDS) {
    if (!event[field]) return [false, `missing ${field}`];
  }

  const text = `${event.title} ${event.description ?? ''}`.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (text.includes(word)) return [false, `blocked word '${word}'`];
  }

  // TODO (Sprint 3): skip events that are already in the past.
  // Hint: new Date(event.start_time) < new Date()

  // TODO (Sprint 3): skip events too far in the future (more than a year away?)

  return [true, 'ok'];
}
