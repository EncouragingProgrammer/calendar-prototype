# Discover Estevan Community Calendar

This repository contains a portable Python backend for a community event calendar. It collects candidate events, validates them, stores them in SQLite, sends them to a human review queue, and publishes only approved events.

The backend is a local demonstration prototype. It is not production-ready until reviewer authentication, HTTPS, backups, monitoring, accessibility testing, and approved real sources are added.

## What is included

```text
app.py                    Flask web server and API
db.py                     Portable SQLite connection and persistence helpers
data/schema.sql           Database schema
data/sample_news_page.html Offline demonstration source
scraper/run.py            Collection pipeline
scraper/filters.py        Automatic quality checks
scraper/sources/          Isolated source adapters
public/                   Calendar, event, and review web pages
tests/test_backend.py     Standard-library backend tests
docs/API.md               Frontend/backend API contract
```

## Run on Windows

Open PowerShell in the repository folder:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m scraper.run
python app.py
```

If PowerShell blocks activation, run the commands with the virtual-environment interpreter directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m scraper.run
.\.venv\Scripts\python.exe app.py
```

## Run on macOS or Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m scraper.run
python app.py
```

Open these pages:

- Public calendar: <http://127.0.0.1:5000/>
- Review queue: <http://127.0.0.1:5000/review.html>
- Health check: <http://127.0.0.1:5000/health>

The server stops with `Ctrl+C`.

## Run the tests

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

The tests use a temporary SQLite database and do not modify the local `calendar.db`.

## Configuration

The default database is `calendar.db` in the repository. Optional environment variables are available:

| Variable | Default | Purpose |
|---|---|---|
| `CALENDAR_DB_PATH` | `calendar.db` | Store SQLite elsewhere |
| `CALENDAR_HOST` | `127.0.0.1` | Choose the server host |
| `CALENDAR_PORT` | `5000` | Choose the server port |
| `CALENDAR_DEBUG` | `0` | Enable Flask debug mode locally |

Example:

```powershell
$env:CALENDAR_PORT = "5050"
python app.py
```

## Event workflow

1. `python -m scraper.run` reads configured sources.
2. `scraper/filters.py` rejects incomplete, blocked, malformed, or past events.
3. Valid events are stored as `pending`.
4. A reviewer opens `/review.html` and approves or rejects each event.
5. The public calendar requests `status=approved` events only.

Before adding a real source, check its terms of use and `robots.txt`. Prefer official RSS, iCalendar, or partner feeds, and always preserve the original source link.
