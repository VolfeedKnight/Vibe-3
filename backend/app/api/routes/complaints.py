from fastapi import APIRouter

router = APIRouter()


@router.get("/manuals")
def list_manuals() -> dict[str, list[object]]:
    return {"items": []}
