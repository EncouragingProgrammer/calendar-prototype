# Python backend web-scripting roadmap

This is the delivery path for the Python role described in the November 5, 2026 class summary. The goal is a reliable, demonstrable community calendar that Discovery Estevan can evaluate and local partners can trust.

> **Prototype status:** The current Python source is a working prototype for demonstration and evaluation. It is not production-ready until the security, testing, deployment, backup, monitoring, accessibility, and partner-readiness requirements below are completed.

## 1. Start locally

Use Python 3.10+ from the repository root:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m scraper.run
python app.py
```

Open `http://localhost:5000/review.html`, approve sample events, then verify them at `http://localhost:5000/`.

## 2. Understand the Python surface

| Area | File | Responsibility |
|---|---|---|
| Web/API | `app.py` | Serves the frontend and implements the three documented API routes |
| Persistence | `db.py` | Opens SQLite, initializes the schema, and deduplicates events |
| Pipeline | `scraper/run.py` | Runs each source, filters results, and saves pending events |
| Quality | `scraper/filters.py` | Rejects incomplete, blocked, malformed, or past events |
| Sources | `scraper/sources/` | One isolated adapter per approved public source |
| Contract | `docs/API.md` | Shared interface for the JavaScript and Python backends |

The Python backend must match the shared API contract:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/events?status=approved&category=Arts&q=craft` | List events. All query parameters are optional; `status` defaults to `approved`. |
| GET | `/api/events/:id` | Return one event, or `404` when it does not exist. |
| POST | `/api/events/:id/review` | Accept `{"status": "approved" or "rejected", "notes": "optional"}` and set `reviewed_at`. |

The frontend must be able to use either backend through these routes without changing its request logic.

## 3. Build in delivery order

1. **Baseline demo:** keep the offline sample source working; use it for every demo and regression check.
2. **Source agreement:** ask Discovery Estevan which official calendars, RSS feeds, or iCal feeds partners may provide. Prefer these over HTML scraping.
3. **Source adapters:** add one source at a time by copying `_template.py`, documenting its terms/robots decision, and adding it to `SOURCES`.
4. **Review workflow:** add reviewer authentication, edit-before-approve, rejection notes, and audit fields before any public deployment.
5. **Data quality:** add timezone handling, date-range limits, duplicate tests, source health logging, and clear invalid-input responses.
6. **Operations:** add environment-based configuration, production WSGI hosting, database backups, HTTPS, and error monitoring.
7. **Partner pilot:** onboard two or three organizations, measure submission-to-publication time, correction rate, and monthly active visitors, then adjust the workflow.

## 4. Partner-readiness gates

Do not present the system as production-ready until Discovery Estevan confirms:

- who may approve, edit, or reject events;
- whether partner self-submission is needed;
- what personal data, if any, is collected;
- the retention and backup expectations;
- the hosting, domain, accessibility, and support owner;
- the acceptable refresh delay and source failure response.

## 5. Partner value proposition

Lead partner conversations with outcomes rather than framework choices:

- one trusted local calendar instead of scattered announcements;
- free visibility for community events;
- a human review step that protects partner reputation;
- links back to each partner's original page;
- a low-effort path to submit or maintain events;
- transparent metrics for reach and engagement.

Prepare a one-page demo using the sample data, then replace it with a small consented pilot. Ask each pilot partner for a named contact, an approved source, two recurring events, and permission to use their logo/link.

## 6. Definition of done by March 2027

- public calendar works on desktop and mobile;
- reviewer actions require authentication and are logged;
- every event has a source link and normalized time;
- duplicate and invalid events are handled deterministically;
- API behavior matches `docs/API.md`;
- at least three real sources or partner feeds are tested;
- deployment, backup, incident, and ownership instructions are written;
- Discovery Estevan accepts the pilot using agreed success measures.

## 7. Recommended next three tasks

1. Run the offline pipeline and record the baseline demo.
2. Meet with Discovery Estevan to answer the security and partner questions above.
3. Add the first real, permission-checked local source and an automated test for its parser.
