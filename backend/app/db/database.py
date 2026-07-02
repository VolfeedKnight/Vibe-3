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

            CREATE TABLE IF NOT EXISTS news_articles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              source_code TEXT NOT NULL,
              source_name TEXT NOT NULL,
              title TEXT NOT NULL,
              summary TEXT,
              url TEXT NOT NULL UNIQUE,
              published_at TEXT NOT NULL,
              published_date TEXT NOT NULL,
              published_month TEXT NOT NULL,
              content TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_news_articles_published_at
            ON news_articles (published_at DESC);

            CREATE INDEX IF NOT EXISTS idx_news_articles_published_date
            ON news_articles (published_date DESC);

            CREATE INDEX IF NOT EXISTS idx_news_articles_published_month
            ON news_articles (published_month DESC);

            CREATE INDEX IF NOT EXISTS idx_news_articles_source_code
            ON news_articles (source_code);

            CREATE TABLE IF NOT EXISTS news_collect_runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              started_at TEXT NOT NULL,
              ended_at TEXT,
              status TEXT NOT NULL,
              sources TEXT NOT NULL,
              target_date TEXT,
              run_mode TEXT,
              collected_count INTEGER NOT NULL DEFAULT 0,
              inserted_count INTEGER NOT NULL DEFAULT 0,
              updated_count INTEGER NOT NULL DEFAULT 0,
              skipped_count INTEGER NOT NULL DEFAULT 0,
              failed_count INTEGER NOT NULL DEFAULT 0,
              error_message TEXT
            );
            """
        )
        connection.commit()

        _ensure_column(connection, "news_collect_runs", "target_date", "TEXT")
        _ensure_column(connection, "news_collect_runs", "run_mode", "TEXT")
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_news_collect_runs_target_date
            ON news_collect_runs (target_date)
            """
        )
        connection.commit()


def healthcheck() -> None:
    initialize_database()

    with get_connection() as connection:
        connection.execute("SELECT value FROM app_metadata WHERE key = ?", ("schema_version",)).fetchone()


def _ensure_column(connection: sqlite3.Connection, table_name: str, column_name: str, column_type: str) -> None:
    columns = {
        row[1]
        for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    }

    if column_name in columns:
        return

    connection.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
