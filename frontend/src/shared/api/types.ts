export type HealthResponse = {
  status: "ok";
  service: string;
  message: string;
};

export type StatusResponse = {
  app: string;
  modules: string[];
};

export type ScheduleType = "vacation" | "work" | "business_trip" | "other";

export type TeamMember = {
  id: number;
  name: string;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TeamMemberPayload = {
  name: string;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ScheduleMember = {
  id: number;
  name: string;
  department: string | null;
  position: string | null;
  isActive: boolean;
};

export type Schedule = {
  id: number;
  teamMemberId: number;
  type: ScheduleType;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  member: ScheduleMember;
};

export type SchedulePayload = {
  teamMemberId: number;
  type: ScheduleType;
  title: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  memo?: string | null;
};

export type ListResponse<T> = {
  items: T[];
};

export type NewsCollectRequest = {
  targetDate?: string;
  force?: boolean;
};

export type NewsCollectResponse = {
  status: string;
  targetDate: string;
  runMode: "manual" | "scheduled";
  collected: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  collectedAt: string;
};

export type NewsArticle = {
  id: number;
  sourceName: string;
  title: string;
  summary: string | null;
  url: string;
  publishedAt: string;
  publishedDate: string;
  content: string | null;
  publishedTime: string;
};

export type NewsArticlesResponse = {
  items: NewsArticle[];
  targetDate: string;
  total: number;
};

export type NewsRunResponse = {
  id: number;
  targetDate: string;
  runMode: "manual" | "scheduled";
  status: string;
  startedAt: string;
  endedAt: string | null;
  collectedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage: string | null;
};

export type NewsRunListResponse = {
  items: NewsRunResponse[];
};
