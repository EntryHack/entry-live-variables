import fetch from "./fetch.ts";
import { getTokens } from "./tokens.ts";

type Variables = {
  [key: string]: string | number | boolean | string[] | number[] | Variables;
};

export async function graphql<T>(
  username: string,
  password: string,
  query: string,
  variables: Variables,
): Promise<T> {
  const tokens = await getTokens(username, password);

  const res = await fetch("https://playentry.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tokens.csrfToken && { "csrf-token": tokens.csrfToken }),
      ...(tokens.xToken && { "x-token": tokens.xToken }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();

  return json.data;
}
