import os
from pathlib import Path


def _parse_cors_origins(name: str, fallback: list[str]) -> list[str]:
    raw_value = os.getenv(name, "").strip()

    if not raw_value:
        return fallback

    origins = [origin.strip().rstrip("/") for origin in raw_value.split(",") if origin.strip()]
    return origins or fallback


class Settings:
    app_name = "Public Administration Super App"
    backend_root = Path(__file__).resolve().parents[2]
    data_dir = backend_root / "data"
    upload_dir = backend_root / "uploads"
    database_path = data_dir / "app.db"
    cors_origins = _parse_cors_origins(
        "CORS_ORIGINS",
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://volfeedknight.github.io",
            "https://volfeedknight.github.io/Vibe-3",
        ],
    )


settings = Settings()
