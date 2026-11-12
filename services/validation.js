export function invalid(message) {
  return Object.assign(new Error(message), { status: 400 });
}

export function text(value, name, max = 500, required = false) {
  if (value == null || value === '') {
    if (required) throw invalid(`${name} is required`);
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > max) throw invalid(`${name} must be text of at most ${max} characters`);
  const result = value.trim();
  if (required && !result) throw invalid(`${name} is required`);
  return result || null;
}

export function localDate(value, name, required = false) {
  const result = text(value, name, 19, required);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(result)) throw invalid(`${name} must be a local date and time`);
  const date = new Date(result + '-06:00');
  const normalized = new Date(date.getTime() - 6 * 3600000);
  if (!Number.isFinite(date.getTime()) || normalized.toISOString().slice(0, 16) !== result.slice(0, 16)) throw invalid(`${name} is invalid`);
  return result.slice(0, 16);
}

export function validateEvent(body) {
  const event = {};
  for (const name of ['title', 'description', 'location', 'address', 'category', 'contact_name', 'contact_phone', 'contact_email']) {
    event[name] = text(body[name], name, name === 'description' ? 10000 : 300, name === 'title');
  }
  event.category ||= 'Other';
  if (!['Arts', 'Community', 'Family', 'Sports', 'Other'].includes(event.category)) throw invalid('Choose a supported category');
  event.start_time = localDate(body.start_time, 'start_time', true);
  event.end_time = localDate(body.end_time, 'end_time');
  if (event.end_time && event.end_time < event.start_time) throw invalid('End time must be on or after start time');
  if (event.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.contact_email)) throw invalid('Enter a valid contact email');
  return event;
}

export function eventId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw invalid('Invalid event ID');
  return id;
}
