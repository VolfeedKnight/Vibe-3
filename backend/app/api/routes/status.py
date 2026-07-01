from fastapi import APIRouter

router = APIRouter(tags=["status"])


@router.get("/status")
def get_status() -> dict[str, object]:
    return {
        "app": "public-administration-super-app",
        "modules": ["schedules", "excel", "complaints", "news"],
    }
