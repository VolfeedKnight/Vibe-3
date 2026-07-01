from fastapi import APIRouter

router = APIRouter()


@router.get("/articles")
def list_articles() -> dict[str, list[object]]:
    return {"items": []}
