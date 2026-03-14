import axios from "axios";
import { getSentenceScores, highlightNegativeLines } from "./sentiment";
import { makeBar } from "./utils";
import type { AnalysisResult, ReviewItem, ScoredReview } from "./types";

const DIVIDER = "=========================================";

function printReviewItem(
  item: ReviewItem,
  label = "",
  highlight = false,
): void {
  const star = item.rating != null ? `⭐${item.rating} ` : "";
  const who = item.author?.nickname ? `[${item.author.nickname}] ` : "";
  const date = item.visited ? `(${item.visited}) ` : "";
  const keywords = item.votedKeywords?.map((k) => k.name).join(", ");
  const body = item.body?.trim() ?? "";
  const displayBody = highlight ? highlightNegativeLines(body) : body;

  console.log(`\n  ${label}${star}${who}${date}`);
  if (keywords) console.log(`  🏷 ${keywords}`);
  console.log(`  "${displayBody}"`);
}

function printStats(result: AnalysisResult): void {
  const { stats } = result;
  const { review, analysis } = stats;

  console.log(`\n📊 기본 통계`);
  console.log(
    `  방문자 리뷰: ${(stats.visitorReviewsTotal ?? review.totalCount ?? 0).toLocaleString()}개`,
  );
  if (stats.ratingReviewsTotal) {
    console.log(
      `  별점 리뷰:   ${stats.ratingReviewsTotal.toLocaleString()}개`,
    );
  }
  if (review.avgRating) {
    const stars = "⭐".repeat(Math.round(review.avgRating));
    console.log(`  평균 별점:   ${review.avgRating.toFixed(1)} ${stars}`);
  }

  if (review.starDistribution && review.starDistribution.length > 0) {
    console.log(`\n⭐ 별점 분포`);
    const dist = [...review.starDistribution].sort((a, b) => b.score - a.score);
    const maxCount = Math.max(...dist.map((d) => d.count));
    dist.forEach((d) => {
      const bar = makeBar(d.count, maxCount, 15);
      console.log(
        `  ${d.score}점  ${d.count.toString().padStart(5)}개  ${bar}`,
      );
    });
  }

  const themes = analysis.themes ?? [];
  if (themes.length > 0) {
    console.log(`\n🏷️  방문자 언급 테마`);
    const sorted = [...themes].sort((a, b) => b.count - a.count).slice(0, 10);
    const maxCount = sorted[0]?.count ?? 1;
    sorted.forEach((t, i) => {
      const bar = makeBar(t.count, maxCount);
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${t.label.padEnd(8)} ${t.count.toString().padStart(4)}명  ${bar}`,
      );
    });
  }

  const voted = analysis.votedKeyword;
  if (voted?.details && voted.details.length > 0) {
    console.log(
      `\n👍 방문자 투표 키워드 (총 ${(voted.totalCount ?? 0).toLocaleString()}표)`,
    );
    const sorted = [...voted.details]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const maxCount = sorted[0]?.count ?? 1;
    sorted.forEach((k, i) => {
      const bar = makeBar(k.count, maxCount);
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${k.displayName.padEnd(12)} ${k.count.toString().padStart(4)}명  ${bar}`,
      );
    });
  }

  const menus = analysis.menus ?? [];
  if (menus.length > 0) {
    console.log(`\n🍽️  많이 언급된 메뉴`);
    const sorted = [...menus].sort((a, b) => b.count - a.count).slice(0, 8);
    const maxCount = sorted[0]?.count ?? 1;
    sorted.forEach((m, i) => {
      const bar = makeBar(m.count, maxCount);
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${m.label.padEnd(12)} ${m.count.toString().padStart(4)}건  ${bar}`,
      );
    });
  }
}

function printRecentReviews(reviews: ReviewItem[]): void {
  if (reviews.length === 0) return;
  console.log(`\n💬 최근 리뷰`);
  reviews.forEach((item) => {
    if (item.body) printReviewItem(item);
  });
}

function printNegativeReviews(
  scored: ScoredReview[],
  totalScanned: number,
): void {
  console.log(`\n⚠️  아쉬운 리뷰 (${totalScanned}개 중 부정 표현 감지)`);
  if (scored.length === 0) {
    console.log(
      `\n  최근 ${totalScanned}개 리뷰에서 부정적 표현이 감지되지 않았습니다.`,
    );
    console.log(`  대부분 긍정적인 리뷰로 구성되어 있습니다.`);
  } else {
    scored.forEach((item, i) => {
      printReviewItem(item, `#${i + 1} [부정점수: ${item.negScore}] `, true);

      // 어떤 문장이 왜 점수가 났는지 채점 내역 출력
      const breakdown = getSentenceScores(item.body ?? "");
      if (breakdown.length > 0) {
        console.log(`  📋 채점 내역:`);
        breakdown.forEach(({ sentence, score, triggered }) => {
          const preview =
            sentence.length > 40 ? sentence.slice(0, 40) + "…" : sentence;
          console.log(
            `     • "${preview}" → ${triggered.join(", ")} → ${score}점`,
          );
        });
      }
    });
  }
}

/** 전체 분석 결과를 콘솔에 출력한다. */
export function printReport(result: AnalysisResult): void {
  const placeName = result.stats.name ?? `장소 ID: ${result.placeId}`;

  console.log(`\n✅ [${placeName}] 분석 결과`);
  console.log(DIVIDER);

  printStats(result);
  printRecentReviews(result.recentReviews);

  console.log(
    `\n⏳ 부정적 리뷰 탐색 중 (최근 ${result.totalScanned}개 스캔)...`,
  );
  printNegativeReviews(result.negativeReviews, result.totalScanned);

  console.log(`\n${DIVIDER}`);
  console.log(`분석 완료.`);
}

/** 에러 메시지를 포맷에 맞게 출력한다. */
export function printError(err: unknown): void {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 429) {
      console.log(
        "\n❌ 네이버 서버에서 차단되었습니다 (429 Too Many Requests).",
      );
      console.log("\n🔧 해결 방법:");
      console.log("  1. 브라우저에서 map.naver.com 접속 후 로그인");
      console.log("  2. 개발자 도구(F12) → Network 탭 → 아무 요청 클릭");
      console.log("  3. Request Headers에서 cookie 값 전체 복사");
      console.log("  4. 아래처럼 실행:");
      console.log(
        '     NAVER_COOKIE="복사한_쿠키값" npx tsx src/index.ts <장소ID>',
      );
    } else {
      console.log(`\n❌ 에러 발생: ${err.message}`);
      if (err.response) {
        console.log(`   상태 코드: ${err.response.status}`);
        const data = err.response.data as
          | Array<{ errors?: Array<{ message: string }> }>
          | undefined;
        const detail = data?.[0]?.errors?.[0]?.message;
        if (detail) console.log(`   상세: ${detail}`);
      }
    }
  } else if (err instanceof Error) {
    console.log(`\n❌ 에러 발생: ${err.message}`);
  } else {
    console.log("\n❌ 알 수 없는 에러:", err);
  }
}
