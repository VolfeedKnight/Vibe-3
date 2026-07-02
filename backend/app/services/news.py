from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Iterable
from urllib.error import URLError
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

from app.db.database import get_connection
from app.schemas.news import (
    NewsArticle,
    NewsArticlesResponse,
    NewsCollectResponse,
    NewsRunListResponse,
    NewsRunResponse,
    NewsRunMode,
)

SEOUL = timezone(timedelta(hours=9))
SOURCE_NAME = "대한민국 정책브리핑"
LIST_URL = "https://www.korea.kr/news/policyNewsList.do"
DETAIL_MARKER = "policyNewsView.do?newsId="
MAX_LIST_PAGES = 12
MAX_ARTICLES_PER_PAGE = 40


@dataclass(slots=True)
class CollectedArticle:
    title: str
    summary: str | None
    url: str
    published_at: datetime
    content: str | None = None


def collect_news(
    target_date: date | None = None,
    *,
    force: bool = False,
    run_mode: NewsRunMode = "manual",
) -> NewsCollectResponse:
    target = target_date or (datetime.now(tz=SEOUL).date() - timedelta(days=1))
    started_at = datetime.now(tz=SEOUL)
    run_id = _create_collect_run(started_at, target, run_mode)
    collected = inserted = updated = skipped = failed = 0

    try:
        articles, page_failures = _collect_articles_for_date(target)
        failed += page_failures

        for article in articles:
            collected += 1
            result = _upsert_article(article, force=force)
            if result == "inserted":
                inserted += 1
            elif result == "updated":
                updated += 1
            else:
                skipped += 1

        ended_at = datetime.now(tz=SEOUL)
        _finish_collect_run(
            run_id=run_id,
            status="success",
            ended_at=ended_at,
            collected=collected,
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            failed=failed,
        )
        return NewsCollectResponse(
            status="ok",
            targetDate=target,
            runMode=run_mode,
            collected=collected,
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            failed=failed,
            collectedAt=ended_at,
        )
    except Exception as error:
        ended_at = datetime.now(tz=SEOUL)
        _finish_collect_run(
            run_id=run_id,
            status="failed",
            ended_at=ended_at,
            collected=collected,
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            failed=failed,
            error_message=str(error),
        )
        raise


def list_articles(target_date: date | None = None) -> NewsArticlesResponse:
    target = target_date or (datetime.now(tz=SEOUL).date() - timedelta(days=1))
    target_key = target.isoformat()

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
              id,
              source_name,
              title,
              summary,
              url,
              published_at,
              published_date,
              content
            FROM news_articles
            WHERE published_date = ?
            ORDER BY published_at DESC, id DESC
            """,
            (target_key,),
        ).fetchall()

    items = [
        NewsArticle(
            id=row["id"],
            sourceName=row["source_name"],
            title=row["title"],
            summary=row["summary"],
            url=row["url"],
            publishedAt=datetime.fromisoformat(row["published_at"]),
            publishedDate=row["published_date"],
            publishedTime=_format_time_label(datetime.fromisoformat(row["published_at"])),
            content=row["content"],
        )
        for row in rows
    ]

    return NewsArticlesResponse(items=items, targetDate=target, total=len(items))


def get_latest_run() -> NewsRunResponse | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
              id,
              target_date,
              run_mode,
              status,
              started_at,
              ended_at,
              collected_count,
              inserted_count,
              updated_count,
              skipped_count,
              failed_count,
              error_message
            FROM news_collect_runs
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()

    if row is None:
        return None

    return _row_to_run_response(row)


def list_recent_runs(limit: int = 10) -> NewsRunListResponse:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
              id,
              target_date,
              run_mode,
              status,
              started_at,
              ended_at,
              collected_count,
              inserted_count,
              updated_count,
              skipped_count,
              failed_count,
              error_message
            FROM news_collect_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return NewsRunListResponse(items=[_row_to_run_response(row) for row in rows])


def run_scheduled_news_collection() -> NewsCollectResponse:
    return collect_news(run_mode="scheduled")


def _row_to_run_response(row: sqlite3.Row) -> NewsRunResponse:
    return NewsRunResponse(
        id=row["id"],
        targetDate=date.fromisoformat(row["target_date"]),
        runMode=row["run_mode"],
        status=row["status"],
        startedAt=datetime.fromisoformat(row["started_at"]),
        endedAt=datetime.fromisoformat(row["ended_at"]) if row["ended_at"] else None,
        collectedCount=row["collected_count"],
        insertedCount=row["inserted_count"],
        updatedCount=row["updated_count"],
        skippedCount=row["skipped_count"],
        failedCount=row["failed_count"],
        errorMessage=row["error_message"],
    )


def _collect_articles_for_date(target_date: date) -> tuple[list[CollectedArticle], int]:
    collected: list[CollectedArticle] = []
    seen_urls: set[str] = set()
    baseline_urls = _extract_article_urls(_fetch_list_page(1))
    failures = 0

    for page in range(1, MAX_LIST_PAGES + 1):
        html = _fetch_list_page(page, baseline_urls if page > 1 else None)
        urls = _extract_article_urls(html)

        if not urls:
            break

        if page > 1 and urls == baseline_urls:
            break

        page_dates: list[date] = []
        reached_older_than_target = False

        for url in urls[:MAX_ARTICLES_PER_PAGE]:
            if url in seen_urls:
                continue

            seen_urls.add(url)
            try:
                detail = _parse_detail(url, _fetch_html(url))
            except Exception:
                failures += 1
                continue

            if detail is None:
                failures += 1
                continue

            article_date = detail.published_at.date()
            page_dates.append(article_date)

            if article_date == target_date:
                collected.append(detail)
            elif article_date < target_date:
                reached_older_than_target = True

        if page_dates and max(page_dates) < target_date:
            break

        if reached_older_than_target and not any(article_date == target_date for article_date in page_dates):
            break

    collected.sort(key=lambda article: article.published_at, reverse=True)
    return collected, failures


def _parse_detail(url: str, html: str) -> CollectedArticle | None:
    soup = BeautifulSoup(html, "html.parser")
    title = _extract_title(soup)
    if not title:
        return None

    published_at = _extract_published_at(soup)
    return CollectedArticle(
        title=title,
        summary=_extract_summary(soup, title),
        url=url,
        published_at=published_at,
        content=_extract_content(soup),
    )


def _extract_article_urls(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    urls: list[str] = []

    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "")
        if DETAIL_MARKER not in href:
            continue

        absolute = _normalize_url(urljoin(LIST_URL, href))
        if absolute in seen:
            continue

        seen.add(absolute)
        urls.append(absolute)

    return urls


def _fetch_list_page(page: int, baseline_urls: list[str] | None = None) -> str:
    if page <= 1:
        return _fetch_html(LIST_URL)

    for candidate in _candidate_list_urls(page):
        html = _fetch_html(candidate)
        urls = _extract_article_urls(html)

        if urls and urls != (baseline_urls or []):
            return html

    return _fetch_html(LIST_URL)


def _candidate_list_urls(page: int) -> list[str]:
    parsed = urlparse(LIST_URL)
    base_query = parse_qs(parsed.query, keep_blank_values=True)
    candidates: list[str] = []

    for key in ("pageIndex", "page", "pageNo", "currentPage", "pageNum"):
        query = dict(base_query)
        query[key] = [str(page)]
        candidates.append(urlunparse(parsed._replace(query=urlencode(query, doseq=True))))

    return candidates


def _extract_title(soup: BeautifulSoup) -> str:
    meta = soup.find("meta", attrs={"property": "og:title"})
    if meta and meta.get("content"):
        return _clean_text(meta["content"])

    title = soup.find("h1")
    if title:
        text = title.get_text(" ", strip=True)
        if text:
            return _clean_text(text)

    title_tag = soup.find("title")
    if title_tag:
        return _clean_text(title_tag.get_text(" ", strip=True))

    return ""


def _extract_published_at(soup: BeautifulSoup) -> datetime:
    time_meta = soup.find("meta", attrs={"property": "article:published_time"})
    if time_meta and time_meta.get("content"):
        try:
            return _parse_datetime(time_meta["content"])
        except ValueError:
            pass

    text = soup.get_text(" ", strip=True)
    match = re.search(r"(\d{4}[.\-]\d{2}[.\-]\d{2})(?:[ T](\d{2}:\d{2}))?", text)
    if match:
        date_part = match.group(1).replace(".", "-")
        time_part = match.group(2) or "00:00"
        return datetime.fromisoformat(f"{date_part}T{time_part}:00").replace(tzinfo=SEOUL)

    return datetime.now(tz=SEOUL)


def _extract_summary(soup: BeautifulSoup, title: str) -> str | None:
    candidates = [
        element.get_text(" ", strip=True)
        for element in soup.find_all(["p", "strong", "li"])
        if element.get_text(" ", strip=True)
    ]
    for candidate in candidates:
        if candidate != title and len(candidate) > 20:
            return candidate[:240]
    return None


def _extract_content(soup: BeautifulSoup) -> str | None:
    article_root = soup.find("article")
    if article_root:
        text = article_root.get_text("\n", strip=True)
    else:
        text = soup.get_text("\n", strip=True)

    cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return cleaned[:5000] if cleaned else None


def _upsert_article(article: CollectedArticle, *, force: bool) -> str:
    published_date = article.published_at.date().isoformat()
    published_at = article.published_at.isoformat()

    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id, title, summary, published_at, content
            FROM news_articles
            WHERE url = ?
            """,
            (article.url,),
        ).fetchone()

        if existing is not None:
            if (
                not force
                and existing["title"] == article.title
                and existing["summary"] == article.summary
                and existing["published_at"] == published_at
                and existing["content"] == article.content
            ):
                return "skipped"

            connection.execute(
                """
                UPDATE news_articles
                SET source_name = ?,
                    title = ?,
                    summary = ?,
                    published_at = ?,
                    published_date = ?,
                    content = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (
                    SOURCE_NAME,
                    article.title,
                    article.summary,
                    published_at,
                    published_date,
                    article.content,
                    existing["id"],
                ),
            )
            connection.commit()
            return "updated"

        connection.execute(
            """
            INSERT INTO news_articles (
              source_code,
              source_name,
              title,
              summary,
              url,
              published_at,
              published_date,
              published_month,
              content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "policy",
                SOURCE_NAME,
                article.title,
                article.summary,
                article.url,
                published_at,
                published_date,
                article.published_at.strftime("%Y-%m"),
                article.content,
            ),
        )
        connection.commit()
        return "inserted"


def _create_collect_run(started_at: datetime, target_date: date, run_mode: NewsRunMode) -> int:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO news_collect_runs (
              started_at,
              status,
              sources,
              target_date,
              run_mode
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                started_at.isoformat(),
                "running",
                json.dumps(["policy"], ensure_ascii=False),
                target_date.isoformat(),
                run_mode,
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)


def _finish_collect_run(
    *,
    run_id: int,
    status: str,
    ended_at: datetime,
    collected: int,
    inserted: int,
    updated: int,
    skipped: int,
    failed: int,
    error_message: str | None = None,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE news_collect_runs
            SET ended_at = ?,
                status = ?,
                collected_count = ?,
                inserted_count = ?,
                updated_count = ?,
                skipped_count = ?,
                failed_count = ?,
                error_message = ?
            WHERE id = ?
            """,
            (
                ended_at.isoformat(),
                status,
                collected,
                inserted,
                updated,
                skipped,
                failed,
                error_message,
                run_id,
            ),
        )
        connection.commit()


def _fetch_html(url: str) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
            )
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace")
    except URLError as error:
        raise RuntimeError(f"HTML 수집 실패: {url}") from error


def _clean_text(text: str) -> str:
    cleaned = " ".join(text.split())
    if " - " in cleaned:
        cleaned = cleaned.split(" - ", 1)[0]
    return cleaned


def _parse_datetime(raw_value: str) -> datetime:
    cleaned = raw_value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=SEOUL)
    return parsed.astimezone(SEOUL)


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)
    rebuilt = urlunparse(parsed._replace(query=urlencode(query, doseq=True)))
    return rebuilt


def _format_time_label(value: datetime) -> str:
    return value.astimezone(SEOUL).strftime("%H:%M")
