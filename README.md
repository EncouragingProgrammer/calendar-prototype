# Community Calendar: Python playground

Python version of the prototype. Flask serves the website and API, BeautifulSoup does the scraping, SQLite stores events.
See the `main` branch README for the big picture and `docs/API.md` for the endpoints.

## Setup (once)

You need Python 3.10 or newer.

```bash
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Mac / Linux:  source .venv/bin/activate
pip install -r requirements.txt
```

## Run it

```bash
python -m scraper.run     # 1. collect events into calendar.db as "pending"
python app.py             # 2. start the website
```

Open http://localhost:5000/review.html and approve a few events, then check http://localhost:5000 to see them on the calendar.

## Where things live

```
app.py                  Web server and API
db.py                   Database helpers
scraper/run.py          Runs all sources, filters, saves
scraper/filters.py      Automatic spam and quality rules
scraper/sources/        One file per website we collect from
  sample_news.py        Working example (offline)
  _template.py          Copy this to add a real site
public/                 Frontend (shared with js-playground)
```

Search the code for `TODO (Sprint` to find your next tasks.

Start over with a clean database any time by deleting `calendar.db`.
