from fastapi import APIRouter, status

from app.schemas.schedules import TeamMemberCreate, TeamMemberListResponse, TeamMemberResponse, TeamMemberUpdate
from app.services import team_members

router = APIRouter(prefix="/team-members", tags=["team-members"])


@router.get("", response_model=TeamMemberListResponse)
def list_team_members() -> dict[str, list[dict[str, object]]]:
    return {"items": team_members.list_team_members()}


@router.post("", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def create_team_member(payload: TeamMemberCreate) -> dict[str, object]:
    return team_members.create_team_member(payload)


@router.patch("/{member_id}", response_model=TeamMemberResponse)
def update_team_member(member_id: int, payload: TeamMemberUpdate) -> dict[str, object]:
    return team_members.update_team_member(member_id, payload)


@router.delete("/{member_id}")
def delete_team_member(member_id: int) -> dict[str, str]:
    return team_members.delete_team_member(member_id)
