"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { JudgeLayout } from "@/components/judge-layout";
import { apiFetch } from "@/lib/api-client";
import { useTranslation } from "@/lib/language-context";
import { Loader2, Upload, FileText, ArrowUpRight } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface JudgeCase {
  id: string;
  title: string;
  status: string;
  mode: string;
  created_at: string;
  description?: string;
}

interface EvidenceItem {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

export default function JudgeCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [caseData, setCaseData] = useState<JudgeCase | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [caseRes, evidenceRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/judge/cases/${params.id}`),
        apiFetch(`${API_BASE_URL}/judge/cases/${params.id}/evidence`),
      ]);

      if (!caseRes.ok) throw new Error("Case not found");
      setCaseData(await caseRes.json());
      if (evidenceRes.ok) {
        setEvidence(await evidenceRes.json());
      }
    } catch {
      setError(t("judge.caseLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers = await (await import("@/lib/api-client")).buildApiHeaders();
      const authHeaders: Record<string, string> = {};
      new Headers(headers).forEach((value, key) => {
        if (key.toLowerCase() !== "content-type") authHeaders[key] = value;
      });

      const res = await fetch(`${API_BASE_URL}/judge/cases/${params.id}/evidence`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      await loadData();
    } catch {
      setError(t("judge.uploadFailed"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <JudgeLayout>
        <div className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </JudgeLayout>
    );
  }

  if (!caseData) {
    return (
      <JudgeLayout>
        <p className="text-sm text-destructive">{error || t("judge.caseLoadFailed")}</p>
      </JudgeLayout>
    );
  }

  return (
    <JudgeLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="border-b border-border pb-4 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("judge.caseReview")}</span>
          <h1 className="text-2xl font-bold">{caseData.title}</h1>
          <p className="text-sm text-muted-foreground">{caseData.description || t("judge.noDescription")}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{t("common.status")}: {caseData.status}</span>
            <span>{t("common.workspaceType")}: {caseData.mode}</span>
          </div>
        </div>

        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-accent">{t("judge.evidenceUpload")}</h2>
          <p className="text-xs text-muted-foreground">{t("judge.evidenceUploadDesc")}</p>
          <label className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold cursor-pointer hover:bg-primary/90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? t("judge.uploading") : t("judge.uploadEvidence")}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-accent">{t("judge.uploadedEvidence")}</h2>
          {evidence.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("judge.noEvidence")}</p>
          ) : (
            <div className="space-y-2">
              {evidence.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-border/70 bg-secondary/20 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">{item.filename}</span>
                  </div>
                  <span className="text-muted-foreground">{(item.file_size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </JudgeLayout>
  );
}
