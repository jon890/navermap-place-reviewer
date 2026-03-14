import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreReview, extractNegativeReviews } from "./sentiment";
import type { ReviewItem } from "./types";

// ─── scoreReview ──────────────────────────────────────────────────────────────

describe("scoreReview", () => {
  // ── 오탐 방지 (false positive) ──────────────────────────────────────────────

  it("긍정 맥락의 '냄새'는 부정으로 감지하지 않는다", () => {
    const body = "입장하자마자 빵냄새가 나는데 너무 좋아요😀 완전 이쁘네요";
    assert.equal(scoreReview(body), 0);
  });

  it("'아쉬울뿐'은 최소화 표현으로 부정으로 감지하지 않는다", () => {
    const body =
      "고사리 오일 파스타👏🏻 적당한 참기름 풍미와 고사리, 파스타가 너무 잘어울려요! " +
      "올데이 브런치로 다양한 메뉴가 있어서 너무 맛있게 잘 먹었습니다!! " +
      "친구들과 카페에서 빵을 먹고 방문한거여서 샌드위치를 못먹은 게 아쉬울뿐🥹~\n" +
      "망월천쪽 창가 분위기도 너무 좋구 차분한 분위기가 데이트하기 딱 좋을것 같아요ㅎㅎㅎ\n" +
      "주차는 가게 앞에 2대 정도 댈 수 있었고 일요일 저녁이었어서 여유가 있었어요!!";
    assert.equal(scoreReview(body), 0);
  });

  it("'아쉬울 뿐'(띄어쓰기 있는 형태)도 부정으로 감지하지 않는다", () => {
    assert.equal(
      scoreReview("음식은 다 맛있었는데 양이 적은 게 아쉬울 뿐이에요"),
      0,
    );
  });

  it("불편 언급이 있어도 같은 문장에서 긍정이 압도하면 0점이다", () => {
    const body =
      "최애카페로 남편은 대형카페를 선호하지만 여기만한 곳은 없는듯해요\n" +
      "너무 유명해져서 주차도 조금 불편해졌고 웨이팅도 있고 테이블수도 많아졌지만 뷰좋고 커피맛좋고 디저트와 브런치 메뉴도 다양한곳이에요\n" +
      "오전일찍이나 오후방문을 추천합니다";
    assert.equal(scoreReview(body), 0);
  });

  it("짧은 순수 긍정 리뷰는 0점이다", () => {
    assert.equal(scoreReview("분위기도 좋고 맛도 있어서 만족해요!"), 0);
    assert.equal(scoreReview("최고예요 강추합니다"), 0);
    assert.equal(scoreReview("또 올게요 너무 좋았어요"), 0);
  });

  // ── 실제 부정 감지 (true positive) ──────────────────────────────────────────

  it("가격 불만이 있는 리뷰는 양수 점수를 반환한다", () => {
    const body =
      "처음에 파스타 샐러드 쥬스 주문해서 먹었는데 맛있네요\n" +
      "가격이 41500원 나왔는데 비싼편이라 이정도 맛은 해야 되지 않나 싶네요\n" +
      "가격은 좀 비싸지만 맛은 만족 합니다";
    assert.ok(scoreReview(body) > 0, "가격 불만 리뷰는 score > 0 이어야 함");
  });

  it("강한 부정 리뷰는 높은 점수를 반환한다", () => {
    const body =
      "음식이 너무 짜다 서비스도 불친절하고 실망이에요 다시는 안올것 같아요";
    assert.ok(
      scoreReview(body) >= 10,
      "강한 부정 리뷰는 score >= 10 이어야 함",
    );
  });

  it("극단적 부정 표현은 가장 높은 점수를 반환한다", () => {
    const body = "최악이에요 다시는 안 옵니다";
    assert.ok(scoreReview(body) >= 10);
  });

  it("음식 품질 불만(차갑고 싱거움)은 부정으로 감지한다", () => {
    const body = "국물이 차갑고 너무 싱겁네요 아쉬웠어요";
    assert.ok(scoreReview(body) > 0);
  });

  it("부정 표현이 여러 문장에 걸쳐 있으면 합산된다", () => {
    const singleNeg = scoreReview("음식이 짜다");
    const doubleNeg = scoreReview("음식이 짜다\n서비스도 불친절해요");
    assert.ok(doubleNeg > singleNeg, "부정 문장이 많을수록 점수가 높아야 함");
  });

  // ── 경계 케이스 ─────────────────────────────────────────────────────────────

  it("빈 문자열은 0점이다", () => {
    assert.equal(scoreReview(""), 0);
  });

  it("부정 키워드를 포함하면 짧아도 scoreReview는 점수를 반환한다 (길이 필터는 extractNegativeReviews에서 적용)", () => {
    assert.ok(scoreReview("별로에요 음식이 짜다") > 0);
  });

  it("부정 키워드 없이 긍정만 있으면 0점이다", () => {
    assert.equal(
      scoreReview("정말 맛있어요! 또 오고 싶어요. 친절하고 깔끔했습니다."),
      0,
    );
  });
});

// ─── extractNegativeReviews ───────────────────────────────────────────────────

describe("extractNegativeReviews", () => {
  const makeReview = (body: string, cursor = "c1"): ReviewItem => ({
    cursor,
    rating: null,
    body,
    author: { nickname: "테스터" },
    visited: "3.1.토",
    votedKeywords: null,
  });

  it("부정 점수가 없는 리뷰는 결과에 포함되지 않는다", () => {
    const reviews = [
      makeReview("정말 맛있어요 또 올게요", "c1"),
      makeReview("분위기 좋고 서비스도 친절해요", "c2"),
    ];
    assert.equal(extractNegativeReviews(reviews, 5).length, 0);
  });

  it("부정 점수 내림차순으로 정렬된다", () => {
    const reviews = [
      makeReview("음식이 조금 아쉬웠어요 그냥 보통이에요", "c1"),
      makeReview("최악이에요 다시는 안 옵니다 진짜 실망이에요", "c2"),
      makeReview("가격이 비싼편이고 음식도 별로였어요", "c3"),
    ];
    const result = extractNegativeReviews(reviews, 5);
    assert.ok(result.length >= 2, "최소 2개 이상 감지되어야 함");
    for (let i = 0; i < result.length - 1; i++) {
      assert.ok(
        result[i]!.negScore >= result[i + 1]!.negScore,
        `result[${i}].negScore(${result[i]!.negScore}) >= result[${i + 1}].negScore(${result[i + 1]!.negScore})`,
      );
    }
  });

  it("topN 개수만큼만 반환한다", () => {
    const reviews = Array.from({ length: 10 }, (_, i) =>
      makeReview("정말 별로예요 실망이에요", `c${i}`),
    );
    assert.equal(extractNegativeReviews(reviews, 3).length, 3);
  });

  it("body가 null이거나 10자 미만인 리뷰는 제외한다", () => {
    const reviews = [
      makeReview("별로", "c1"),
      { ...makeReview("", "c2"), body: null },
    ];
    assert.equal(extractNegativeReviews(reviews, 5).length, 0);
  });

  it("결과에 negScore 필드가 포함된다", () => {
    const reviews = [
      makeReview("가격이 비싼편이고 음식이 짜다고 느꼈어요", "c1"),
    ];
    const result = extractNegativeReviews(reviews, 5);
    assert.ok(result.length > 0);
    assert.ok(typeof result[0]!.negScore === "number");
    assert.ok(result[0]!.negScore > 0);
  });
});
