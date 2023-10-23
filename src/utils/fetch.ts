import { CookieJar } from "../deps.ts";
import { wrapFetch } from "./wrap-fetch.ts";

export const cookieJar = new CookieJar();
export const originalFetch = globalThis.fetch;

const fetch: typeof originalFetch = wrapFetch({
  fetch: originalFetch,
  cookieJar,
});

export default fetch;
