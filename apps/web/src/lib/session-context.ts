"use client";

import { useEffect, useMemo, useState } from "react";
import { hasPermission, isRole, Role, getRoleLabel } from "./rbac";

const ROLE_STORAGE_KEY = "nayak.role";
const USER_STORAGE_KEY = "nayak.user_id";
const SESSION_EVENT = "nayak-session-context-changed";

export interface SessionContext {
  role: Role;
  userId: string;
}

function createUserId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `user-${crypto.randomUUID()}`;
  }

  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getStoredSessionContext(): SessionContext {
  if (typeof window === "undefined") {
    return { role: "normal_user", userId: "server" };
  }

  const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
  const role = isRole(storedRole) ? storedRole : "normal_user";
  const userId = window.localStorage.getItem(USER_STORAGE_KEY) || "anonymous";

  return { role, userId };
}

export function setStoredSessionFromAuth(context: SessionContext | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!context) {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
    return;
  }

  window.localStorage.setItem(ROLE_STORAGE_KEY, context.role);
  window.localStorage.setItem(USER_STORAGE_KEY, context.userId);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function setStoredSessionRole(role: Role) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function setStoredUserId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_STORAGE_KEY, userId);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function resetStoredUserId() {
  if (typeof window === "undefined") {
    return;
  }

  const userId = createUserId();
  window.localStorage.setItem(USER_STORAGE_KEY, userId);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getStoredSessionHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const { role, userId } = getStoredSessionContext();

  return {
    ...extraHeaders,
    "X-User-Role": role,
    "X-User-Id": userId,
  };
}

export function getStoredSessionQueryParams(extraParams?: Record<string, string | undefined>) {
  const { role, userId } = getStoredSessionContext();

  return new URLSearchParams({
    role,
    user_id: userId,
    ...(extraParams || {}),
  });
}

export function useSessionContext() {
  const [context, setContext] = useState<SessionContext>(getStoredSessionContext());

  useEffect(() => {
    const syncContext = () => setContext(getStoredSessionContext());

    syncContext();
    window.addEventListener("storage", syncContext);
    window.addEventListener(SESSION_EVENT, syncContext as EventListener);

    return () => {
      window.removeEventListener("storage", syncContext);
      window.removeEventListener(SESSION_EVENT, syncContext as EventListener);
    };
  }, []);

  return useMemo(
    () => ({
      ...context,
      roleLabel: getRoleLabel(context.role),
      can: (permission: Parameters<typeof hasPermission>[1]) => hasPermission(context.role, permission),
      setRole: setStoredSessionRole,
      setUserId: setStoredUserId,
      resetUserId: resetStoredUserId,
    }),
    [context]
  );
}
