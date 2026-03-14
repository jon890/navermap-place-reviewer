import { MAX_NEGATIVE_RESULTS } from "./constants";
import { buildHeaders } from "./http";
import {
  fetchStats,
  fetchRecentReviews,
  fetchReviewsForScan,
} from "./fetcher";
import { extractNegativeReviews } from "./sentiment";
import { printReport, printError } from "./reporter";
import { extractPlaceId } from "./utils";
import type { AnalysisResult } from "./types";

/**
 * 네이버 플레이스 리뷰를 분석하고 AnalysisResult를 반환한다.
 * CLI와 웹 API 모두에서 사용된다.
 */
export async function analyzeData(target: string): Promise<AnalysisResult> {
  const placeId = extractPlaceId(target);
  const headers = buildHeaders(placeId);

  const [stats, recentReviewsData] = await Promise.all([
    fetchStats(placeId, headers),
    fetchRecentReviews(placeId, headers),
  ]);

  if (!stats) {
    throw new Error(
      "데이터를 가져오지 못했습니다. 장소 ID를 확인하거나 잠시 후 다시 시도해주세요.",
    );
  }

  const recentReviews = recentReviewsData?.items ?? [];
  const allReviews = recentReviewsData
    ? await fetchReviewsForScan(placeId, headers, recentReviewsData)
    : recentReviews;

  const negativeReviews = extractNegativeReviews(
    allReviews,
    MAX_NEGATIVE_RESULTS,
  );

  return {
    placeId,
    stats,
    recentReviews,
    negativeReviews,
    totalScanned: allReviews.length,
  };
}

/**
 * CLI용: 분석 결과를 콘솔에 출력한다.
 * @param target - 네이버 지도 URL 또는 장소 ID
 */
export async function analyze(target: string): Promise<void> {
  const placeId = extractPlaceId(target);

  console.log(`\n🔍 네이버 플레이스 [${placeId}] 분석 중...\n`);

  if (!process.env.NAVER_COOKIE) {
    console.log(
      "💡 팁: NAVER_COOKIE 환경변수를 설정하면 더 안정적으로 사용할 수 있습니다.",
    );
    console.log(
      '   방법: NAVER_COOKIE="쿠키값" npx tsx src/lib/index.ts <ID>\n',
    );
  }

  try {
    const result = await analyzeData(target);
    printReport(result);
  } catch (err) {
    printError(err);
  }
}
