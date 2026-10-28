# Community Calendar: JavaScript playground

JavaScript version of the prototype. Express serves the website and API, Cheerio does the scraping, SQLite stores events.
See the `main` branch README for the big picture and `docs/API.md` for the endpoints.

## Setup (once)

You need Node.js 22.13 or newer (check with `node --version`). SQLite is built into Node, so there's nothing else to install.

```bash
npm install
```

## Run it

```bash
npm run scrape    # 1. collect events into calendar.db as "pending"
npm start         # 2. start the website
```

Open http://localhost:3000/review.html and approve a few events, then check http://localhost:3000 to see them on the calendar.

Node prints an "SQLite is an experimental feature" warning. That's expected and safe to ignore for a prototype.

## Where things live

```
server.js               Web server and API
db.js                   Database helpers
scraper/run.js          Runs all sources, filters, saves
scraper/filters.js      Automatic spam and quality rules
scraper/sources/        One file per website we collect from
  sample-news.js        Working example (offline)
  _template.js          Copy this to add a real site
public/                 Frontend (shared with py-playground)
```

Search the code for `TODO (Sprint` to find your next tasks.

Start over with a clean database any time by deleting `calendar.db`.
