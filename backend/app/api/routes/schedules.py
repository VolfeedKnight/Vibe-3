from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_schedules() -> dict[str, list[object]]:
    return {"items": []}
