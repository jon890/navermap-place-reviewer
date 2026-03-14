# Naver Place Review Analyzer — Agent Guide

## Project Overview

네이버 플레이스 리뷰를 분석하는 **Next.js 웹 애플리케이션**입니다.
네이버 내부 GraphQL API를 통해 장소 통계, 투표 키워드, 메뉴 언급, 최근 리뷰,
아쉬운 리뷰(감성 분석)를 분석하여 브라우저에 시각화합니다.

### Key Technologies

- **Framework:** Next.js 16+ (App Router, Turbopack)
- **Frontend:** React 19, Tailwind CSS v4
- **Backend:** Next.js API Routes (서버 사이드)
- **HTTP Client:** Axios (429 자동 재시도 포함)
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 18+
- **Test Runner:** Node.js 내장 `node:test` + tsx

---

## Directory Structure

```
src/
├── app/                        — Next.js App Router
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts        — GET /api/analyze?url= (분석 API 엔드포인트)
│   ├── layout.tsx              — 루트 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx                — 메인 UI (React 클라이언트 컴포넌트)
│   └── globals.css             — Tailwind + 글로벌 스타일
└── lib/                        — 비즈니스 로직 (프레임워크 독립)
    ├── types.ts                — GraphQL 응답 및 도메인 타입 정의
    ├── constants.ts            — API URL, 수집 설정, 감성 분석 키워드
    ├── utils.ts                — sleep, extractPlaceId, makeBar
    ├── http.ts                 — buildHeaders, postWithRetry (429 지수 백오프)
    ├── queries.ts              — GraphQL 쿼리 문자열 상수
    ├── fetcher.ts              — API 요청 함수들 (fetchStats, fetchRecentReviews, ...)
    ├── sentiment.ts            — 감성 분석 (scoreSentence, scoreReview, getLineScores, ...)
    ├── analyzer.ts             — analyzeData() + CLI용 analyze()
    ├── reporter.ts             — CLI 콘솔 출력 (ANSI 색상 강조)
    ├── index.ts                — CLI 진입점
    └── sentiment.test.ts       — 감성 분석 단위 테스트
```

---

## Key Commands

```bash
# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행 (홈 서버)
npm start

# CLI 모드 실행 (웹 없이 터미널 출력)
npm run cli <장소ID 또는 네이버 지도 URL>

# 단위 테스트
npm test
```

**예시:**

```bash
npm run dev
# → http://localhost:3000 에서 UI 접속

NAVER_COOKIE="NID_AUT=...;" npm run cli 1959570492
```

---

## Architecture

### 웹 앱 데이터 흐름

```
브라우저 (page.tsx)
  └─ GET /api/analyze?url=...
       └─ route.ts               (Next.js API Route)
            └─ analyzeData()     (analyzer.ts)
                 ├─ http.ts      (헤더 빌더, retry)
                 ├─ fetcher.ts   (GraphQL 요청)
                 │    └─ queries.ts
                 ├─ sentiment.ts (감성 분석 + getLineScores)
                 └─ types.ts     (AnalysisResult)
```

### CLI 데이터 흐름

```
index.ts → analyze() → analyzeData() + printReport()
```

---

## API Endpoint

**`GET /api/analyze?url=<네이버 URL 또는 장소 ID>`**

응답 형식:

```json
{
  "placeId": "1234567890",
  "stats": { "name": "...", "review": { ... }, "analysis": { ... } },
  "recentReviews": [ { "rating": 5, "body": "...", "author": { ... } } ],
  "negativeReviews": [
    {
      "negScore": 8,
      "lines": [ { "text": "음식이 식어 나와서 별로였어요", "score": 9 } ],
      ...
    }
  ],
  "totalScanned": 105
}
```

`negativeReviews[].lines`는 줄별 부정 점수가 포함되어 있어 프론트엔드에서
🟡 노란색(score 1–7) / 🔴 빨간색(score 8+) 으로 색상 강조 렌더링됩니다.

---

## Naver API Interaction

- **Endpoint:** `https://pcmap-api.place.naver.com/graphql`
- **Method:** GraphQL over HTTP POST (배치 요청 배열 형태)
- **Operations:**
  - `getVisitorReviewStats` — 통계, 테마, 메뉴, 투표 키워드
  - `getVisitorReviews` — 리뷰 목록 (cursor 기반 페이지네이션, `after` 파라미터)

### 요청 변수 형식

```ts
// getVisitorReviewStats
{ id: string, itemId: "0", businessType: "restaurant" }

// getVisitorReviews
{ businessId: string, businessType: "restaurant", item: "0",
  size: number, sort: "recent", includeContent: true, after?: string }
```

### 헤더 / 429 대응

- `sec-ch-ua`, `sec-fetch-*`, `accept-language` 등 실제 브라우저 헤더 포함 필수
- 429 발생 시 `postWithRetry`가 3초·6초·9초 간격으로 최대 3회 재시도
- 인증 쿠키: `.env.local`에 `NAVER_COOKIE=...` 설정 권장

### 환경변수 설정 (.env.local)

```bash
cp .env.local.example .env.local
# .env.local 편집 후 NAVER_COOKIE 값 입력
```

---

## Sentiment Analysis (src/lib/sentiment.ts)

### 방식

- **문장 단위 채점:** `\n`, `.`, `!`, `?` 기준으로 분리 → 문장별 독립 채점
- **최소화 패턴 제거:** `NEUTRALIZE_PATTERNS` (예: "아쉬울뿐")을 채점 전에 제거하여 오탐 방지
- **부정 키워드** 등장 횟수 × 점수 합산
- **긍정 키워드**가 같은 문장에서 부정을 압도하면 해당 문장 0점 처리

### 키워드 / 패턴 수정 위치

`src/lib/constants.ts`의 `NEGATIVE_KEYWORDS`, `POSITIVE_KEYWORDS`, `NEUTRALIZE_PATTERNS` 배열을 수정합니다.

### 줄별 점수 (UI 강조용)

`getLineScores(body)` → `LineScore[]` (text + score)

- score >= 8 → 빨간 배경 (`bg-red-50 border-red-400`)
- score 1–7 → 노란 배경 (`bg-amber-50 border-amber-400`)

### CLI용 ANSI 강조

`highlightNegativeLines(body)` → 터미널 ANSI 색상 문자열

- score >= 8 → `\x1b[31m` (빨간색)
- score 1–7 → `\x1b[33m` (노란색)

---

## Testing

```bash
npm test
```

`src/lib/sentiment.test.ts`에 `node:test` 기반 단위 테스트:

- **오탐 방지:** 긍정 맥락의 `냄새`, "아쉬울뿐", 불편 언급 있는 전체 긍정 리뷰
- **실제 부정 감지:** 가격 불만, 강한 부정, 음식 품질, 다중 문장 누적
- **경계 케이스:** 빈 문자열, 짧은 문자열, 순수 긍정 문자열
- **`extractNegativeReviews`:** 필터링, 정렬, topN 제한, body 검증

감성 분석 로직 수정 시 반드시 `npm test`로 회귀 테스트를 실행하세요.

---

## Development Conventions

- **`src/lib/` 내부 imports:** `.js` 확장자 **없이** 작성 (Turbopack 호환)
  ```ts
  import { foo } from "./bar";   ✓
  import { foo } from "./bar.js"; ✗ (Turbopack에서 오류)
  ```
- **타입 안전성:** 새 API 필드 추가 시 `src/lib/types.ts`에 인터페이스 먼저 정의
- **파일별 단일 책임:** 기능 추가 시 해당 lib 파일만 수정
- **쿼리 변경:** `src/lib/queries.ts`의 GraphQL 문자열만 수정, 변수 구조는 `fetcher.ts`와 동기화
- **UI 변경:** `src/app/page.tsx` (클라이언트 컴포넌트), Tailwind CSS v4 클래스 사용
