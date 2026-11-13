"""Flask web server for the community calendar."""
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

    if status not in ("pending", "approved", "rejected"):
        return jsonify(error="invalid status"), 400

    sql = "SELECT * FROM events WHERE status = ?"
    params = [status]
    if category:
        sql += " AND category = ?"
        params.append(category)
    if q:
        sql += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)"
        params += [f"%{q}%", f"%{q}%", f"%{q}%"]
    sql += " ORDER BY start_time"

    with db.connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify([dict(row) for row in rows])


@app.get("/api/events/<int:event_id>")
def get_event(event_id):
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM events WHERE id = ?", [event_id]).fetchone()
    if row is None:
        abort(404)
    return jsonify(dict(row))


@app.post("/api/events/<int:event_id>/review")
def review_event(event_id):
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in ("approved", "rejected"):
        return jsonify(error="status must be 'approved' or 'rejected'"), 400

    with db.connect() as conn:
        result = conn.execute(
            "UPDATE events SET status = ?, review_notes = ?, reviewed_at = ? WHERE id = ?",
            [status, body.get("notes"), datetime.now().isoformat(timespec="seconds"), event_id],
        )
    if result.rowcount == 0:
        abort(404)
    return jsonify(ok=True)


if __name__ == "__main__":
    db.init_db()
    app.run(debug=True, port=5000)
