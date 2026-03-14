import axios, { type AxiosResponse } from "axios";
import { GRAPHQL_URL, PLACE_BASE_URL } from "./constants";
import { sleep } from "./utils";

export function buildHeaders(placeId: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "*/*",
    "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    origin: PLACE_BASE_URL,
    referer: `${PLACE_BASE_URL}/restaurant/${placeId}/review/visitor`,
    "sec-ch-ua":
      '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  };

  const cookie = process.env.NAVER_COOKIE;
  if (cookie) headers.cookie = cookie;

  return headers;
}

/**
 * 429 응답 시 지수 백오프(exponential backoff)로 재시도하는 POST 요청.
 */
export async function postWithRetry(
  payload: unknown[],
  headers: Record<string, string>,
  maxRetries = 3,
): Promise<AxiosResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.post(GRAPHQL_URL, payload, {
        headers,
        timeout: 10_000,
      });
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 429 &&
        attempt < maxRetries
      ) {
        const delay = attempt * 3_000;
        console.log(
          `⏳ 429 차단됨. ${delay / 1000}초 후 재시도... (${attempt}/${maxRetries})`,
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("최대 재시도 횟수 초과");
}
