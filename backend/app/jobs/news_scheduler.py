from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta, timezone

from app.services.news import get_latest_run, run_scheduled_news_collection

SEOUL = timezone(timedelta(hours=9))
_scheduler_started = False
_scheduler_lock = threading.Lock()


def start_news_scheduler() -> None:
    global _scheduler_started

    with _scheduler_lock:
        if _scheduler_started:
            return
        _scheduler_started = True

    thread = threading.Thread(target=_scheduler_loop, name="news-collector", daemon=True)
    thread.start()

    _run_catch_up_if_needed()


def _scheduler_loop() -> None:
    while True:
        sleep_seconds = _seconds_until_next_run()
        time.sleep(sleep_seconds)
        try:
            run_scheduled_news_collection()
        except Exception:
            # Leave retry to the next scheduled cycle.
            continue


def _run_catch_up_if_needed() -> None:
    now = _now()
    if now.hour < 9:
        return

    latest_run = get_latest_run()
    target_date = (now.date() - timedelta(days=1))

    if latest_run is not None and latest_run.targetDate >= target_date:
        return

    try:
        run_scheduled_news_collection()
    except Exception:
        pass


def _seconds_until_next_run() -> float:
    now = _now()
    next_run = now.replace(hour=9, minute=0, second=0, microsecond=0)

    if now >= next_run:
        next_run = next_run + timedelta(days=1)

    return max((next_run - now).total_seconds(), 1.0)


def _now() -> datetime:
    return datetime.now(tz=SEOUL)
