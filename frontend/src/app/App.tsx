import { useEffect, useState } from "react";
import { DashboardPage } from "../pages/DashboardPage";
import { getBackendHealth, getDatabaseHealth, getSystemStatus } from "../shared/api/client";
import type { HealthResponse, StatusResponse } from "../shared/api/types";

type ConnectionState = {
  backend?: HealthResponse;
  database?: HealthResponse;
  status?: StatusResponse;
  error?: string;
};

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({});

  useEffect(() => {
    let isMounted = true;

    async function verifyConnections() {
      try {
        const [backend, database, status] = await Promise.all([
          getBackendHealth(),
          getDatabaseHealth(),
          getSystemStatus(),
        ]);

        if (isMounted) {
          setConnection({ backend, database, status });
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

  return <DashboardPage connection={connection} />;
}
