"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { Briefcase, ShieldAlert, Loader2 } from "lucide-react";
import { useSessionContext } from "@/lib/session-context";
import { useTranslation } from "@/lib/language-context";
import { hasPermission } from "@/lib/rbac";

export default function LiveCaseAnalysisIntake() {
  const router = useRouter();
  const { createSession } = useNyaybandhuStore();
  const { role } = useSessionContext();
  const { t, getRoleLabel, getRoleSummary } = useTranslation();
  const canCreateCase = hasPermission(role, "create_case");

  const [title, setTitle] = useState("Real Case Review - Case 402");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("precedent");
  const [manualSafetyChecked, setManualSafetyChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReferenceImage, setShowReferenceImage] = useState(true);

  const strategies = [
    { id: "textualist", label: t("practice.strategyTextualist"), desc: t("practice.strategyTextualistDesc") },
    { id: "pragmatist", label: t("practice.strategyPragmatist"), desc: t("practice.strategyPragmatistDesc") },
    { id: "precedent", label: t("practice.strategyPrecedent"), desc: t("practice.strategyPrecedentDesc") },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const finalDescription = manualSafetyChecked
        ? "[SAFETY_ALERT: TRUE]\n" + description
        : description;
      const sessionId = await createSession(title, finalDescription, "real-life", strategy);
      router.push(`/nyaybandhu/${sessionId}`);
    } catch (err: any) {
      setError(err.message || t("realLife.failedSession"));
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl text-left">
        <div className="border-b border-border pb-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("realLife.badge")}</span>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-primary" />
            <span>{t("realLife.title")}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("realLife.subtitle")}
          </p>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t("realLife.referenceTitle")}</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("realLife.modulePreview")}</span>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-2 sm:p-3">
            {showReferenceImage ? (
              <img
                src="/images/real-arguments-reference.png"
                alt={t("realLife.referenceAlt")}
                className="w-full rounded-lg border border-border/70 object-cover"
                loading="lazy"
                onError={() => setShowReferenceImage(false)}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">{t("realLife.referenceMissing")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("realLife.referenceMissingHint")}
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="p-3.5 bg-secondary/35 border border-border/80 rounded text-xs text-muted-foreground flex gap-2 items-start">
          <span className="text-base mt-0.5">⚠️</span>
          <div>
            <span className="font-bold text-foreground block">{t("realLife.disclaimerTitle")}</span>
            <span className="text-[11px] block mt-0.5 leading-normal">{t("realLife.disclaimerBody")}</span>
          </div>
        </div>

        {!canCreateCase ? (
          <div className="space-y-3 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Briefcase className="h-4 w-4" />
              <span>{getRoleLabel(role)} {t("common.accessSuffix")}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getRoleSummary(role)} {t("realLife.noAccessDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border p-6 rounded-lg shadow-sm">
            {error && (
              <div className="space-y-3">
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive-foreground space-y-1">
                  <strong className="block">{t("realLife.somethingWrong")}</strong>
                  <p>{error}</p>
                </div>
                {manualSafetyChecked && (
                  <div className="p-3.5 border border-red-500/30 bg-red-500/5 rounded text-xs space-y-2">
                    <strong className="text-red-500 block">🚨 {t("realLife.dangerNotice")}</strong>
                    <p className="text-muted-foreground leading-relaxed">
                      {t("realLife.dangerBody")}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[9px]">{t("realLife.policeEmergency")}</span>
                        <span className="font-extrabold text-foreground text-xs">112 / 100</span>
                      </div>
                      <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[9px]">{t("realLife.womenHelpline")}</span>
                        <span className="font-extrabold text-foreground text-xs">1091 / 181</span>
                      </div>
                      <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[9px]">{t("realLife.childHelpline")}</span>
                        <span className="font-extrabold text-foreground text-xs">1098</span>
                      </div>
                      <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                        <span className="text-muted-foreground block text-[9px]">{t("realLife.cybercrime")}</span>
                        <span className="font-extrabold text-foreground text-xs">1930</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground block">{t("realLife.workspaceName")}</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground block">{t("realLife.describeCase")}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("realLife.describePlaceholder")}
                rows={5}
                className="w-full bg-secondary/20 border border-border rounded p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded border border-red-500/20 bg-red-500/5 text-xs">
              <input
                type="checkbox"
                id="manualSafety"
                checked={manualSafetyChecked}
                onChange={(e) => setManualSafetyChecked(e.target.checked)}
                className="rounded border-border bg-card h-4 w-4 mt-0.5 text-red-500 focus:ring-1 focus:ring-red-400"
              />
              <label htmlFor="manualSafety" className="font-semibold text-foreground leading-snug cursor-pointer select-none">
                {t("realLife.safetyCheckbox")}
                <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">{t("realLife.safetyCheckboxHint")}</span>
              </label>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-muted-foreground block">{t("practice.opposingStrategy")}</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {strategies.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStrategy(item.id)}
                    className={`p-3 rounded border text-left flex flex-col justify-between transition-all ${
                      strategy === item.id
                        ? "border-primary bg-secondary/40"
                        : "border-border/60 hover:bg-secondary/20 bg-card"
                    }`}
                  >
                    <span className="font-bold text-foreground block">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground block mt-1.5 leading-snug">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                {t("common.privateSecure")}
              </span>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-6 shadow-sm transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{t("realLife.loadingCase")}</span>
                  </>
                ) : (
                  <span>{t("realLife.reviewCase")}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
