# JavaScript API

All writes accept JSON. Errors return an `error` message and an HTTP error status.
Event dates use Saskatchewan local time in `YYYY-MM-DDTHH:mm` format.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/session` | Whether this browser is signed in |
| POST | `/api/session` | Sign in with `{ "password": "..." }` |
| DELETE | `/api/session` | Sign out, send `{}` |
| GET | `/api/events?status=approved&category=Arts&q=craft` | Public approved events. Other statuses require sign-in |
| GET | `/api/events/:id` | Published event, or any status for a reviewer |
| POST | `/api/events` | Guest submission, always pending |
| PUT | `/api/events/:id` | Reviewer updates supplied fields, preserving omitted fields |
| POST | `/api/events/:id/review` | Reviewer sets `status` and optional `notes` |
| POST | `/api/events/archive-past` | Reviewer archives approved events whose end time has passed |
| GET | `/api/imports` | Reviewer reads proposed source changes and recent import runs |
| POST | `/api/imports/resolve` | Reviewer submits source_name, source_id, exact proposed snapshot and accept boolean |

Statuses are pending, approved, rejected, archived. Events without an end time
remain live through the end of their start date when bulk archiving is run.

Submissions require title and start_time. Optional fields include description,
end_time, location, address, category, contact_name, contact_phone, contact_email,
and photo_url. Photo input accepts JPEG/PNG/WebP data URLs or HTTP image URLs.
Decoded uploads are limited to 5 MB and 40 million pixels and saved as JPEG files.
The account_id field is reserved for a future authenticated account system.

A public event includes its id, editorial event fields, source_name, source_url,
status and scraped_at. Internal review notes and account fields are omitted.
The earlier Python branch contract has not been updated alongside this JavaScript work.
