type BackendConnectionCardProps = {
  activeUrl: string;
  draftUrl: string;
  status: "idle" | "testing" | "success" | "error";
  message: string | null;
  onDraftUrlChange: (value: string) => void;
  onSave: () => void;
  onTest: () => void;
};

export function BackendConnectionCard({
  activeUrl,
  draftUrl,
  status,
  message,
  onDraftUrlChange,
  onSave,
  onTest,
}: BackendConnectionCardProps) {
  const statusLabel =
    status === "success" ? "연결 성공" : status === "error" ? "연결 실패" : status === "testing" ? "연결 확인 중" : "대기 중";

  return (
    <section className="connection-card card" aria-label="백엔드 연결 설정">
      <div className="panel-heading">
        <div>
          <h2>백엔드 연결 설정</h2>
          <p className="muted-text">Cloudflare Tunnel, 로컬 개발 서버, 원격 API 주소를 직접 입력할 수 있습니다.</p>
        </div>
        <span className={`badge ${status === "error" ? "error" : status === "success" ? "ok" : "waiting"}`}>
          {statusLabel}
        </span>
      </div>

      <div className="connection-form">
        <label>
          백엔드 URL
          <input
            type="url"
            inputMode="url"
            placeholder="https://your-backend.example.com"
            value={draftUrl}
            onChange={(event) => onDraftUrlChange(event.target.value)}
          />
        </label>

        <div className="connection-actions">
          <button className="primary-button" type="button" onClick={onSave}>
            저장 후 적용
          </button>
          <button className="ghost-button" type="button" onClick={onTest}>
            연결 테스트
          </button>
        </div>
      </div>

      <p className="muted-text connection-current">
        현재 적용 URL: <code>{activeUrl || "미설정"}</code>
      </p>

      {message ? <p className={`feedback ${status === "error" ? "error-text" : "success-text"}`}>{message}</p> : null}
    </section>
  );
}
