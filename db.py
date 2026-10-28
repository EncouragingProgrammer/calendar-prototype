"""Database helpers. SQLite stores everything in one file: calendar.db"""
import sqlite3
from pathlib import Path

ROOT = Path(__file__).parent
DB_PATH = ROOT / "calendar.db"
SCHEMA_PATH = ROOT / "data" / "schema.sql"


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us read columns by name: row["title"]
    return conn


def init_db():
    """Create the events table if it doesn't exist yet."""
    with connect() as conn:
        conn.executescript(SCHEMA_PATH.read_text())


def save_event(event):
    """Insert a scraped event as 'pending'. Returns True if it was new."""
    with connect() as conn:
        cur = conn.execute(
            """INSERT OR IGNORE INTO events
               (title, description, start_time, end_time, location, category, source_name, source_url)
               VALUES (:title, :description, :start_time, :end_time, :location, :category, :source_name, :source_url)""",
            {
                "description": None, "end_time": None, "location": None, "category": "Other",
                **event,
            },
        )
        return cur.rowcount == 1
