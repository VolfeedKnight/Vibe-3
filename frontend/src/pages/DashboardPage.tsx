import { featureCards } from "../features/featureCards";
import type { HealthResponse, StatusResponse } from "../shared/api/types";

type DashboardPageProps = {
  connection: {
    backend?: HealthResponse;
    database?: HealthResponse;
    status?: StatusResponse;
    error?: string;
  };
};

export function DashboardPage({ connection }: DashboardPageProps) {
  const backendState = getBadgeState(connection.backend, connection.error);
  const databaseState = getBadgeState(connection.database, connection.error);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Public Administration Super App</p>
        <h1>공공직군 행정업무를 한 화면에서 처리하는 슈퍼앱</h1>
        <p className="hero-description">
          팀원 스케쥴, 엑셀 업무 자동화, 민원 대응 챗봇, 공공행정 뉴스 수집을
          하나의 업무 허브로 묶기 위한 초기 스케폴드입니다.
        </p>

        <section className="status-grid" aria-label="연동 상태">
          <StatusCard
            title="FE-BE 연동"
            description={connection.error ?? connection.backend?.message ?? "백엔드 상태 확인 중"}
            state={backendState}
          />
          <StatusCard
            title="BE-DB 연동"
            description={connection.database?.message ?? "SQLite 상태 확인 중"}
            state={databaseState}
          />
          <StatusCard
            title="API 모듈"
            description={
              connection.status
                ? `${connection.status.modules.length}개 모듈 라우팅 준비`
                : "모듈 상태 확인 중"
            }
            state={connection.status ? "ok" : connection.error ? "error" : "waiting"}
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
