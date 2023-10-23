import fetch from "./fetch.ts";

const _tokens: { csrfToken?: string; xToken?: string; updated: number } = {
  updated: 0,
};

export async function getTokens(username: string, password: string) {
  if (Date.now() - _tokens.updated <= 1000 * 60 * 60 * 3) return _tokens;

  const res = await fetch("https://playentry.org");
  const text = await res.text();

  const __NEXT_DATA__ = /\<script id="__NEXT_DATA__".*\>((.|\n)+)\<\/script\>/
    .exec(text)?.[1];
  if (!__NEXT_DATA__) return _tokens;

  const parsedData = JSON.parse(__NEXT_DATA__);

  const csrfToken = parsedData.props.initialProps.csrfToken;
  const xToken = parsedData.props.initialState.common.user?.xToken;

  if (!xToken) {
    const res = await fetch("https://playentry.org/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken && { "csrf-token": csrfToken }),
      },
      body: JSON.stringify({
        query: `mutation ($username: String!, $password: String!) {
        signinByUsername(username: $username, password: $password, rememberme: true) {
          id
          username
          nickname
        }
      }`,
        variables: { username, password },
      }),
    });
    const json = await res.json();

    if (!res.ok) return _tokens;
    if (!json.data.signinByUsername) return _tokens;
    return getTokens(username, password);
  }

  _tokens.csrfToken = csrfToken;
  _tokens.xToken = xToken;
  _tokens.updated = Date.now();

  return _tokens;
}
