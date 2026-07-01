from fastapi import APIRouter

from app.db.database import healthcheck

router = APIRouter(prefix="/db", tags=["database"])


@router.get("/health")
def get_database_health() -> dict[str, str]:
    healthcheck()
    return {
        "status": "ok",
        "service": "sqlite",
        "message": "SQLite 연결과 기본 테이블 확인이 완료되었습니다.",
    }
