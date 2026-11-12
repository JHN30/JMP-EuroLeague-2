// Production builds are served by the API itself, so they call it on the same origin.
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:3000/api");

// Encodes a query value as axios did (`:`, `$` and `,` kept, spaces as `+`), so every address stays the same.
function encode(value) {
  return encodeURIComponent(value)
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%20/g, "+");
}

function address(path, params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join("&");
  const url = `${BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  return query ? `${url}?${query}` : url;
}

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// A reply outside 200 to 299. Pages read `response.status` (404 is "not in this season") and `response.data` (the API's error code).
class ApiError extends Error {
  constructor(status, data) {
    super(`Request failed with status code ${status}`);
    this.name = "ApiError";
    this.response = { status, data };
  }
}

async function get(path, { params } = {}) {
  const response = await fetch(address(path, params), {
    credentials: "include",
    headers: { Accept: "application/json, text/plain, */*" },
  });
  const data = parse(await response.text());
  if (!response.ok) throw new ApiError(response.status, data);
  return { data };
}

export default { get };
