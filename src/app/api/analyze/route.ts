import { NextRequest, NextResponse } from "next/server";
import { analyzeData } from "@/lib/analyzer";
import { getLineScores } from "@/lib/sentiment";
import type { ScoredReview } from "@/lib/types";

export const dynamic = "force-dynamic";
// 홈 서버에서 느린 Naver API 호출을 충분히 기다리기 위한 타임아웃 설정
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url || url.trim() === "") {
    return NextResponse.json(
      { error: "url 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeData(url.trim());

    // 부정 리뷰에 줄별 점수 정보를 추가하여 프론트엔드에서 색상 강조 렌더링
    const negativeReviews = result.negativeReviews.map(
      (review: ScoredReview) => ({
        ...review,
        lines: getLineScores(review.body ?? ""),
      }),
    );

    return NextResponse.json({ ...result, negativeReviews });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.";

    const status =
      message.includes("429") || message.includes("차단") ? 429 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
