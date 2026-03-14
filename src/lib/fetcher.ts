import axios from "axios";
import {
  GRAPHQL_URL,
  INITIAL_REVIEW_SIZE,
  BATCH_SIZE,
  NEGATIVE_SCAN_BATCHES,
  BATCH_DELAY_MS,
} from "./constants";
import { postWithRetry } from "./http";
import { GET_VISITOR_REVIEW_STATS, GET_VISITOR_REVIEWS } from "./queries";
import { sleep } from "./utils";
import type {
  ReviewItem,
  VisitorReviewStats,
  VisitorReviews,
} from "./types";

/** 장소 통계 (테마, 메뉴, 투표 키워드, 별점 분포 등) */
export async function fetchStats(
  placeId: string,
  headers: Record<string, string>,
): Promise<VisitorReviewStats | null> {
  const payload = [
    {
      operationName: "getVisitorReviewStats",
      variables: { id: placeId, itemId: "0", businessType: "restaurant" },
      query: GET_VISITOR_REVIEW_STATS,
    },
  ];
  const res = await postWithRetry(payload, headers);
  return (res.data[0]?.data?.visitorReviewStats as VisitorReviewStats) ?? null;
}

/** 최근 리뷰 첫 페이지 */
export async function fetchRecentReviews(
  placeId: string,
  headers: Record<string, string>,
  size = INITIAL_REVIEW_SIZE,
): Promise<VisitorReviews | null> {
  const payload = [
    {
      operationName: "getVisitorReviews",
      variables: {
        input: {
          businessId: placeId,
          businessType: "restaurant",
          item: "0",
          size,
          sort: "recent",
          includeContent: true,
          getUserStats: false,
          getReactions: false,
          getTrailer: false,
        },
      },
      query: GET_VISITOR_REVIEWS,
    },
  ];
  const res = await postWithRetry(payload, headers);
  return (res.data[0]?.data?.visitorReviews as VisitorReviews) ?? null;
}

/** cursor 기반 리뷰 배치 조회 */
async function fetchReviewsBatch(
  placeId: string,
  headers: Record<string, string>,
  size: number,
  after?: string,
): Promise<VisitorReviews | null> {
  const input: Record<string, unknown> = {
    businessId: placeId,
    businessType: "restaurant",
    item: "0",
    size,
    sort: "recent",
    includeContent: true,
    getUserStats: false,
    getReactions: false,
    getTrailer: false,
  };
  if (after) input.after = after;

  const payload = [
    {
      operationName: "getVisitorReviews",
      variables: { input },
      query: GET_VISITOR_REVIEWS,
    },
  ];

  const res = await axios.post(GRAPHQL_URL, payload, {
    headers,
    timeout: 10_000,
  });
  return (res.data[0]?.data?.visitorReviews as VisitorReviews) ?? null;
}

/**
 * 부정 리뷰 탐색을 위해 추가 배치를 누적하여 리뷰 목록을 확장한다.
 * @param initialReviews - 이미 가져온 첫 페이지 리뷰
 * @returns 초기 + 추가 배치를 합친 전체 리뷰 배열
 */
export async function fetchReviewsForScan(
  placeId: string,
  headers: Record<string, string>,
  initialReviews: VisitorReviews,
  batches = NEGATIVE_SCAN_BATCHES,
  batchSize = BATCH_SIZE,
): Promise<ReviewItem[]> {
  const allReviews: ReviewItem[] = [...initialReviews.items];
  let after = initialReviews.items.at(-1)?.cursor;

  for (let i = 0; i < batches && after; i++) {
    await sleep(BATCH_DELAY_MS);
    const batch = await fetchReviewsBatch(placeId, headers, batchSize, after);
    if (!batch?.items.length) break;
    allReviews.push(...batch.items);
    after = batch.items.at(-1)?.cursor;
  }

  return allReviews;
}
