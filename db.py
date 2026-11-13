"""SQLite helpers for the community calendar."""
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent
DB_PATH = ROOT / "calendar.db"
SCHEMA_PATH = ROOT / "data" / "schema.sql"


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def save_event(event):
    """Insert a scraped event as pending and report whether it was new."""
    with connect() as conn:
        cursor = conn.execute(
            """INSERT OR IGNORE INTO events
               (title, description, start_time, end_time, location, category, source_name, source_url)
               VALUES (:title, :description, :start_time, :end_time, :location, :category, :source_name, :source_url)""",
            {
                "description": None,
                "end_time": None,
                "location": None,
                "category": "Other",
                **event,
            },
        )
        return cursor.rowcount == 1
