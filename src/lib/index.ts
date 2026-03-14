import { analyze } from "./analyzer";

const input = process.argv[2];

if (!input) {
  console.log("사용법: npx tsx src/index.ts <URL 또는 장소ID>");
  console.log("예시:   npx tsx src/index.ts 1959570492");
  console.log('       NAVER_COOKIE="..." npx tsx src/index.ts 1959570492');
  process.exit(1);
}

await analyze(input);
