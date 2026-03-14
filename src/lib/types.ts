// ─── GraphQL 응답 타입 ────────────────────────────────────────────────────────

export interface StarDistribution {
  score: number;
  count: number;
}

export interface ReviewSummary {
  avgRating: number | null;
  totalCount: number;
  starDistribution: StarDistribution[] | null;
}

export interface Theme {
  code: string;
  label: string;
  count: number;
}

export interface Menu {
  code: string;
  label: string;
  count: number;
}

export interface VotedKeywordDetail {
  displayName: string;
  count: number;
}

export interface VotedKeyword {
  totalCount: number;
  details: VotedKeywordDetail[];
}

export interface Analysis {
  themes: Theme[];
  menus: Menu[];
  votedKeyword: VotedKeyword | null;
}

export interface VisitorReviewStats {
  id: string;
  name: string | null;
  review: ReviewSummary;
  analysis: Analysis;
  visitorReviewsTotal: number;
  ratingReviewsTotal: number | null;
}

// ─── 리뷰 아이템 타입 ─────────────────────────────────────────────────────────

export interface ReviewAuthor {
  nickname: string;
}

export interface VotedKeywordItem {
  name: string;
}

export interface ReviewItem {
  cursor: string;
  rating: number | null;
  body: string | null;
  author: ReviewAuthor | null;
  visited: string | null;
  votedKeywords: VotedKeywordItem[] | null;
}

export interface VisitorReviews {
  items: ReviewItem[];
  total: number;
}

// ─── 감성 분석 결과 타입 ───────────────────────────────────────────────────────

export interface ScoredReview extends ReviewItem {
  negScore: number;
}

// ─── 통합 분석 결과 타입 ───────────────────────────────────────────────────────

export interface AnalysisResult {
  placeId: string;
  stats: VisitorReviewStats;
  recentReviews: ReviewItem[];
  negativeReviews: ScoredReview[];
  totalScanned: number;
}
