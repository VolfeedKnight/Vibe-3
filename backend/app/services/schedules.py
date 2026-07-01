import sqlite3
from datetime import date, time

from fastapi import HTTPException, status

from app.db.database import get_connection
from app.schemas.schedules import ScheduleCreate, ScheduleType, ScheduleUpdate
from app.services.team_members import ensure_active_team_member


def list_schedules(
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    team_member_id: int | None = None,
    schedule_type: ScheduleType | None = None,
) -> list[dict[str, object]]:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="조회 종료일은 시작일보다 빠를 수 없습니다.",
        )

    filters: list[str] = []
    values: list[object] = []

    if start_date is not None and end_date is not None:
        filters.append("s.start_date <= ? AND s.end_date >= ?")
        values.extend([end_date.isoformat(), start_date.isoformat()])
    elif start_date is not None:
        filters.append("s.end_date >= ?")
        values.append(start_date.isoformat())
    elif end_date is not None:
        filters.append("s.start_date <= ?")
        values.append(end_date.isoformat())

    if team_member_id is not None:
        filters.append("s.team_member_id = ?")
        values.append(team_member_id)

    if schedule_type is not None:
        filters.append("s.type = ?")
        values.append(schedule_type)

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT
              s.id,
              s.team_member_id,
              s.type,
              s.title,
              s.start_date,
              s.end_date,
              s.start_time,
              s.end_time,
              s.location,
              s.memo,
              s.created_at,
              s.updated_at,
              tm.name AS member_name,
              tm.department AS member_department,
              tm.position AS member_position,
              tm.is_active AS member_is_active
            FROM schedules s
            JOIN team_members tm ON tm.id = s.team_member_id
            {where_clause}
            ORDER BY s.start_date ASC, s.start_time ASC, tm.name COLLATE NOCASE ASC, s.id ASC
            """,
            values,
        ).fetchall()

    return [_schedule_to_dict(row) for row in rows]


def create_schedule(payload: ScheduleCreate) -> dict[str, object]:
    ensure_active_team_member(payload.team_member_id)

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO schedules (
              team_member_id,
              type,
              title,
              start_date,
              end_date,
              start_time,
              end_time,
              location,
              memo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.team_member_id,
                payload.type,
                payload.title,
                payload.start_date.isoformat(),
                payload.end_date.isoformat(),
                _time_to_storage(payload.start_time),
                _time_to_storage(payload.end_time),
                payload.location,
                payload.memo,
            ),
        )
        connection.commit()

    return get_schedule(cursor.lastrowid)


def get_schedule(schedule_id: int) -> dict[str, object]:
    row = _get_schedule_row(schedule_id)
    return _schedule_to_dict(row)


def update_schedule(schedule_id: int, payload: ScheduleUpdate) -> dict[str, object]:
    current = _get_schedule_row(schedule_id)
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        return _schedule_to_dict(current)

    if (
        "team_member_id" in updates
        and updates["team_member_id"] is not None
        and updates["team_member_id"] != current["team_member_id"]
    ):
        ensure_active_team_member(updates["team_member_id"])

    _validate_schedule_update(current, updates)

    assignments = [f"{field} = ?" for field in updates]
    values = [_to_storage_value(value) for value in updates.values()]

    with get_connection() as connection:
        connection.execute(
            f"""
            UPDATE schedules
            SET {", ".join(assignments)}, updated_at = datetime('now')
            WHERE id = ?
            """,
            (*values, schedule_id),
        )
        connection.commit()

    return get_schedule(schedule_id)


def delete_schedule(schedule_id: int) -> dict[str, str]:
    _get_schedule_row(schedule_id)

    with get_connection() as connection:
        connection.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        connection.commit()

    return {"status": "ok", "message": "일정을 삭제했습니다."}


def _get_schedule_row(schedule_id: int) -> sqlite3.Row:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
              s.id,
              s.team_member_id,
              s.type,
              s.title,
              s.start_date,
              s.end_date,
              s.start_time,
              s.end_time,
              s.location,
              s.memo,
              s.created_at,
              s.updated_at,
              tm.name AS member_name,
              tm.department AS member_department,
              tm.position AS member_position,
              tm.is_active AS member_is_active
            FROM schedules s
            JOIN team_members tm ON tm.id = s.team_member_id
            WHERE s.id = ?
            """,
            (schedule_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="일정을 찾을 수 없습니다.",
        )

    return row


def _validate_schedule_update(current: sqlite3.Row, updates: dict[str, object]) -> None:
    start_date = updates.get("start_date", date.fromisoformat(current["start_date"]))
    end_date = updates.get("end_date", date.fromisoformat(current["end_date"]))
    start_time = updates.get("start_time", _parse_optional_time(current["start_time"]))
    end_time = updates.get("end_time", _parse_optional_time(current["end_time"]))

    if not isinstance(start_date, date) or not isinstance(end_date, date):
        return

    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="종료일은 시작일보다 빠를 수 없습니다.",
        )

    if (
        start_date == end_date
        and isinstance(start_time, time)
        and isinstance(end_time, time)
        and end_time < start_time
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="같은 날짜의 종료 시간은 시작 시간보다 빠를 수 없습니다.",
        )


def _schedule_to_dict(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "teamMemberId": row["team_member_id"],
        "type": row["type"],
        "title": row["title"],
        "startDate": row["start_date"],
        "endDate": row["end_date"],
        "startTime": row["start_time"],
        "endTime": row["end_time"],
        "location": row["location"],
        "memo": row["memo"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "member": {
            "id": row["team_member_id"],
            "name": row["member_name"],
            "department": row["member_department"],
            "position": row["member_position"],
            "isActive": bool(row["member_is_active"]),
        },
    }


def _to_storage_value(value: object) -> object:
    if isinstance(value, date) and not isinstance(value, time):
        return value.isoformat()

    if isinstance(value, time):
        return _time_to_storage(value)

    return value


def _time_to_storage(value: time | None) -> str | None:
    return value.strftime("%H:%M") if value is not None else None


def _parse_optional_time(value: str | None) -> time | None:
    if value is None:
        return None

    return time.fromisoformat(value)
