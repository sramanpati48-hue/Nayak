"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { registerAuthTokenGetter } from "@/lib/api-client";
import { setStoredSessionFromAuth } from "@/lib/session-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    registerAuthTokenGetter(async () => {
      if (!isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setStoredSessionFromAuth(null);
      return;
    }

    let cancelled = false;

    const syncUser = async () => {
      try {
        const token = await getToken();
        let res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });

        if (res.status === 404 && token) {
          res = await fetch(`${API_BASE_URL}/users/sync`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ portal: "portal" }),
          });
        }

        if (!res.ok) {
          throw new Error("Failed to load user profile");
        }

        const profile = await res.json();
        if (!cancelled) {
          setStoredSessionFromAuth({
            userId: profile.id,
            role: profile.role,
          });
        }
      } catch {
        if (!cancelled) {
          setStoredSessionFromAuth({
            userId: user.id,
            role: "normal_user",
          });
        }
      }
    };

    syncUser();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, getToken]);

  return <>{children}</>;
}
