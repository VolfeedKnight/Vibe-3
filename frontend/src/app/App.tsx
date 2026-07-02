import { useEffect, useState } from "react";
import { DashboardPage } from "../pages/DashboardPage";
import { NewsPage } from "../pages/NewsPage";
import { SchedulePage } from "../pages/SchedulePage";
import {
  getBackendHealth,
  getBackendHealthAt,
  getCurrentApiBaseUrl,
  getDatabaseHealth,
  getLatestNewsRun,
  getSystemStatus,
} from "../shared/api/client";
import type { HealthResponse, NewsRunResponse, StatusResponse } from "../shared/api/types";
import { normalizeApiBaseUrl, setApiBaseUrl } from "../shared/api/runtime";

type ConnectionState = {
  backend?: HealthResponse;
  database?: HealthResponse;
  status?: StatusResponse;
  latestNewsRun?: NewsRunResponse | null;
  error?: string;
};

type AppPage = "dashboard" | "schedules" | "news";
type BackendUrlTestStatus = "idle" | "testing" | "success" | "error";

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({});
  const [page, setPage] = useState<AppPage>("dashboard");
  const [backendUrl, setBackendUrl] = useState(() => getCurrentApiBaseUrl());
  const [backendUrlDraft, setBackendUrlDraft] = useState(() => getCurrentApiBaseUrl());
  const [backendUrlTestStatus, setBackendUrlTestStatus] = useState<BackendUrlTestStatus>("idle");
  const [backendUrlTestMessage, setBackendUrlTestMessage] = useState<string | null>(null);

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
            error: error instanceof Error ? error.message : "연결 상태 확인 실패",
          });
        }
      }
    }

    void verifyConnections();

    return () => {
      isMounted = false;
    };
  }, [backendUrl]);

  function applyBackendUrl(value: string) {
    const normalized = normalizeApiBaseUrl(value);

    if (!normalized) {
      setBackendUrlTestStatus("error");
      setBackendUrlTestMessage("백엔드 URL을 입력하세요.");
      return;
    }

    setApiBaseUrl(normalized);
    setBackendUrl(normalized);
    setBackendUrlDraft(normalized);
    setBackendUrlTestStatus("success");
    setBackendUrlTestMessage(`적용됨: ${normalized}`);
  }

  async function testBackendUrl() {
    const normalized = normalizeApiBaseUrl(backendUrlDraft);

    if (!normalized) {
      setBackendUrlTestStatus("error");
      setBackendUrlTestMessage("백엔드 URL을 입력하세요.");
      return;
    }

    setBackendUrlTestStatus("testing");
    setBackendUrlTestMessage("연결을 확인하는 중입니다...");

    try {
      const response = await getBackendHealthAt(normalized);
      setBackendUrlTestStatus("success");
      setBackendUrlTestMessage(`연결 성공: ${response.message}`);
    } catch (error) {
      setBackendUrlTestStatus("error");
      setBackendUrlTestMessage(error instanceof Error ? error.message : "연결 테스트 실패");
    }
  }

  if (page === "schedules") {
    return <SchedulePage onBack={() => setPage("dashboard")} />;
  }

  if (page === "news") {
    return <NewsPage onBack={() => setPage("dashboard")} />;
  }

  return (
    <DashboardPage
      connection={connection}
      backendUrl={backendUrl}
      backendUrlDraft={backendUrlDraft}
      backendUrlStatus={backendUrlTestStatus}
      backendUrlMessage={backendUrlTestMessage}
      onBackendUrlDraftChange={setBackendUrlDraft}
      onSaveBackendUrl={() => applyBackendUrl(backendUrlDraft)}
      onTestBackendUrl={() => void testBackendUrl()}
      onOpenSchedules={() => setPage("schedules")}
      onOpenNews={() => setPage("news")}
    />
  );
}
