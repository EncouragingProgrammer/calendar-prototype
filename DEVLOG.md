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

## Session 3 — Public/Admin Split, Image Uploader, Phone Formatting, Social Share & November Theme
- **Goal:** Separate public-facing pages from the administrator dashboard, build a clean submission form with 4K camera-roll photo optimization, upgrade the event detail view, and modernize the November color theme.
- **Changes Made:**
  - Separated public navigation (`Calendar`, `Submit event`) in `public/index.html` and `public/event.html` from the internal Admin Dashboard (`public/review.html`).
  - Upgraded `public/review.html` and `public/js/review.js` into an Admin Dashboard with `Pending`, `Live Approved`, and `Cold Storage (Archived)` filter tabs, inline `<dialog>` event editing (`PUT /api/events/:id`), and one-click past event archiving (`POST /api/events/archive-past`).
  - Redesigned `public/submit.html` into a centered two-column card layout with friendly Estevan placeholders and optional organizer contact fields.
  - Added client-side `<canvas>` image compression (`1280px` max width), `600×315px` minimum dimension validation, a click-to-expand full-size preview `<dialog>`, and live `(306) 555-1234` phone auto-formatting in `public/js/submit.js`, backed by a `10mb` JSON payload limit in `server.js`.
  - Upgraded `public/event.html` and `public/js/event.js` with right-aligned `Month View` and `List View` navigation buttons (`?view=month` / `?view=list` support in `public/js/calendar.js`), event posters, formatted organizer contact badges, native mobile sharing (`navigator.share`), and official Facebook and X share buttons.
  - Updated `:root[data-season="fall"]` in `public/style.css` to a modern, inclusive November Autumn Harvest & Slate color palette.
  - Added an optional `account_id TEXT` column in `data/schema.sql` and `x-account-id` / body hook in `server.js` (`POST /api/events`) to support future Single Sign-On (SSO) and mobile app account linking while keeping open guest submissions active.
