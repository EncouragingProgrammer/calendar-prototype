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

## Session 4 — Codex implementation and three-tier refactor

Work completed on November 11, 2026 (America/Regina), building on `js-playground` for the `Codex` branch.

### Implementation

- Completed the dashboard's edit, status-filter, rejection and archive controls. Inspection showed that Session 3's dashboard markup had controls whose JavaScript and archive endpoint still needed implementation.
- Added reviewer sign-in, SQLite-backed sessions, protected editing and review endpoints, and public visibility rules that exclude unpublished events and internal review notes.
- Added server-side validation, request rate limits, browser origin checks and consistent JSON errors. Publicly supplied account IDs are ignored pending a verified account system.
- Added server-side photo decoding, resizing and JPEG file storage. Historical Base64 images remain readable and are reprocessed when their event is edited.
- Added a transactional upgrade for older event tables, preserving event IDs and records, plus a SQLite backup command.
- Added stable source identity tracking, proposed source updates, reviewer acceptance or dismissal, and persisted import history. Repeated imports preserve published editorial details until review.
- Fixed Facebook and X sharing URLs, displayed event details in Saskatchewan time, and served FullCalendar locally.

### Architecture

- `routes/eventRoutes.js` handles HTTP parameters and responses for event and import endpoints.
- `services/eventService.js` handles event visibility, review, archive decisions and scraper filtering. Supporting services handle field validation, image processing, ingestion and password comparison.
- `repositories/eventRepository.js` owns event and ingestion SQL, using placeholder parameters and argument arrays. Session persistence lives in `repositories/sessionRepository.js`.
- `server.js` initializes Express and middleware, mounts event and session routers, and handles startup and shutdown. `app.js` retains the application-factory export for existing callers.
- `scraper/filters.js` re-exports the service filter for compatibility. The scraper runner records results through service and repository functions.
- Restored the requested 10 MB JSON parser limit. Schema constraints were preserved during the refactor.
- Updated setup and API documentation and added a GitHub Actions test workflow.

### Verification

- All nine backend tests passed, covering legacy database migration, public/private visibility, editing, approval, archiving, input validation, image storage, scraper updates, JSON errors and rate limits.
- Payload checks accepted a 9 MB JSON request and rejected a request exceeding 10 MB with a JSON error.
- Chrome workflow passed for submission, reviewer login, editing, approval, desktop calendar, event details and the mobile list view.
- Scraper command checks added five sample events on the first run and zero on the second. Direct server startup passed.
- Database backup command and whitespace checks passed. The dependency audit reported zero known vulnerabilities when checked during implementation.

### Remaining work

- Live local scraping sources, individual reviewer accounts, recurring-event editing, scheduled imports, notifications and deployment configuration still need implementation.
- The current importer uses an offline sample. Reviewer access uses a shared password. Uploaded-image retention and cleanup need an operational policy.
- GitHub Actions results will be available after publication; local checks are the verification recorded here.
