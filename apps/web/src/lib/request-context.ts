"use client";

import { getStoredSessionContext, getStoredSessionHeaders, getStoredSessionQueryParams } from "./session-context";

export function getSessionRequestContext() {
  return getStoredSessionContext();
}

export function buildSessionRequestHeaders(extraHeaders?: HeadersInit): HeadersInit {
  return getStoredSessionHeaders(extraHeaders);
}

export function buildSessionRequestQueryParams(extraParams?: Record<string, string | undefined>) {
  return getStoredSessionQueryParams(extraParams);
}
