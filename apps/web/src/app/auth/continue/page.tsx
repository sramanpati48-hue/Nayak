"use client";

import { apiFetch } from "@/lib/api-client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { setStoredSessionFromAuth } from "@/lib/session-context";
import { useTranslation } from "@/lib/language-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function AuthContinueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const target = searchParams.get("target");
    if (target !== "judge" && target !== "portal") {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const completeAuth = async () => {
      try {
        const token = await getToken();
        const res = await apiFetch(`${API_BASE_URL}/users/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ portal: target }),
        });

        if (!res.ok) {
          throw new Error("Failed to sync user profile");
        }

        const profile = await res.json();
        if (cancelled) return;

        setStoredSessionFromAuth({
          userId: profile.id,
          role: profile.role,
        });

        if (target === "judge") {
          if (profile.role !== "judge") {
            setError(t("gateway.judgeAccessDenied"));
            return;
          }
          router.replace("/judge");
          return;
        }

        router.replace("/portal");
      } catch {
        if (!cancelled) {
          setError(t("gateway.authSyncFailed"));
        }
      }
    };

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router, searchParams, t]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-destructive max-w-md">{error}</p>
        <button
          onClick={() => router.push("/portal")}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
        >
          {t("gateway.goToPortal")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("gateway.preparingWorkspace")}</p>
    </div>
  );
}

export default function AuthContinuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AuthContinueContent />
    </Suspense>
  );
}
