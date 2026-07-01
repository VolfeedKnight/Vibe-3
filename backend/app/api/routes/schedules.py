from datetime import date

from fastapi import APIRouter, Query, status

from app.schemas.schedules import ScheduleCreate, ScheduleListResponse, ScheduleResponse, ScheduleType, ScheduleUpdate
from app.services import schedules

router = APIRouter()


@router.get("", response_model=ScheduleListResponse)
def list_schedules(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    team_member_id: int | None = Query(default=None),
    type: ScheduleType | None = Query(default=None),
) -> dict[str, list[dict[str, object]]]:
    return {
        "items": schedules.list_schedules(
            start_date=start_date,
            end_date=end_date,
            team_member_id=team_member_id,
            schedule_type=type,
        )
    }


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(payload: ScheduleCreate) -> dict[str, object]:
    return schedules.create_schedule(payload)


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: int) -> dict[str, object]:
    return schedules.get_schedule(schedule_id)


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(schedule_id: int, payload: ScheduleUpdate) -> dict[str, object]:
    return schedules.update_schedule(schedule_id, payload)


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int) -> dict[str, str]:
    return schedules.delete_schedule(schedule_id)
