export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 네이버 지도 URL 또는 장소 ID 문자열에서 숫자 ID를 추출한다.
 * @example
 * extractPlaceId('https://map.naver.com/p/entry/place/1959570492') // '1959570492'
 * extractPlaceId('1959570492') // '1959570492'
 */
export function extractPlaceId(input: string): string {
  if (input.includes("place/")) {
    const match = input.match(/place\/(\d+)/);
    if (match?.[1]) return match[1];
  }
  return input;
}

/** 막대 그래프 문자열 생성 */
export function makeBar(value: number, max: number, width = 18): string {
  const len = max > 0 ? Math.ceil((value / max) * width) : 0;
  return "■".repeat(len);
}
