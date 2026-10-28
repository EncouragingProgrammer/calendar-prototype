# Community Calendar Prototype

A CSTTP (Computer Science Training Through Projects) class project at Southeast College.

The app collects local events from news sites and other public sources, holds them in a **review queue** until a person approves them, and shows approved events on a public calendar. Clicking an event shows its details and a link back to the original post.

This is a learning prototype. It does not need to be perfect.

## How the pieces fit

```
 Sources (news pages, RSS, iCal)          Reviewer                 Public
          |                                  |                        |
          v                                  v                        v
   [ Scraper ] --pending--> [ SQLite DB ] <--approve/reject-- [ Review page ]
                                 |
                                 +--approved--> [ API ] --> [ Calendar page ] --> [ Event page ] --> original link
```

## Branches

We are building the same app twice so we can compare languages.

| Branch | Backend | Scraping | Database |
|---|---|---|---|
| `main` | Shared pieces only (frontend, sample data, schema, docs) | | |
| `py-playground` | Python + Flask | requests + BeautifulSoup | SQLite (built in) |
| `js-playground` | Node.js + Express | fetch + Cheerio | SQLite (`node:sqlite`, built in) |

Both backends follow the same [API contract](docs/API.md), so the frontend in `public/` works with either one.

Switch branches with `git switch py-playground` or `git switch js-playground`, then follow that branch's README.

## Folder layout (shared)

```
public/          Frontend. Plain HTML, CSS and JavaScript plus FullCalendar.
  index.html     The calendar
  event.html     Event details and original link
  review.html    Review queue (approve or reject)
data/
  schema.sql     Database table
  sample_news_page.html   Fake news page so the scraper works offline
docs/
  API.md         The endpoints both backends must provide
  Community Calendar Project Plan.docx
```

## Rules for scraping

1. Read a site's Terms of Use and `robots.txt` before scraping it.
2. Prefer feeds (RSS, iCal) and official APIs over scraping HTML.
3. Do not scrape Facebook or Instagram. Their terms forbid it and they actively block it.
4. Scrape slowly (one request every few seconds) and identify the bot in the User-Agent.
5. Always link back to the original source.
