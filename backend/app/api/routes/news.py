from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from app.schemas.news import (
    NewsArticlesResponse,
    NewsCollectRequest,
    NewsCollectResponse,
    NewsRunListResponse,
    NewsRunResponse,
)
from app.services.news import collect_news, get_latest_run, list_articles, list_recent_runs

router = APIRouter()


@router.post("/collect", response_model=NewsCollectResponse)
def collect_articles(payload: NewsCollectRequest) -> NewsCollectResponse:
    return collect_news(payload.targetDate, force=payload.force, run_mode="manual")


@router.get("/articles", response_model=NewsArticlesResponse)
def get_articles(target_date: date | None = Query(default=None, alias="date")) -> NewsArticlesResponse:
    return list_articles(target_date)


@router.get("/runs/latest", response_model=NewsRunResponse | None)
def latest_run() -> NewsRunResponse | None:
    return get_latest_run()


@router.get("/runs", response_model=NewsRunListResponse)
def recent_runs(limit: int = Query(default=10, ge=1, le=50)) -> NewsRunListResponse:
    return list_recent_runs(limit)
