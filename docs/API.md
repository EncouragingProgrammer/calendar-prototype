# API contract

Both backends (Python on `py-playground`, JavaScript on `js-playground`) must implement exactly these endpoints.
The frontend in `public/` only talks to these, so it works with either backend.

| Method | Path | What it does |
|---|---|---|
| GET | `/api/events?status=approved&category=Arts&q=craft` | List events. All query params optional. `status` defaults to `approved`. |
| GET | `/api/events/:id` | One event, or 404. |
| POST | `/api/events/:id/review` | Body `{"status": "approved" or "rejected", "notes": "optional"}`. Sets status and reviewed_at. |

An event looks like this.

```json
{
  "id": 1,
  "title": "Fall Craft Fair",
  "description": "Over 40 local makers...",
  "start_time": "2026-11-07T10:00",
  "end_time": null,
  "location": "Community Hall",
  "category": "Arts",
  "source_name": "Sample News",
  "source_url": "https://example.com/news/fall-craft-fair",
  "status": "approved"
}
```
