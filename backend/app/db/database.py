import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from app.core.config import settings


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
    finally:
        connection.close()


def initialize_database() -> None:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)

    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );

            INSERT OR IGNORE INTO app_metadata (key, value)
            VALUES ('schema_version', '0.1.0');

            CREATE TABLE IF NOT EXISTS team_members (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              department TEXT,
              position TEXT,
              email TEXT UNIQUE,
              phone TEXT,
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS schedules (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              team_member_id INTEGER NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('vacation', 'work', 'business_trip', 'other')),
              title TEXT NOT NULL,
              start_date TEXT NOT NULL,
              end_date TEXT NOT NULL,
              start_time TEXT,
              end_time TEXT,
              location TEXT,
              memo TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (team_member_id) REFERENCES team_members(id)
            );

            CREATE INDEX IF NOT EXISTS idx_schedules_date_range
            ON schedules (start_date, end_date);

            CREATE INDEX IF NOT EXISTS idx_schedules_team_member
            ON schedules (team_member_id);
            """
        )
        connection.commit()


def healthcheck() -> None:
    initialize_database()

    with get_connection() as connection:
        connection.execute("SELECT value FROM app_metadata WHERE key = ?", ("schema_version",)).fetchone()
