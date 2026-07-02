import { useEffect, useState } from "react";
import { DashboardPage } from "../pages/DashboardPage";
import { NewsPage } from "../pages/NewsPage";
import { SchedulePage } from "../pages/SchedulePage";
import { getBackendHealth, getDatabaseHealth, getLatestNewsRun, getSystemStatus } from "../shared/api/client";
import type { HealthResponse, NewsRunResponse, StatusResponse } from "../shared/api/types";

type ConnectionState = {
  backend?: HealthResponse;
  database?: HealthResponse;
  status?: StatusResponse;
  latestNewsRun?: NewsRunResponse | null;
  error?: string;
};

type AppPage = "dashboard" | "schedules" | "news";

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({});
  const [page, setPage] = useState<AppPage>("dashboard");

  useEffect(() => {
    let isMounted = true;

    async function verifyConnections() {
      try {
        const [backend, database, status, latestNewsRun] = await Promise.all([
          getBackendHealth(),
          getDatabaseHealth(),
          getSystemStatus(),
          getLatestNewsRun(),
        ]);

        if (isMounted) {
          setConnection({ backend, database, status, latestNewsRun });
        }
      } catch (error) {
        if (isMounted) {
          setConnection({
            error: error instanceof Error ? error.message : "연동 확인 실패",
          });
        }
      }
    }

    void verifyConnections();

    return () => {
      isMounted = false;
    };
  }, []);

  if (page === "schedules") {
    return <SchedulePage onBack={() => setPage("dashboard")} />;
  }

  if (page === "news") {
    return <NewsPage onBack={() => setPage("dashboard")} />;
  }

  return (
    <DashboardPage
      connection={connection}
      onOpenSchedules={() => setPage("schedules")}
      onOpenNews={() => setPage("news")}
    />
  );
}
