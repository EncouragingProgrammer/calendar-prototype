# Development Log — Community Calendar Prototype (`js-playground`)

## Session 1 — Environment Setup & Cold Storage Schema
- **Goal:** Configure local Node.js runtime and prepare database schema for historical archiving.
- **Changes Made:**
  - Verified local Node.js environment, installed dependencies (`express`, `cheerio`), and tested offline scraping (`npm run scrape`).
  - Updated `data/schema.sql` to add `'archived'` to the `status` check constraint so finished events can move to cold storage without cluttering the active calendar.
  - Verified `db.js` auto-initializes missing SQLite database files on boot from `data/schema.sql`.
  - Committed and pushed schema baseline to `js-playground` (`46a3ad0`).

## Session 2 — Optional Contact Fields, CRUD Endpoints & UUIDs
- **Goal:** Expand event schema to match organizer scope notes, keep phone numbers optional, and prevent manual submission ID collisions.
- **Changes Made:**
  - Expanded `data/schema.sql` with optional (`NULL`-allowed) fields: `address`, `contact_name`, `contact_phone`, `contact_email`, `photo_url`, and `attachments`.
  - Added `POST /api/events` and `PUT /api/events/:id` routes to `server.js` for user event submissions and easy detail updates.
  - Upgraded manual submission `source_url` keys from `Date.now()` to `crypto.randomUUID()` for collision-free unique identifiers.
  - Created `DEVLOG.md` to track architectural decisions and progress across sessions.
