from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

NewsRunMode = Literal["manual", "scheduled"]


class NewsCollectRequest(BaseModel):
    targetDate: date | None = Field(default=None, description="수집 대상 날짜. 없으면 전날로 처리")
    force: bool = False


class NewsCollectResponse(BaseModel):
    status: str
    targetDate: date
    runMode: NewsRunMode
    collected: int
    inserted: int
    updated: int
    skipped: int
    failed: int
    collectedAt: datetime


class NewsArticle(BaseModel):
    id: int
    sourceName: str
    title: str
    summary: str | None
    url: str
    publishedAt: datetime
    publishedDate: str
    publishedTime: str
    content: str | None = None


class NewsArticlesResponse(BaseModel):
    items: list[NewsArticle]
    targetDate: date
    total: int


class NewsRunResponse(BaseModel):
    id: int
    targetDate: date
    runMode: NewsRunMode
    status: str
    startedAt: datetime
    endedAt: datetime | None
    collectedCount: int
    insertedCount: int
    updatedCount: int
    skippedCount: int
    failedCount: int
    errorMessage: str | None = None


class NewsRunListResponse(BaseModel):
    items: list[NewsRunResponse]
