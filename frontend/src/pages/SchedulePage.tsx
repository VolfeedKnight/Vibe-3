import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createSchedule,
  createTeamMember,
  deleteSchedule,
  deleteTeamMember,
  getSchedules,
  getTeamMembers,
  updateSchedule,
  updateTeamMember,
} from "../shared/api/client";
import type { Schedule, SchedulePayload, ScheduleType, TeamMember, TeamMemberPayload } from "../shared/api/types";

type ViewMode = "week" | "month";
type ScheduleTypeFilter = ScheduleType | "all";

type MemberForm = {
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
};

type ScheduleForm = {
  teamMemberId: string;
  type: ScheduleType;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  memo: string;
};

const scheduleTypeLabels: Record<ScheduleType, string> = {
  vacation: "휴가",
  work: "근무",
  business_trip: "출장",
  other: "기타",
};

const emptyMemberForm: MemberForm = {
  name: "",
  department: "",
  position: "",
  email: "",
  phone: "",
};

function createEmptyScheduleForm(baseDate: string): ScheduleForm {
  return {
    teamMemberId: "",
    type: "vacation",
    title: "",
    startDate: baseDate,
    endDate: baseDate,
    startTime: "",
    endTime: "",
    location: "",
    memo: "",
  };
}

export function SchedulePage({ onBack }: { onBack: () => void }) {
  const today = formatDateValue(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(() => createEmptyScheduleForm(today));
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [selectedType, setSelectedType] = useState<ScheduleTypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleRange = getVisibleRange(anchorDate, viewMode);
  const rangeLabel =
    viewMode === "week"
      ? `${formatDisplayDate(visibleRange.start)} - ${formatDisplayDate(visibleRange.end)}`
      : formatMonthTitle(anchorDate);

  async function refreshMembers() {
    const response = await getTeamMembers();
    setMembers(response.items);

    if (!scheduleForm.teamMemberId && response.items[0]) {
      setScheduleForm((current) => ({
        ...current,
        teamMemberId: String(response.items[0].id),
      }));
    }
  }

  async function refreshSchedules() {
    const range = getVisibleRange(anchorDate, viewMode);
    const response = await getSchedules({
      startDate: formatDateValue(range.start),
      endDate: formatDateValue(range.end),
      teamMemberId: selectedMemberId === "all" ? undefined : Number(selectedMemberId),
      type: selectedType === "all" ? undefined : selectedType,
    });
    setSchedules(response.items);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      setError(null);

      try {
        const [memberResponse, scheduleResponse] = await Promise.all([
          getTeamMembers(),
          getSchedules({
            startDate: formatDateValue(visibleRange.start),
            endDate: formatDateValue(visibleRange.end),
          }),
        ]);

        if (isMounted) {
          setMembers(memberResponse.items);
          setSchedules(scheduleResponse.items);

          if (memberResponse.items[0]) {
            setScheduleForm((current) => ({
              ...current,
              teamMemberId: current.teamMemberId || String(memberResponse.items[0].id),
            }));
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedules() {
      setLoading(true);
      setError(null);

      try {
        const range = getVisibleRange(anchorDate, viewMode);
        const response = await getSchedules({
          startDate: formatDateValue(range.start),
          endDate: formatDateValue(range.end),
          teamMemberId: selectedMemberId === "all" ? undefined : Number(selectedMemberId),
          type: selectedType === "all" ? undefined : selectedType,
        });

        if (isMounted) {
          setSchedules(response.items);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSchedules();

    return () => {
      isMounted = false;
    };
  }, [anchorDate, selectedMemberId, selectedType, viewMode]);

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = normalizeMemberPayload(memberForm);

      if (editingMemberId === null) {
        await createTeamMember(payload);
        setNotice("팀원을 등록했습니다.");
      } else {
        await updateTeamMember(editingMemberId, payload);
        setNotice("팀원 정보를 수정했습니다.");
      }

      setMemberForm(emptyMemberForm);
      setEditingMemberId(null);
      await refreshMembers();
      await refreshSchedules();
    } catch (submitError) {
      setError(getMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function handleMemberDelete(member: TeamMember) {
    if (!window.confirm(`${member.name} 팀원을 삭제하시겠습니까? 기존 일정은 유지됩니다.`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await deleteTeamMember(member.id);
      setNotice("팀원을 삭제했습니다.");

      if (editingMemberId === member.id) {
        setEditingMemberId(null);
        setMemberForm(emptyMemberForm);
      }

      if (selectedMemberId === String(member.id)) {
        setSelectedMemberId("all");
      }

      await refreshMembers();
      await refreshSchedules();
    } catch (deleteError) {
      setError(getMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  async function handleScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (!scheduleForm.teamMemberId) {
        throw new Error("일정을 등록할 팀원을 선택하세요.");
      }

      const payload = normalizeSchedulePayload(scheduleForm);

      if (editingScheduleId === null) {
        await createSchedule(payload);
        setNotice("일정을 등록했습니다.");
      } else {
        await updateSchedule(editingScheduleId, payload);
        setNotice("일정을 수정했습니다.");
      }

      setScheduleForm(createEmptyScheduleForm(today));
      setEditingScheduleId(null);
      await refreshSchedules();
    } catch (submitError) {
      setError(getMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function handleScheduleDelete(schedule: Schedule) {
    if (!window.confirm(`${schedule.title} 일정을 삭제하시겠습니까?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await deleteSchedule(schedule.id);
      setNotice("일정을 삭제했습니다.");

      if (editingScheduleId === schedule.id) {
        setEditingScheduleId(null);
        setScheduleForm(createEmptyScheduleForm(today));
      }

      await refreshSchedules();
    } catch (deleteError) {
      setError(getMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  function handleMemberEdit(member: TeamMember) {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      department: member.department ?? "",
      position: member.position ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
    });
  }

  function handleScheduleEdit(schedule: Schedule) {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      teamMemberId: String(schedule.teamMemberId),
      type: schedule.type,
      title: schedule.title,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime ?? "",
      endTime: schedule.endTime ?? "",
      location: schedule.location ?? "",
      memo: schedule.memo ?? "",
    });
  }

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) => (viewMode === "week" ? addDays(current, direction * 7) : addMonths(current, direction)));
  }

  return (
    <main className="schedule-shell">
      <section className="schedule-hero">
        <div>
          <p className="eyebrow">Team Schedule Calendar</p>
          <h1>팀원 일정 공유 캘린더</h1>
          <p className="hero-description">휴가, 근무, 출장 일정을 팀 기준으로 등록하고 주간/월간 뷰에서 확인합니다.</p>
        </div>
        <button className="ghost-button" type="button" onClick={onBack}>
          대시보드로
        </button>
      </section>

      <section className="schedule-toolbar" aria-label="일정 조회 조건">
        <div className="segmented-control">
          <button className={viewMode === "week" ? "active" : ""} type="button" onClick={() => setViewMode("week")}>
            주간 리스트
          </button>
          <button className={viewMode === "month" ? "active" : ""} type="button" onClick={() => setViewMode("month")}>
            월간 캘린더
          </button>
        </div>

        <div className="period-control">
          <button type="button" onClick={() => movePeriod(-1)}>
            이전
          </button>
          <strong>{rangeLabel}</strong>
          <button type="button" onClick={() => movePeriod(1)}>
            다음
          </button>
          <button type="button" onClick={() => setAnchorDate(new Date())}>
            오늘
          </button>
        </div>

        <label>
          팀원
          <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
            <option value="all">전체</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          유형
          <select value={selectedType} onChange={(event) => setSelectedType(event.target.value as ScheduleTypeFilter)}>
            <option value="all">전체</option>
            {Object.entries(scheduleTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="feedback error-text">{error}</p> : null}
      {notice ? <p className="feedback success-text">{notice}</p> : null}

      <section className="schedule-layout">
        <aside className="management-panel">
          <section className="panel-card">
            <div className="panel-heading">
              <h2>팀원 관리</h2>
              {editingMemberId === null ? null : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMemberId(null);
                    setMemberForm(emptyMemberForm);
                  }}
                >
                  등록 모드
                </button>
              )}
            </div>

            <form className="stack-form" onSubmit={handleMemberSubmit}>
              <label>
                이름 *
                <input
                  required
                  value={memberForm.name}
                  onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                부서
                <input
                  value={memberForm.department}
                  onChange={(event) => setMemberForm((current) => ({ ...current, department: event.target.value }))}
                />
              </label>
              <label>
                직급/역할
                <input
                  value={memberForm.position}
                  onChange={(event) => setMemberForm((current) => ({ ...current, position: event.target.value }))}
                />
              </label>
              <label>
                이메일
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                전화번호
                <input
                  value={memberForm.phone}
                  onChange={(event) => setMemberForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <button className="primary-button" disabled={saving} type="submit">
                {editingMemberId === null ? "팀원 등록" : "팀원 수정"}
              </button>
            </form>

            <div className="member-list" aria-label="등록된 팀원">
              {members.length === 0 ? <p className="empty-text">등록된 팀원이 없습니다.</p> : null}
              {members.map((member) => (
                <article className="member-item" key={member.id}>
                  <div>
                    <strong>{member.name}</strong>
                    <span>
                      {[member.department, member.position].filter(Boolean).join(" / ") || "소속 정보 없음"}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => handleMemberEdit(member)}>
                      수정
                    </button>
                    <button type="button" onClick={() => void handleMemberDelete(member)}>
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="calendar-panel">
          <section className="panel-card">
            <div className="panel-heading">
              <h2>{editingScheduleId === null ? "일정 등록" : "일정 수정"}</h2>
              {editingScheduleId === null ? null : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingScheduleId(null);
                    setScheduleForm(createEmptyScheduleForm(today));
                  }}
                >
                  등록 모드
                </button>
              )}
            </div>

            <form className="schedule-form" onSubmit={handleScheduleSubmit}>
              <label>
                팀원 *
                <select
                  required
                  value={scheduleForm.teamMemberId}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, teamMemberId: event.target.value }))}
                >
                  <option value="">선택</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                유형 *
                <select
                  value={scheduleForm.type}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, type: event.target.value as ScheduleType }))}
                >
                  {Object.entries(scheduleTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide-field">
                제목 *
                <input
                  required
                  value={scheduleForm.title}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                시작일 *
                <input
                  required
                  type="date"
                  value={scheduleForm.startDate}
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                      endDate: current.endDate < event.target.value ? event.target.value : current.endDate,
                    }))
                  }
                />
              </label>
              <label>
                종료일 *
                <input
                  required
                  type="date"
                  value={scheduleForm.endDate}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </label>
              <label>
                시작시간
                <input
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
              <label>
                종료시간
                <input
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
              <label>
                장소
                <input
                  value={scheduleForm.location}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))}
                />
              </label>
              <label className="wide-field">
                메모
                <textarea
                  rows={3}
                  value={scheduleForm.memo}
                  onChange={(event) => setScheduleForm((current) => ({ ...current, memo: event.target.value }))}
                />
              </label>
              <button className="primary-button wide-field" disabled={saving || members.length === 0} type="submit">
                {editingScheduleId === null ? "일정 등록" : "일정 수정"}
              </button>
            </form>
          </section>

          <section className="panel-card calendar-card" aria-busy={loading}>
            <div className="panel-heading">
              <h2>{viewMode === "week" ? "주간 리스트" : "월간 캘린더"}</h2>
              <span className="muted-text">{loading ? "불러오는 중" : `${schedules.length}개 일정`}</span>
            </div>

            {viewMode === "week" ? (
              <WeekList schedules={schedules} anchorDate={anchorDate} onEdit={handleScheduleEdit} onDelete={handleScheduleDelete} />
            ) : (
              <MonthCalendar
                schedules={schedules}
                anchorDate={anchorDate}
                onEdit={handleScheduleEdit}
                onDelete={handleScheduleDelete}
              />
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function WeekList({
  schedules,
  anchorDate,
  onEdit,
  onDelete,
}: {
  schedules: Schedule[];
  anchorDate: Date;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}) {
  return (
    <div className="week-list">
      {getWeekDays(anchorDate).map((day) => {
        const daySchedules = getSchedulesForDay(schedules, day);

        return (
          <article className="week-day" key={formatDateValue(day)}>
            <div className="day-heading">
              <strong>{formatDisplayDate(day)}</strong>
              <span>{daySchedules.length}개</span>
            </div>
            {daySchedules.length === 0 ? <p className="empty-text">등록된 일정 없음</p> : null}
            {daySchedules.map((schedule) => (
              <ScheduleItem key={schedule.id} schedule={schedule} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </article>
        );
      })}
    </div>
  );
}

function MonthCalendar({
  schedules,
  anchorDate,
  onEdit,
  onDelete,
}: {
  schedules: Schedule[];
  anchorDate: Date;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}) {
  return (
    <div className="month-calendar">
      {["월", "화", "수", "목", "금", "토", "일"].map((label) => (
        <strong className="weekday-label" key={label}>
          {label}
        </strong>
      ))}
      {getMonthGrid(anchorDate).map((day) => {
        const daySchedules = getSchedulesForDay(schedules, day);
        const visibleSchedules = daySchedules.slice(0, 3);
        const hiddenCount = daySchedules.length - visibleSchedules.length;

        return (
          <article className={`month-day ${isSameMonth(day, anchorDate) ? "" : "dimmed"}`} key={formatDateValue(day)}>
            <strong className="date-number">{day.getDate()}</strong>
            <div className="month-items">
              {visibleSchedules.map((schedule) => (
                <div className="month-chip-row" key={schedule.id}>
                  <button className={`month-chip type-${schedule.type}`} type="button" onClick={() => onEdit(schedule)}>
                    {schedule.member.name} · {schedule.title}
                  </button>
                  <button className="chip-delete" type="button" onClick={() => void onDelete(schedule)}>
                    삭제
                  </button>
                </div>
              ))}
              {hiddenCount > 0 ? <span className="more-count">+{hiddenCount}개</span> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ScheduleItem({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}) {
  return (
    <article className={`schedule-item type-${schedule.type}`}>
      <div>
        <span className={`type-badge type-${schedule.type}`}>{scheduleTypeLabels[schedule.type]}</span>
        <strong>{schedule.title}</strong>
        <p>
          {schedule.member.name} · {formatSchedulePeriod(schedule)}
          {schedule.location ? ` · ${schedule.location}` : ""}
        </p>
        {schedule.memo ? <small>{schedule.memo}</small> : null}
      </div>
      <div className="row-actions">
        <button type="button" onClick={() => onEdit(schedule)}>
          수정
        </button>
        <button type="button" onClick={() => void onDelete(schedule)}>
          삭제
        </button>
      </div>
    </article>
  );
}

function normalizeMemberPayload(form: MemberForm): TeamMemberPayload {
  return {
    name: form.name,
    department: emptyToNull(form.department),
    position: emptyToNull(form.position),
    email: emptyToNull(form.email),
    phone: emptyToNull(form.phone),
  };
}

function normalizeSchedulePayload(form: ScheduleForm): SchedulePayload {
  return {
    teamMemberId: Number(form.teamMemberId),
    type: form.type,
    title: form.title,
    startDate: form.startDate,
    endDate: form.endDate,
    startTime: emptyToNull(form.startTime),
    endTime: emptyToNull(form.endTime),
    location: emptyToNull(form.location),
    memo: emptyToNull(form.memo),
  };
}

function emptyToNull(value: string): string | null {
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
}

function getVisibleRange(anchorDate: Date, viewMode: ViewMode): { start: Date; end: Date } {
  if (viewMode === "week") {
    return {
      start: getWeekStart(anchorDate),
      end: getWeekEnd(anchorDate),
    };
  }

  return {
    start: getWeekStart(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)),
    end: getWeekEnd(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)),
  };
}

function getWeekDays(anchorDate: Date): Date[] {
  const start = getWeekStart(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthGrid(anchorDate: Date): Date[] {
  const range = getVisibleRange(anchorDate, "month");
  const days: Date[] = [];
  let current = range.start;

  while (current <= range.end) {
    days.push(current);
    current = addDays(current, 1);
  }

  return days;
}

function getSchedulesForDay(schedules: Schedule[], day: Date): Schedule[] {
  const value = formatDateValue(day);
  return schedules.filter((schedule) => schedule.startDate <= value && schedule.endDate >= value);
}

function getWeekStart(date: Date): Date {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(normalized, diff);
}

function getWeekEnd(date: Date): Date {
  return addDays(getWeekStart(date), 6);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameMonth(day: Date, anchorDate: Date): boolean {
  return day.getFullYear() === anchorDate.getFullYear() && day.getMonth() === anchorDate.getMonth();
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatMonthTitle(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatSchedulePeriod(schedule: Schedule): string {
  const datePart =
    schedule.startDate === schedule.endDate ? schedule.startDate : `${schedule.startDate} - ${schedule.endDate}`;
  const timePart =
    schedule.startTime || schedule.endTime ? ` ${schedule.startTime ?? "시작시간 없음"} - ${schedule.endTime ?? "종료시간 없음"}` : "";

  return `${datePart}${timePart}`;
}
