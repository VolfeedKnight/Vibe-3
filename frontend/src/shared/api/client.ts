import type {
  HealthResponse,
  ListResponse,
  NewsArticlesResponse,
  NewsCollectRequest,
  NewsCollectResponse,
  NewsRunListResponse,
  NewsRunResponse,
  Schedule,
  SchedulePayload,
  ScheduleType,
  StatusResponse,
  TeamMember,
  TeamMemberPayload,
} from "./types";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

type ScheduleQuery = {
  startDate: string;
  endDate: string;
  teamMemberId?: number;
  type?: ScheduleType;
};

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, path));
  }

  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };

    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    return `${path} 요청 실패: ${response.status}`;
  }

  return `${path} 요청 실패: ${response.status}`;
}

export function getBackendHealth() {
  return requestJson<HealthResponse>("/health");
}

export function getDatabaseHealth() {
  return requestJson<HealthResponse>("/api/db/health");
}

export function getSystemStatus() {
  return requestJson<StatusResponse>("/api/status");
}

export function getTeamMembers() {
  return requestJson<ListResponse<TeamMember>>("/api/team-members");
}

export function createTeamMember(payload: TeamMemberPayload) {
  return requestJson<TeamMember>("/api/team-members", {
    method: "POST",
    body: payload,
  });
}

export function updateTeamMember(memberId: number, payload: TeamMemberPayload) {
  return requestJson<TeamMember>(`/api/team-members/${memberId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteTeamMember(memberId: number) {
  return requestJson<{ status: string; message: string }>(`/api/team-members/${memberId}`, {
    method: "DELETE",
  });
}

export function getSchedules(query: ScheduleQuery) {
  const params = new URLSearchParams({
    start_date: query.startDate,
    end_date: query.endDate,
  });

  if (query.teamMemberId !== undefined) {
    params.set("team_member_id", String(query.teamMemberId));
  }

  if (query.type !== undefined) {
    params.set("type", query.type);
  }

  return requestJson<ListResponse<Schedule>>(`/api/schedules?${params.toString()}`);
}

export function createSchedule(payload: SchedulePayload) {
  return requestJson<Schedule>("/api/schedules", {
    method: "POST",
    body: payload,
  });
}

export function updateSchedule(scheduleId: number, payload: SchedulePayload) {
  return requestJson<Schedule>(`/api/schedules/${scheduleId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteSchedule(scheduleId: number) {
  return requestJson<{ status: string; message: string }>(`/api/schedules/${scheduleId}`, {
    method: "DELETE",
  });
}

export function collectNewsArticles(payload: NewsCollectRequest = {}) {
  return requestJson<NewsCollectResponse>("/api/news/collect", {
    method: "POST",
    body: payload,
  });
}

export function getNewsArticles(targetDate?: string) {
  const params = new URLSearchParams();

  if (targetDate) {
    params.set("date", targetDate);
  }

  const query = params.toString();
  return requestJson<NewsArticlesResponse>(query ? `/api/news/articles?${query}` : "/api/news/articles");
}

export function getLatestNewsRun() {
  return requestJson<NewsRunResponse | null>("/api/news/runs/latest");
}

export function getRecentNewsRuns(limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  return requestJson<NewsRunListResponse>(`/api/news/runs?${params.toString()}`);
}
