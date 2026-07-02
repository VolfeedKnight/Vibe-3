import { featureCards } from "../features/featureCards";
import type { HealthResponse, NewsRunResponse, StatusResponse } from "../shared/api/types";

type DashboardPageProps = {
  connection: {
    backend?: HealthResponse;
    database?: HealthResponse;
    status?: StatusResponse;
    latestNewsRun?: NewsRunResponse | null;
    error?: string;
  };
  onOpenSchedules: () => void;
  onOpenNews: () => void;
};

export function DashboardPage({ connection, onOpenSchedules, onOpenNews }: DashboardPageProps) {
  const backendState = getBadgeState(connection.backend, connection.error);
  const databaseState = getBadgeState(connection.database, connection.error);
  const newsState = connection.latestNewsRun ? (connection.latestNewsRun.status === "failed" ? "error" : "ok") : "waiting";

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Public Administration Super App</p>
        <h1>공공행정 업무를 한 화면에서 처리하는 포털</h1>
        <p className="hero-description">
          일정, 문서, 민원, 뉴스 수집을 하나의 도구 안에서 관리하는 내부 업무 포털입니다.
        </p>

        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onOpenSchedules}>
            일정 관리 시작
          </button>
          <button className="ghost-button" type="button" onClick={onOpenNews}>
            뉴스 수집 열기
          </button>
        </div>

        <section className="status-grid" aria-label="연결 상태">
          <StatusCard
            title="FE-BE 연결"
            description={connection.error ?? connection.backend?.message ?? "백엔드 상태 확인 중"}
            state={backendState}
          />
          <StatusCard
            title="BE-DB 연결"
            description={connection.database?.message ?? "SQLite 상태 확인 중"}
            state={databaseState}
          />
          <StatusCard
            title="API 모듈"
            description={
              connection.status
                ? `${connection.status.modules.length}개 모듈 준비 완료`
                : "모듈 상태 확인 중"
            }
            state={connection.status ? "ok" : connection.error ? "error" : "waiting"}
          />
          <StatusCard
            title="뉴스 수집"
            description={
              connection.latestNewsRun
                ? `${connection.latestNewsRun.targetDate} / ${formatRunLabel(connection.latestNewsRun)}`
                : "뉴스 수집 이력 없음"
            }
            state={newsState}
          />
        </section>

        <section className="feature-grid" aria-label="주요 기능">
          {featureCards.map((feature) => (
            <article className="card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="badge waiting">{feature.status}</span>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

type BadgeState = "ok" | "waiting" | "error";

function StatusCard({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: BadgeState;
}) {
  const label = state === "ok" ? "정상" : state === "error" ? "실패" : "확인 중";

  return (
    <article className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      <span className={`badge ${state}`}>{label}</span>
    </article>
  );
}

function getBadgeState(response?: HealthResponse, error?: string): BadgeState {
  if (error) {
    return "error";
  }

  if (response?.status === "ok") {
    return "ok";
  }

  return "waiting";
}

function formatRunLabel(run: NewsRunResponse): string {
  const timestamp = new Date(run.endedAt ?? run.startedAt);
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
