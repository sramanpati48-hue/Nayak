import { getStoredSessionContext } from "./session-context";

let tokenGetter: (() => Promise<string | null>) | null = null;

export function registerAuthTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

export async function buildApiHeaders(extraHeaders?: HeadersInit): Promise<HeadersInit> {
  const { role, userId } = getStoredSessionContext();
  const headers: Record<string, string> = {
    "X-User-Role": role,
    "X-User-Id": userId,
  };

  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (extraHeaders) {
    const extra = new Headers(extraHeaders);
    extra.forEach((value, key) => {
      headers[key] = value;
    });
  }

  return headers;
}

export async function apiFetch(input: string, init?: RequestInit) {
  const headers = await buildApiHeaders(init?.headers);
  return fetch(input, { ...init, headers });
}

export async function buildApiQueryParams(
  extraParams?: Record<string, string | undefined>
) {
  const { role, userId } = getStoredSessionContext();
  const params = new URLSearchParams({
    role,
    user_id: userId,
    ...(extraParams || {}),
  });

  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      params.set("token", token);
    }
  }

  return params;
}
