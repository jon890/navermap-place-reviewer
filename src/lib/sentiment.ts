import {
  NEGATIVE_KEYWORDS,
  NEUTRALIZE_PATTERNS,
  POSITIVE_KEYWORDS,
} from "./constants";
import type { ReviewItem, ScoredReview } from "./types";

/**
 * 문자열 내에서 특정 단어의 등장 횟수를 센다.
 * (단순 includes 대신 중복 등장을 모두 반영)
 */
function countOccurrences(text: string, word: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(word, pos)) !== -1) {
    count++;
    pos += word.length;
  }
  return count;
}

/**
 * 문장 하나의 부정 점수를 계산한다.
 * - 최소화 표현(NEUTRALIZE_PATTERNS)을 먼저 제거하여 오탐 방지
 * - 부정 키워드 등장 횟수 × 점수 합산
 * - 같은 문장 내 긍정 키워드가 부정을 압도하면 0 반환 (긍정 맥락 오염 방지)
 */
export function scoreSentence(sentence: string): number {
  if (sentence.length < 4) return 0;

  // 최소화 관용구는 채점 대상에서 제거 ("아쉬울뿐" 등)
  let normalized = sentence;
  for (const pattern of NEUTRALIZE_PATTERNS) {
    normalized = normalized.split(pattern).join("");
  }

  let negScore = 0;
  let posScore = 0;

  for (const group of NEGATIVE_KEYWORDS) {
    for (const word of group.words) {
      negScore += countOccurrences(normalized, word) * group.score;
    }
  }

  // 부정 키워드가 없는 문장은 바로 0 반환 (불필요한 긍정 집계 생략)
  if (negScore === 0) return 0;

  for (const group of POSITIVE_KEYWORDS) {
    for (const word of group.words) {
      posScore += countOccurrences(normalized, word) * group.score;
    }
  }

  // 같은 문장에서 긍정이 부정을 압도하면 해당 문장은 중립 처리
  return Math.max(0, negScore - posScore);
}

/**
 * 리뷰 텍스트를 문장 단위로 분리한다.
 * 줄바꿈, 마침표, 느낌표, 물음표를 구분자로 사용.
 */
function splitSentences(body: string): string[] {
  return body
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

/**
 * 리뷰 텍스트의 부정 점수를 계산한다.
 * - 문장 단위로 분리해 각 문장을 독립 채점
 * - 긍정 문장이 많아도 부정 문장의 점수는 별도로 누적
 */
export function scoreReview(body: string): number {
  const sentences = splitSentences(body);
  return sentences.reduce((total, s) => total + scoreSentence(s), 0);
}

// ─── 채점 내역 ────────────────────────────────────────────────────────────────

export interface SentenceScore {
  sentence: string;
  score: number;
  /** 점수에 기여한 키워드 목록 (예: ["아쉬(4)", "불편(4)"]) */
  triggered: string[];
}

/**
 * 본문의 문장별 부정 채점 내역을 반환한다.
 * 점수가 0인 문장은 제외하고, 점수가 있는 문장과 기여 키워드만 포함한다.
 */
export function getSentenceScores(body: string): SentenceScore[] {
  return splitSentences(body)
    .map((sentence): SentenceScore => {
      const score = scoreSentence(sentence);
      const triggered: string[] = [];
      if (score > 0) {
        let normalized = sentence;
        for (const pattern of NEUTRALIZE_PATTERNS) {
          normalized = normalized.split(pattern).join("");
        }
        for (const group of NEGATIVE_KEYWORDS) {
          for (const word of group.words) {
            if (countOccurrences(normalized, word) > 0) {
              triggered.push(`${word}(${group.score}점)`);
            }
          }
        }
      }
      return { sentence, score, triggered };
    })
    .filter((s) => s.score > 0);
}

// ─── 줄별 점수 (API 응답용) ───────────────────────────────────────────────────

export interface LineScore {
  text: string;
  /** 해당 줄의 부정 점수 (0이면 중립/긍정) */
  score: number;
}

/**
 * 본문을 줄(\n) 단위로 분리하고 각 줄의 부정 점수를 계산해 반환한다.
 * ANSI 색상 대신 구조화된 데이터를 반환하여 프론트엔드에서 자유롭게 렌더링할 수 있다.
 */
export function getLineScores(body: string): LineScore[] {
  return body.split("\n").map((line) => {
    const score = line
      .split(/[.!?]/)
      .reduce((sum, seg) => sum + scoreSentence(seg.trim()), 0);
    return { text: line, score };
  });
}

// ─── 강조 표시 ────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m"; // 경미한 부정 (score 1~7)
const RED = "\x1b[31m"; // 강한 부정 (score 8+)

/**
 * 리뷰 본문에서 부정 점수가 있는 줄을 ANSI 색상으로 강조한 문자열을 반환한다.
 * - 줄(line) 단위로 스캔해 시각 구조를 유지한다
 * - score >= 8 → 빨간색, score 1~7 → 노란색
 */
export function highlightNegativeLines(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      // 한 줄 안에 여러 문장이 있을 수 있으므로 문장 구분자로 재분할
      const lineScore = line
        .split(/[.!?]/)
        .reduce((sum, seg) => sum + scoreSentence(seg.trim()), 0);

      if (lineScore >= 8) return `${RED}${line}${RESET}`;
      if (lineScore > 0) return `${YELLOW}${line}${RESET}`;
      return line;
    })
    .join("\n");
}

/**
 * 리뷰 목록에서 부정 점수 순으로 정렬된 상위 리뷰를 반환한다.
 * @param reviews - 전체 리뷰 목록
 * @param topN - 반환할 최대 리뷰 수
 */
export function extractNegativeReviews(
  reviews: ReviewItem[],
  topN: number,
): ScoredReview[] {
  return reviews
    .filter((item) => item.body && item.body.length > 10)
    .map((item) => ({ ...item, negScore: scoreReview(item.body!) }))
    .filter((item) => item.negScore > 0)
    .sort((a, b) => b.negScore - a.negScore)
    .slice(0, topN);
}
