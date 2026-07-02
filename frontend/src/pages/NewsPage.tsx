import { useEffect, useMemo, useState } from "react";
import { collectNewsArticles, getLatestNewsRun, getNewsArticles, getRecentNewsRuns } from "../shared/api/client";
import type { NewsArticle, NewsCollectResponse, NewsRunResponse } from "../shared/api/types";

type NewsPageProps = {
  onBack: () => void;
};

export function NewsPage({ onBack }: NewsPageProps) {
  const [selectedDate, setSelectedDate] = useState(() => formatDateInput(getYesterday()));
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [recentRuns, setRecentRuns] = useState<NewsRunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastCollect, setLastCollect] = useState<NewsCollectResponse | null>(null);
  const [latestRun, setLatestRun] = useState<NewsRunResponse | null>(null);

  const articleCount = articles.length;
  const formattedDate = useMemo(() => formatHumanDate(selectedDate), [selectedDate]);

  useEffect(() => {
    let isMounted = true;

    async function loadArticles() {
      setLoading(true);
      setError(null);

      try {
        const [articleResponse, runResponse, recentRunResponse] = await Promise.all([
          getNewsArticles(selectedDate),
          getLatestNewsRun(),
          getRecentNewsRuns(5),
        ]);

        if (isMounted) {
          setArticles(articleResponse.items);
          setLatestRun(runResponse);
          setRecentRuns(recentRunResponse.items);
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

    void loadArticles();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  async function handleCollect() {
    setCollecting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await collectNewsArticles({
        targetDate: selectedDate,
      });

      setLastCollect(response);
      setNotice(
        `수집 완료: 신규 ${response.inserted}건, 갱신 ${response.updated}건, 건너뜀 ${response.skipped}건, 실패 ${response.failed}건`,
      );

      const [articleResponse, runResponse, recentRunResponse] = await Promise.all([
        getNewsArticles(selectedDate),
        getLatestNewsRun(),
        getRecentNewsRuns(5),
      ]);

      setArticles(articleResponse.items);
      setLatestRun(runResponse);
      setRecentRuns(recentRunResponse.items);
    } catch (collectError) {
      setError(getMessage(collectError));
    } finally {
      setCollecting(false);
    }
  }

  return (
    <main className="news-shell">
      <section className="news-hero">
        <div>
          <p className="eyebrow">News Collector</p>
          <h1>대한민국 정책브리핑 뉴스 수집</h1>
          <p className="hero-description">
            매일 오전 9시에 전날 데이터를 자동 수집하고, 원하는 날짜를 선택해 수동으로 다시 수집할 수 있습니다.
          </p>
        </div>

        <button className="ghost-button" type="button" onClick={onBack}>
          대시보드로
        </button>
      </section>

      <section className="news-toolbar" aria-label="뉴스 수집 및 날짜 선택">
        <label>
          날짜 선택
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>

        <button className="primary-button" type="button" disabled={collecting} onClick={() => void handleCollect()}>
          {collecting ? "수집 중..." : "선택 날짜 수집"}
        </button>

        <button className="ghost-button" type="button" onClick={() => setSelectedDate(formatDateInput(getYesterday()))}>
          전날로
        </button>
      </section>

      <section className="news-summary-grid">
        <article className="card">
          <h2>선택 날짜</h2>
          <p>{formattedDate}</p>
        </article>
        <article className="card">
          <h2>표시 기사</h2>
          <p>{loading ? "불러오는 중" : `${articleCount}건`}</p>
        </article>
        <article className="card">
          <h2>최근 자동 수집</h2>
          <p>{latestRun ? formatRunSummary(latestRun) : "수집 이력 없음"}</p>
        </article>
        <article className="card">
          <h2>최근 수동 수집</h2>
          <p>
            {lastCollect
              ? `신규 ${lastCollect.inserted} / 갱신 ${lastCollect.updated} / 건너뜀 ${lastCollect.skipped}`
              : "수집 이력 없음"}
          </p>
        </article>
      </section>

      {error ? <p className="feedback error-text">{error}</p> : null}
      {notice ? <p className="feedback success-text">{notice}</p> : null}

      <section className="news-board">
        <div className="panel-heading">
          <h2>선택 날짜 기사</h2>
          <span className="muted-text">{loading ? "목록을 불러오는 중" : `${articles.length}개 기사`}</span>
        </div>

        {loading ? <p className="empty-text">뉴스를 불러오는 중입니다.</p> : null}
        {!loading && articles.length === 0 ? <p className="empty-text">선택한 날짜의 뉴스가 없습니다.</p> : null}

        <div className="news-list">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="news-board">
        <div className="panel-heading">
          <h2>최근 수집 로그</h2>
          <span className="muted-text">최근 5건</span>
        </div>

        {recentRuns.length === 0 ? <p className="empty-text">수집 로그가 없습니다.</p> : null}

        <div className="news-list">
          {recentRuns.map((run) => (
            <article className="news-card" key={run.id}>
              <div className="news-card-main">
                <div className="news-card-meta">
                  <span className={`news-source ${run.status === "failed" ? "error" : ""}`}>
                    {run.runMode === "scheduled" ? "자동 수집" : "수동 수집"}
                  </span>
                  <span className="news-date">{run.targetDate}</span>
                </div>
                <h3>
                  {run.status === "failed" ? "실패" : "성공"} - {formatRunSummary(run)}
                </h3>
                {run.errorMessage ? <p>{run.errorMessage}</p> : <p>기사 {run.collectedCount}건</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="news-card">
      <div className="news-card-main">
        <div className="news-card-meta">
          <span className="news-source">{article.sourceName}</span>
          <span className="news-date">
            {article.publishedDate} {article.publishedTime}
          </span>
        </div>
        <h3 title={article.title}>{article.title}</h3>
        {article.summary ? <p>{article.summary}</p> : null}
      </div>
      <div className="news-card-actions">
        <a href={article.url} rel="noreferrer" target="_blank">
          원문 보기
        </a>
      </div>
    </article>
  );
}

function getYesterday(): Date {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  return value;
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHumanDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
  }).format(new Date(value));
}

function formatRunSummary(run: NewsRunResponse): string {
  const timestamp = new Date(run.endedAt ?? run.startedAt);
  const formattedTime = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
  return `${formattedTime} / ${run.collectedCount}건`;
}

function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : "뉴스 처리 중 오류가 발생했습니다.";
}
