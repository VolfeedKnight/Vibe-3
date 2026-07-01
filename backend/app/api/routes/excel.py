from fastapi import APIRouter

router = APIRouter()


@router.get("/jobs")
def list_excel_jobs() -> dict[str, list[object]]:
    return {"items": []}
