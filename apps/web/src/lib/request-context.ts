"use client";

import { buildApiHeaders, buildApiQueryParams } from "./api-client";
import { getStoredSessionContext } from "./session-context";

export function getSessionRequestContext() {
  return getStoredSessionContext();
}

export async function buildSessionRequestHeaders(extraHeaders?: HeadersInit): Promise<HeadersInit> {
  return buildApiHeaders(extraHeaders);
}

export async function buildSessionRequestQueryParams(extraParams?: Record<string, string | undefined>) {
  return buildApiQueryParams(extraParams);
}
