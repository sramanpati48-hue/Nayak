"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JudgeLayout } from "@/components/judge-layout";
import { useSessionContext } from "@/lib/session-context";
import { apiFetch } from "@/lib/api-client";
import { useTranslation } from "@/lib/language-context";
import { Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface JudgeCase {
  id: string;
  title: string;
  status: string;
  mode: string;
  created_at: string;
  description?: string;
}

export default function JudgeDashboard() {
  const router = useRouter();
  const { role } = useSessionContext();
  const { t } = useTranslation();
  const [cases, setCases] = useState<JudgeCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role && role !== "judge") {
      router.replace("/portal?error=unauthorized_judge");
    }
  }, [role, router]);

  useEffect(() => {
    const loadCases = async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/judge/cases`);
        if (!res.ok) throw new Error("Failed to load cases");
        const data = await res.json();
        setCases(data);
      } catch {
        setCases([]);
      } finally {
        setLoading(false);
      }
    };
    loadCases();
  }, []);

  return (
    <JudgeLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="border-b border-border pb-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("judge.badge")}</span>
          <h1 className="text-2xl font-bold">{t("judge.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("judge.subtitle")}</p>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("judge.noCases")}
          </div>
        ) : (
          <div className="grid gap-4">
            {cases.map((item) => (
              <Link
                key={item.id}
                href={`/judge/cases/${item.id}`}
                className="rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-foreground">{item.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description || t("judge.noDescription")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-border bg-secondary">{item.status}</span>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </JudgeLayout>
  );
}
