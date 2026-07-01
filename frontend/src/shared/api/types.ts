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
