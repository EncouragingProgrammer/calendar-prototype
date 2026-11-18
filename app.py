"""Flask web server and API for the Discover Estevan community calendar."""

# I now import the standard-library tools needed for safe timestamps and configuration.
import os
from datetime import datetime, timezone

# I now import Flask helpers for pages, JSON responses, request data, and error responses.
from flask import Flask, abort, jsonify, request

# I now reuse the database module so the API and scraper share one persistence design.
import db


def create_app(test_config=None):
    """Create a Flask application that can run locally or inside automated tests."""

    # I now create the app with the existing public folder as its static web root.
    application = Flask(__name__, static_folder="public", static_url_path="")

    # I now keep configuration in one place and allow tests or deployments to override it.
    application.config.from_mapping(
        DB_PATH=db.get_db_path(),
        JSON_SORT_KEYS=False,
    )
    if test_config:
        application.config.update(test_config)

    # I now initialize the local SQLite schema before the first request can use it.
    db.init_db(application.config["DB_PATH"])

    @application.get("/")
    def home():
        # I now serve the public calendar page from the same origin as the API.
        return application.send_static_file("index.html")

    @application.get("/health")
    def health():
        # I now provide a small endpoint that makes local startup checks easy.
        return jsonify(status="ok", service="discover-estevan-calendar")

    @application.get("/api/events")
    def list_events():
        # I now read optional filters while keeping approved events as the safe public default.
        status = request.args.get("status", "approved").strip().lower()
        category = request.args.get("category", "").strip()
        query = request.args.get("q", "").strip()

        # I now reject unsupported workflow states instead of returning ambiguous data.
        if status not in {"pending", "approved", "rejected"}:
            return jsonify(error="status must be pending, approved, or rejected"), 400

        # I now build a parameterized query so search text cannot become SQL code.
        sql = "SELECT * FROM events WHERE status = ?"
        parameters = [status]
        if category:
            sql += " AND category = ?"
            parameters.append(category)
        if query:
            sql += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)"
            search_value = f"%{query}%"
            parameters.extend([search_value, search_value, search_value])
        sql += " ORDER BY start_time ASC, id ASC"

        # I now read the filtered rows and convert SQLite rows into JSON dictionaries.
        with db.connect(application.config["DB_PATH"]) as connection:
            rows = connection.execute(sql, parameters).fetchall()
        return jsonify([dict(row) for row in rows])

    @application.get("/api/events/<int:event_id>")
    def get_event(event_id):
        # I now look up one event by its numeric identifier.
        with db.connect(application.config["DB_PATH"]) as connection:
            row = connection.execute(
                "SELECT * FROM events WHERE id = ?", [event_id]
            ).fetchone()

        # I now use a normal 404 response when the requested event does not exist.
        if row is None:
            abort(404)
        return jsonify(dict(row))

    @application.post("/api/events/<int:event_id>/review")
    def review_event(event_id):
        # I now require a JSON object so malformed review requests fail clearly.
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify(error="request body must be a JSON object"), 400

        # I now validate the only workflow transitions allowed by the review contract.
        status = body.get("status")
        if status not in {"approved", "rejected"}:
            return jsonify(error="status must be approved or rejected"), 400

        # I now validate optional notes so unexpected values are not stored as text accidentally.
        notes = body.get("notes")
        if notes is not None and not isinstance(notes, str):
            return jsonify(error="notes must be a string when provided"), 400
        if isinstance(notes, str) and len(notes) > 2000:
            return jsonify(error="notes must be 2000 characters or fewer"), 400

        # I now record a timezone-aware UTC timestamp for an auditable decision.
        reviewed_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with db.connect(application.config["DB_PATH"]) as connection:
            result = connection.execute(
                """UPDATE events
                   SET status = ?, review_notes = ?, reviewed_at = ?
                   WHERE id = ?""",
                [status, notes, reviewed_at, event_id],
            )

        # I now return 404 when a reviewer submits an unknown event identifier.
        if result.rowcount == 0:
            abort(404)
        return jsonify(ok=True, event_id=event_id, status=status, reviewed_at=reviewed_at)

    @application.errorhandler(404)
    def not_found(error):
        # I now return JSON for missing API resources while preserving HTML page behavior.
        if request.path.startswith("/api/"):
            return jsonify(error="resource not found"), 404
        return error

    return application


# I now expose a default application object for Flask tools and simple imports.
app = create_app()


if __name__ == "__main__":
    # I now read host and port settings so each computer can choose its local server address.
    host = os.environ.get("CALENDAR_HOST", "127.0.0.1")
    port = int(os.environ.get("CALENDAR_PORT", "5000"))
    debug = os.environ.get("CALENDAR_DEBUG", "0").lower() in {"1", "true", "yes"}

    # I now start Flask only when this file is executed directly.
    app.run(host=host, port=port, debug=debug)
