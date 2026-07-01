import sqlite3

from fastapi import HTTPException, status

from app.db.database import get_connection
from app.schemas.schedules import TeamMemberCreate, TeamMemberUpdate


def list_team_members() -> list[dict[str, object]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, name, department, position, email, phone, is_active, created_at, updated_at
            FROM team_members
            WHERE is_active = 1
            ORDER BY name COLLATE NOCASE ASC
            """
        ).fetchall()

    return [_member_to_dict(row) for row in rows]


def create_team_member(payload: TeamMemberCreate) -> dict[str, object]:
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO team_members (name, department, position, email, phone)
                VALUES (?, ?, ?, ?, ?)
                """,
                (payload.name, payload.department, payload.position, payload.email, payload.phone),
            )
            connection.commit()
            return get_team_member(cursor.lastrowid, include_inactive=True)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 등록된 이메일입니다.",
        ) from exc


def get_team_member(member_id: int, *, include_inactive: bool = False) -> dict[str, object]:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, name, department, position, email, phone, is_active, created_at, updated_at
            FROM team_members
            WHERE id = ? AND (? = 1 OR is_active = 1)
            """,
            (member_id, 1 if include_inactive else 0),
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀원을 찾을 수 없습니다.",
        )

    return _member_to_dict(row)


def update_team_member(member_id: int, payload: TeamMemberUpdate) -> dict[str, object]:
    get_team_member(member_id)
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        return get_team_member(member_id)

    assignments = [f"{field} = ?" for field in updates]
    values = list(updates.values())

    try:
        with get_connection() as connection:
            connection.execute(
                f"""
                UPDATE team_members
                SET {", ".join(assignments)}, updated_at = datetime('now')
                WHERE id = ?
                """,
                (*values, member_id),
            )
            connection.commit()
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 등록된 이메일입니다.",
        ) from exc

    return get_team_member(member_id)


def delete_team_member(member_id: int) -> dict[str, str]:
    get_team_member(member_id)

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE team_members
            SET is_active = 0, updated_at = datetime('now')
            WHERE id = ?
            """,
            (member_id,),
        )
        connection.commit()

    return {"status": "ok", "message": "팀원을 비활성 처리했습니다."}


def ensure_active_team_member(member_id: int) -> None:
    get_team_member(member_id)


def _member_to_dict(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "name": row["name"],
        "department": row["department"],
        "position": row["position"],
        "email": row["email"],
        "phone": row["phone"],
        "isActive": bool(row["is_active"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }
