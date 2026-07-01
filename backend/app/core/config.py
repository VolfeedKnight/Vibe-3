from pathlib import Path


class Settings:
    app_name = "Public Administration Super App"
    backend_root = Path(__file__).resolve().parents[2]
    data_dir = backend_root / "data"
    upload_dir = backend_root / "uploads"
    database_path = data_dir / "app.db"
    cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
