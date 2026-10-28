-- One table holds every event. "status" is the heart of the review workflow:
--   pending  = scraped, waiting for a human
--   approved = shown on the public calendar
--   rejected = hidden (kept so we don't scrape it again)
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT,
  start_time    TEXT NOT NULL,          -- ISO 8601, e.g. 2026-11-07T10:00
  end_time      TEXT,
  location      TEXT,
  category      TEXT DEFAULT 'Other',
  source_name   TEXT NOT NULL,          -- e.g. "Sample News"
  source_url    TEXT NOT NULL,          -- link back to the original post
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_notes  TEXT,
  reviewed_at   TEXT,
  scraped_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_url, title, start_time) -- stops the same event being saved twice
);
