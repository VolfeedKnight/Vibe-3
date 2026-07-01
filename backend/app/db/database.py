import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from app.core.config import settings


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(settings.database_path)
    connection.row_factory = sqlite3.Row

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
            """
        )
        connection.commit()


def healthcheck() -> None:
    initialize_database()

    with get_connection() as connection:
        connection.execute("SELECT value FROM app_metadata WHERE key = ?", ("schema_version",)).fetchone()
