"""Flask web server. Serves the frontend in public/ and the JSON API in docs/API.md

Run it with:  python app.py   then open http://localhost:5000
"""
from datetime import datetime

from flask import Flask, abort, jsonify, request

import db

app = Flask(__name__, static_folder="public", static_url_path="")


@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.get("/api/events")
def list_events():
    status = request.args.get("status", "approved")
    category = request.args.get("category", "")
    q = request.args.get("q", "")

    sql = "SELECT * FROM events WHERE status = ?"
    params = [status]
    if category:
        sql += " AND category = ?"
        params.append(category)
    if q:
        sql += " AND (title LIKE ? OR location LIKE ?)"
        params += [f"%{q}%", f"%{q}%"]
    sql += " ORDER BY start_time"

    with db.connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/events/<int:event_id>")
def get_event(event_id):
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM events WHERE id = ?", [event_id]).fetchone()
    if row is None:
        abort(404)
    return jsonify(dict(row))


@app.post("/api/events/<int:event_id>/review")
def review_event(event_id):
    # TODO (Sprint 4): only logged in reviewers should be allowed to do this
    body = request.get_json(force=True)
    status = body.get("status")
    if status not in ("approved", "rejected"):
        return jsonify(error="status must be 'approved' or 'rejected'"), 400

    with db.connect() as conn:
        conn.execute(
            "UPDATE events SET status = ?, review_notes = ?, reviewed_at = ? WHERE id = ?",
            [status, body.get("notes"), datetime.now().isoformat(timespec="seconds"), event_id],
        )
    return jsonify(ok=True)


if __name__ == "__main__":
    db.init_db()
    app.run(debug=True, port=5000)
