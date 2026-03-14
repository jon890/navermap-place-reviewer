# 네이버 플레이스 리뷰 분석기 (Naver Place Review Analyzer - TypeScript)

이 도구는 네이버 플레이스의 리뷰 데이터를 분석하여 방문자들이 가장 많이 언급한 키워드(특징)를 요약해줍니다.
TypeScript를 사용하여 더욱 구조적이고 유지보수가 용이하게 재작성되었습니다.

## 시작하기

1. **의존성 설치**:

   ```bash
   npm install
   ```

2. **분석 실행 (TypeScript 직접 실행)**:

   ```bash
   npm run analyze "https://map.naver.com/p/entry/place/1959570492?placePath=/review"
   ```

   또는

   ```bash
   npm run analyze 1959570492
   ```

3. **빌드 후 실행 (컴파일된 JS 실행)**:
   ```bash
   npm run build
   npm start 1959570492
   ```

## 주요 기능

- **객체 지향 설계**: `NaverPlaceAnalyzer` 클래스를 기반으로 한 구조적 설계
- **타입 안정성**: GraphQL 응답 및 통계 데이터에 대한 인터페이스 정의 (`src/types.ts`)
- **시각화**: 키워드 빈도를 막대 그래프(■) 형태로 시각화하여 한눈에 파악 가능

## 프로젝트 구조

- `src/index.ts`: CLI 엔트리 포인트
- `src/analyzer.ts`: 분석 로직을 담은 핵심 클래스
- `src/types.ts`: API 통신 및 데이터 구조를 위한 타입 정의

## 429 차단 해결 방법

네이버 API는 쿠키 없는 요청을 봇으로 인식하여 즉시 차단합니다. 아래 방법으로 해결하세요.

### 브라우저 쿠키 추출 방법

1. Chrome/Edge에서 [map.naver.com](https://map.naver.com) 접속 후 네이버 **로그인**
2. **F12** → **Network** 탭 → 페이지 새로고침
3. 아무 요청이나 클릭 → **Headers** → **Request Headers**에서 `cookie:` 값 전체 복사
4. 아래처럼 환경변수로 전달하여 실행:

```bash
NAVER_COOKIE="NID_AUT=xxx; NID_SES=yyy; ..." node index.js 1959570492
```

또는 `.env` 파일에 저장 후 사용:

```bash
echo 'NAVER_COOKIE=NID_AUT=xxx; NID_SES=yyy; ...' > .env
node -e "require('fs').readFileSync('.env','utf8').split('\n').forEach(l=>{const[k,...v]=l.split('=');process.env[k]=v.join('=')})" index.js 1959570492
```

### 주의 사항

- 쿠키는 로그인 세션 정보이므로 외부에 공유하지 마세요
- 세션 쿠키는 일정 시간이 지나면 만료됩니다 (보통 수 시간~며칠)
- 쿠키 없이 사용 시에도 재시도 로직(최대 3회)이 자동으로 동작합니다
