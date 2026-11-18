"""SQLite persistence helpers for the Discover Estevan calendar."""

# I now import the standard-library tools needed for portable file paths and SQLite access.
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


# I now identify the repository root so the backend works from any current working directory.
ROOT = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT / "data" / "schema.sql"


def get_db_path(path=None):
    """Return the configured SQLite path, or the repository-local default."""

    # I now allow each computer to choose another database through an environment variable.
    configured_path = path or os.environ.get("CALENDAR_DB_PATH")
    if configured_path:
        return Path(configured_path).expanduser().resolve()

    # I now keep the default database beside the Python files for a simple local setup.
    return ROOT / "calendar.db"


@contextmanager
def connect(path=None):
    """Open a row-producing SQLite connection."""

    # I now create the parent folder when a custom database path is used.
    database_path = get_db_path(path)
    database_path.parent.mkdir(parents=True, exist_ok=True)

    # I now set a timeout so a short SQLite lock does not immediately fail a request.
    connection = sqlite3.connect(database_path, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        # I now yield the connection to the caller while preserving normal transaction behavior.
        yield connection
    except Exception:
        # I now roll back incomplete work before exposing the original database error.
        connection.rollback()
        raise
    else:
        # I now commit successful writes because this helper owns the connection lifecycle.
        connection.commit()
    finally:
        # I now close the file handle explicitly because Windows locks open SQLite files.
        connection.close()


def init_db(path=None):
    """Create the database tables when they do not already exist."""

    # I now load the shared schema instead of duplicating SQL in application code.
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with connect(path) as connection:
        connection.executescript(schema_sql)


def save_event(event, path=None):
    """Insert a scraped event as pending and report whether it was new."""

    # I now apply safe defaults so source adapters can return only the fields they know.
    values = {
        "description": None,
        "end_time": None,
        "location": None,
        "category": "Other",
        **event,
    }

    # I now use the database uniqueness rule to prevent duplicate source records.
    with connect(path) as connection:
        cursor = connection.execute(
            """INSERT OR IGNORE INTO events
               (title, description, start_time, end_time, location, category, source_name, source_url)
               VALUES (:title, :description, :start_time, :end_time, :location, :category, :source_name, :source_url)""",
            values,
        )
        return cursor.rowcount == 1
