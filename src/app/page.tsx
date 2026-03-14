"use client";

import { useState, useRef } from "react";

// ─── API 응답 타입 정의 ───────────────────────────────────────────────────────

interface StarDist {
  score: number;
  count: number;
}
interface Theme {
  code: string;
  label: string;
  count: number;
}
interface Menu {
  code: string;
  label: string;
  count: number;
}
interface VotedKeywordDetail {
  displayName: string;
  count: number;
}
interface ReviewSummary {
  avgRating: number | null;
  totalCount: number;
  starDistribution: StarDist[] | null;
}
interface Analysis {
  themes: Theme[];
  menus: Menu[];
  votedKeyword: { totalCount: number; details: VotedKeywordDetail[] } | null;
}
interface Stats {
  name: string | null;
  review: ReviewSummary;
  analysis: Analysis;
  visitorReviewsTotal: number;
  ratingReviewsTotal: number | null;
}
interface ReviewItem {
  cursor: string;
  rating: number | null;
  body: string | null;
  author: { nickname: string } | null;
  visited: string | null;
  votedKeywords: { name: string }[] | null;
}
interface LineScore {
  text: string;
  score: number;
}
interface NegativeReview extends ReviewItem {
  negScore: number;
  lines: LineScore[];
}
interface ApiResult {
  placeId: string;
  stats: Stats;
  recentReviews: ReviewItem[];
  negativeReviews: NegativeReview[];
  totalScanned: number;
}

// ─── 유틸리티 컴포넌트 ────────────────────────────────────────────────────────

function StarBadge({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold text-sm">
      ★ {rating}
    </span>
  );
}

function BarRow({
  label,
  count,
  max,
  accent = "bg-[#03c75a]",
}: {
  label: string;
  count: number;
  max: number;
  accent?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-right text-sm text-gray-600 shrink-0">
        {label}
      </span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${accent} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 text-sm text-gray-500 shrink-0">
        {count.toLocaleString()}개
      </span>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <h2 className="text-base font-bold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── 리뷰 아이템 ─────────────────────────────────────────────────────────────

function ReviewCard({ item }: { item: ReviewItem }) {
  const [expanded, setExpanded] = useState(false);
  const body = item.body?.trim() ?? "";
  const isLong = body.length > 150;

  return (
    <div className="border-b border-gray-50 last:border-0 py-4">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {item.rating != null && <StarBadge rating={item.rating} />}
        {item.author?.nickname && (
          <span className="text-sm font-medium text-gray-700">
            {item.author.nickname}
          </span>
        )}
        {item.visited && (
          <span className="text-xs text-gray-400">{item.visited}</span>
        )}
      </div>
      {item.votedKeywords && item.votedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.votedKeywords.map((k) => (
            <span
              key={k.name}
              className="text-xs px-2 py-0.5 bg-[#e8faf0] text-[#02a44a] rounded-full"
            >
              {k.name}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {isLong && !expanded ? body.slice(0, 150) + "…" : body}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-[#03c75a] hover:underline"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}

// ─── 부정 리뷰 아이템 ────────────────────────────────────────────────────────

function NegativeReviewCard({
  item,
  rank,
}: {
  item: NegativeReview;
  rank: number;
}) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white bg-gray-400 rounded-full w-5 h-5 flex items-center justify-center">
            {rank}
          </span>
          {item.rating != null && <StarBadge rating={item.rating} />}
          {item.author?.nickname && (
            <span className="text-sm font-medium text-gray-700">
              {item.author.nickname}
            </span>
          )}
          {item.visited && (
            <span className="text-xs text-gray-400">{item.visited}</span>
          )}
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
          부정점수 {item.negScore}
        </span>
      </div>

      {/* 키워드 태그 */}
      {item.votedKeywords && item.votedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.votedKeywords.map((k) => (
            <span
              key={k.name}
              className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full"
            >
              {k.name}
            </span>
          ))}
        </div>
      )}

      {/* 본문 — 줄별 색상 강조 */}
      <div className="text-sm leading-relaxed space-y-0.5">
        {item.lines.map((line, i) => {
          if (!line.text.trim()) return <br key={i} />;
          if (line.score >= 8) {
            return (
              <span
                key={i}
                className="block px-1.5 py-0.5 rounded bg-red-50 text-red-700 border-l-2 border-red-400"
              >
                {line.text}
              </span>
            );
          }
          if (line.score > 0) {
            return (
              <span
                key={i}
                className="block px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border-l-2 border-amber-400"
              >
                {line.text}
              </span>
            );
          }
          return (
            <span key={i} className="block text-gray-700">
              {line.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── 로딩 스피너 ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-gray-500">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#03c75a] rounded-full animate-spin" />
      <p className="text-sm">
        리뷰를 수집하고 분석하는 중입니다…
        <br />
        <span className="text-xs text-gray-400">네이버 API 특성상 10~20초 소요될 수 있습니다</span>
      </p>
    </div>
  );
}

// ─── 결과 섹션 ────────────────────────────────────────────────────────────────

function Results({ result }: { result: ApiResult }) {
  const { stats, recentReviews, negativeReviews, totalScanned } = result;
  const { review, analysis } = stats;

  const sortedDist = review.starDistribution
    ? [...review.starDistribution].sort((a, b) => b.score - a.score)
    : [];
  const maxDistCount = Math.max(...sortedDist.map((d) => d.count), 1);

  const topThemes = [...(analysis.themes ?? [])]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxThemeCount = Math.max(...topThemes.map((t) => t.count), 1);

  const topMenus = [...(analysis.menus ?? [])]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const votedKeywords = [...(analysis.votedKeyword?.details ?? [])]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxVotedCount = Math.max(...votedKeywords.map((k) => k.count), 1);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
      {/* 장소 헤더 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {stats.name ?? `장소 ID: ${result.placeId}`}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
          {review.avgRating != null && (
            <span className="flex items-center gap-1 text-amber-500 font-semibold">
              ★ {review.avgRating.toFixed(1)}
            </span>
          )}
          <span>방문자 리뷰 {stats.visitorReviewsTotal.toLocaleString()}개</span>
          {stats.ratingReviewsTotal != null && (
            <span>별점 리뷰 {stats.ratingReviewsTotal.toLocaleString()}개</span>
          )}
        </div>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 별점 분포 */}
        {sortedDist.length > 0 && (
          <Card title="⭐ 별점 분포">
            <div className="space-y-2">
              {sortedDist.map((d) => (
                <BarRow
                  key={d.score}
                  label={`${d.score}점`}
                  count={d.count}
                  max={maxDistCount}
                />
              ))}
            </div>
          </Card>
        )}

        {/* 투표 키워드 */}
        {votedKeywords.length > 0 && (
          <Card
            title={`👍 방문자 투표 키워드 (총 ${(analysis.votedKeyword?.totalCount ?? 0).toLocaleString()}표)`}
          >
            <div className="space-y-2">
              {votedKeywords.map((k) => (
                <BarRow
                  key={k.displayName}
                  label={k.displayName}
                  count={k.count}
                  max={maxVotedCount}
                  accent="bg-blue-400"
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 테마 & 메뉴 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topThemes.length > 0 && (
          <Card title="🏷️ 방문자 언급 테마">
            <div className="space-y-2">
              {topThemes.map((t) => (
                <BarRow
                  key={t.code}
                  label={t.label}
                  count={t.count}
                  max={maxThemeCount}
                  accent="bg-violet-400"
                />
              ))}
            </div>
          </Card>
        )}

        {topMenus.length > 0 && (
          <Card title="🍽️ 많이 언급된 메뉴">
            <div className="flex flex-wrap gap-2">
              {topMenus.map((m) => (
                <div
                  key={m.code}
                  className="px-3 py-1.5 bg-orange-50 rounded-xl text-sm"
                >
                  <span className="font-medium text-orange-800">{m.label}</span>
                  <span className="text-orange-400 ml-1.5 text-xs">
                    {m.count}건
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 최근 리뷰 */}
      {recentReviews.length > 0 && (
        <Card title={`💬 최근 리뷰 (${recentReviews.length}개)`}>
          <div>
            {recentReviews.map((item) => (
              <ReviewCard key={item.cursor} item={item} />
            ))}
          </div>
        </Card>
      )}

      {/* 아쉬운 리뷰 */}
      <Card
        title={`⚠️ 아쉬운 리뷰 — 최근 ${totalScanned}개 스캔`}
        className="border-red-100"
      >
        {negativeReviews.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            부정적 표현이 감지된 리뷰가 없습니다. 🎉
            <br />
            <span className="text-xs">대부분 긍정적인 리뷰로 구성되어 있습니다.</span>
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 mb-2">
              🟡 경미한 부정 (점수 1–7)&nbsp;&nbsp;
              🔴 강한 부정 (점수 8+)
            </p>
            {negativeReviews.map((item, i) => (
              <NegativeReviewCard key={item.cursor} item={item} rank={i + 1} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function Home() {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleAnalyze() {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/analyze?url=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "분석에 실패했습니다.");
      } else {
        setResult(data as ApiResult);
        setTimeout(
          () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
          100,
        );
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              네이버 리뷰 분석기
            </h1>
            <p className="text-xs text-gray-400">
              네이버 플레이스 링크를 붙여넣어 리뷰를 분석하세요
            </p>
          </div>
        </div>
      </header>

      {/* 검색 영역 */}
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleAnalyze()}
              placeholder="https://naver.me/... 또는 https://map.naver.com/... 또는 장소 ID"
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#03c75a] focus:border-transparent transition"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !inputUrl.trim()}
              className="px-6 py-2.5 bg-[#03c75a] hover:bg-[#02a44a] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              {loading ? "분석 중…" : "분석하기"}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <main className="flex-1 py-8">
        {loading && <Spinner />}

        {error && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <strong>오류:</strong> {error}
              {error.includes("429") && (
                <p className="mt-2 text-xs text-red-500">
                  서버에 NAVER_COOKIE 환경변수가 설정되어 있으면 더 안정적으로
                  사용할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="text-base font-medium text-gray-500 mb-1">
              네이버 플레이스 링크를 입력하면
            </p>
            <p className="text-sm">
              별점 분포, 키워드 통계, 아쉬운 리뷰를 한눈에 보여드립니다
            </p>
          </div>
        )}

        <div ref={resultsRef}>
          {result && <Results result={result} />}
        </div>
      </main>
    </div>
  );
}
