from datetime import date, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ScheduleType = Literal["vacation", "work", "business_trip", "other"]


class TeamMemberBase(BaseModel):
    name: str
    department: str | None = None
    position: str | None = None
    email: str | None = None
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("팀원명은 필수입니다.")
        return cleaned

    @field_validator("department", "position", "email", "phone")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None


class TeamMemberCreate(TeamMemberBase):
    pass


class TeamMemberUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    position: str | None = None
    email: str | None = None
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        if not cleaned:
            raise ValueError("팀원명은 공백일 수 없습니다.")
        return cleaned

    @field_validator("department", "position", "email", "phone")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None


class TeamMemberResponse(TeamMemberBase):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    is_active: bool = Field(alias="isActive")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")


class TeamMemberListResponse(BaseModel):
    items: list[TeamMemberResponse]


class ScheduleBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    team_member_id: int = Field(alias="teamMemberId")
    type: ScheduleType
    title: str
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    start_time: time | None = Field(default=None, alias="startTime")
    end_time: time | None = Field(default=None, alias="endTime")
    location: str | None = None
    memo: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("일정 제목은 필수입니다.")
        return cleaned

    @field_validator("location", "memo")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def validate_date_range(self) -> "ScheduleBase":
        if self.end_date < self.start_date:
            raise ValueError("종료일은 시작일보다 빠를 수 없습니다.")

        if (
            self.start_date == self.end_date
            and self.start_time is not None
            and self.end_time is not None
            and self.end_time < self.start_time
        ):
            raise ValueError("같은 날짜의 종료 시간은 시작 시간보다 빠를 수 없습니다.")

        return self


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    team_member_id: int | None = Field(default=None, alias="teamMemberId")
    type: ScheduleType | None = None
    title: str | None = None
    start_date: date | None = Field(default=None, alias="startDate")
    end_date: date | None = Field(default=None, alias="endDate")
    start_time: time | None = Field(default=None, alias="startTime")
    end_time: time | None = Field(default=None, alias="endTime")
    location: str | None = None
    memo: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        if not cleaned:
            raise ValueError("일정 제목은 공백일 수 없습니다.")
        return cleaned

    @field_validator("location", "memo")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None


class ScheduleMemberResponse(BaseModel):
    id: int
    name: str
    department: str | None = None
    position: str | None = None
    is_active: bool = Field(alias="isActive")


class ScheduleResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    team_member_id: int = Field(alias="teamMemberId")
    type: ScheduleType
    title: str
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    start_time: time | None = Field(alias="startTime")
    end_time: time | None = Field(alias="endTime")
    location: str | None = None
    memo: str | None = None
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    member: ScheduleMemberResponse


class ScheduleListResponse(BaseModel):
    items: list[ScheduleResponse]
