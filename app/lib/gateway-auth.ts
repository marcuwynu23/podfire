/**
 * App → gateway HTTP. Only GATEWAY_API_SECRET is used here (optional).
 * The agent does NOT use this — the agent generates its own key and sends it on WebSocket register; user confirms that key in the app.
 */

const GATEWAY_URL = process.env.AGENT_GATEWAY_URL ?? "http://localhost:3001";

function getSecret(): string | undefined {
  return process.env.GATEWAY_API_SECRET?.trim() || undefined;
}

/**
 * Returns fetch options with optional Authorization header (if GATEWAY_API_SECRET is set).
 */
export function gatewayFetchOptions(init?: RequestInit): RequestInit {
  const secret = getSecret();
  const headers = new Headers(init?.headers);
  if (secret) {
    headers.set("Authorization", `Bearer ${secret}`);
  }
  return { ...init, headers };
}

/**
 * Fetch the agent gateway with secret auth. Use this for all app → gateway calls.
 */
export async function gatewayFetch(
  pathOrUrl: string,
  init?: RequestInit
): Promise<Response> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GATEWAY_URL}${pathOrUrl}`;
  return fetch(url, gatewayFetchOptions(init));
}

export { GATEWAY_URL };
