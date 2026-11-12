# Community Calendar — JavaScript

Community calendar for the CSTTP project in Estevan, with public submissions,
reviewer approval, local image storage, event search, and a reviewable scraper pipeline.

## Run locally

Use Node.js 22.13 or newer and run these commands from this directory.

```powershell
npm ci
npm run scrape
npm start
```

Open http://localhost:3000 for the calendar. Submit an event at `/submit.html`.
Open `/review.html` to sign in, edit, approve, reject, or archive events.
The terminal prints a randomly generated local reviewer password on startup.
It changes after a restart unless you set `ADMIN_PASSWORD` in `.env`.

The default server listens on 127.0.0.1. All event entry times are Saskatchewan
local time (America/Regina, UTC−06:00). The calendar library is served locally.
The sample importer works offline and contains fixed dates from November 2026.
Some sample events can therefore appear in a past month.

Copy `.env.example` to `.env` to configure a stable password and session secret.
Generate a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## What each part does

| File | Responsibility |
| --- | --- |
| `server.js` | Reads configuration, starts the server, handles shutdown |
| `app.js` | Connects HTTP requests to validation and database operations, checks reviewer sessions |
| `repositories/events.js` | Contains event SQL and supplies event records |
| `services/validation.js` | Checks field types, lengths, dates, categories and email |
| `services/images.js` | Decodes photos, resizes and re-encodes JPEG files, returns their paths |
| `services/ingestion.js` | Recognizes repeated imports and holds source changes for review |
| `db.js` | Opens SQLite and upgrades old event tables transactionally |
| `scraper/run.js` | Runs sources independently and records import results |
| `public/` | Browser pages, forms, calendar, sharing and reviewer dashboard |
| `test/` | HTTP/database regression tests and a real browser workflow |

A submitted event travels from `public/js/submit.js` to `POST /api/events` in
`app.js`. Validation checks the fields, the image service processes any photo,
and the repository inserts a pending event. A signed-in reviewer approves it.
Public API requests then include it in the calendar.

## Verify changes

```powershell
npm test
npm run test:browser
npm audit
```

Browser tests use installed Chrome. Set `BROWSER_CHANNEL=msedge` to use Edge.
Tests create temporary databases and remove them when finished. They cover older
database upgrades, public/private visibility, editing, approval, archiving,
invalid submissions, image decoding, import updates and sign-out. Browser tests
exercise public submission through publication and check the phone list view.

## Scraping

`sample-news.js` reads a saved HTML sample. No live local source is configured yet.
To integrate a real source, implement `NAME` and `scrape()` in a source module,
then register it in `scraper/sources/index.js`. The existing template demonstrates
HTML extraction. Choose a feed or page whose actual event structure you have inspected.

Return a stable `source_id` when the source supplies one. Otherwise the event's
own source URL identifies it. Recurring occurrences need distinct stable IDs.
A listing page URL shared by several events is unsuitable as their identity.
Dates must be Saskatchewan local strings such as `2026-11-20T19:30`.

Running an unchanged import adds no duplicate. Changed source fields appear in
Source changes on the reviewer dashboard. Accepting replaces the displayed
fields. Keeping current details preserves editorial values and acknowledges the
new source version. Published status stays unchanged. A disappearing source
listing does not automatically delete or cancel an event.

Import history records additions, proposed updates, skipped entries and errors.
A failing source does not stop subsequent sources. Use `npm run scrape` again
after correcting a failure. The sample filters intentionally retain past events
for learning and archive demonstrations.

## Data and deployment

SQLite uses WAL mode and a busy timeout. The first startup upgrades the historical
event schema in one transaction and preserves IDs and event rows. Future schema
changes should be added as another numbered migration in `db.js`.

Run `npm run backup` before a database change. It creates a consistent SQLite
backup using SQLite's backup API. Preserve `uploads/` alongside the database.
To restore, stop the application and scraper, move the existing database and its
WAL/SHM files aside together, place the backup at `DATABASE_PATH`, restore uploads,
and restart. Keep the old files until you verify the restored event count.

Reviewer sessions are stored in SQLite, expire after eight hours, and use HttpOnly,
SameSite cookies. Public submissions and login attempts are rate limited. JSON
write endpoints reject cross-origin browser requests. Public requests cannot read
pending/rejected/archived events or editorial notes. Public account IDs are ignored.

Production mode requires `ADMIN_PASSWORD`, `SESSION_SECRET`, and HTTPS for secure
cookies. Hosting and reverse-proxy configuration need a deployment-specific review.
The current reviewer model uses one shared reviewer password. Individual reviewer
accounts, password recovery, live local source integration, recurring-event editing,
notifications, and scheduled import execution remain future work.

Existing historical Base64 images remain readable. New uploads are stored as files,
and editing an old event reprocesses its image. Unreferenced image files are retained
for now. Include image retention and cleanup when defining deployment operations.
