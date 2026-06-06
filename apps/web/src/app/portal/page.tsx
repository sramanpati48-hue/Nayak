"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Scale, BookOpen, FileText, ArrowRight, ShieldAlert, Award } from "lucide-react";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { useVicharakBandhuStore } from "@/store/vicharakbandhu";
import { useKnowMyRightsStore } from "@/store/know-my-rights";
import { useTranslation } from "@/lib/language-context";

export default function PortalHome() {
  const { t } = useTranslation();
  const { sessions, fetchHistory: fetchNyayHistory } = useNyaybandhuStore();
  const { reviews, fetchHistory: fetchVicharakHistory } = useVicharakBandhuStore();
  const { favorites, fetchRights } = useKnowMyRightsStore();

  useEffect(() => {
    fetchNyayHistory();
    fetchVicharakHistory();
    fetchRights();
  }, []);

  const activeSessionsCount = sessions.filter((s) => s.status === "active").length;
  const caseReviewsCount = reviews.length;
  const compiledReportsCount =
    sessions.filter((s) => s.status === "finalized").length +
    reviews.filter((r) => r.status === "finalized").length;
  const favoritedRightsCount = favorites.length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("home.tagline")}</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("home.title")}</h1>
          <p className="text-muted-foreground max-w-[800px] text-sm md:text-base leading-relaxed">{t("home.description")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("home.stats.activeCases")}</span>
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{activeSessionsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("home.stats.activeCasesDesc")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("home.stats.documentReviews")}</span>
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{caseReviewsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("home.stats.documentReviewsDesc")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("home.stats.readySummaries")}</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{compiledReportsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("home.stats.readySummariesDesc")}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("home.stats.savedRights")}</span>
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{favoritedRightsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("home.stats.savedRightsDesc")}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-secondary rounded border border-border text-primary">
                  <Scale className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                  {t("home.modules.nyaybandhuBadge")}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{t("home.modules.nyaybandhuTitle")}</h2>
              <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">{t("home.modules.nyaybandhuDesc")}</p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/40 flex items-center gap-4 text-xs font-medium">
              <Link href="/nyaybandhu/practice" className="flex items-center gap-1 text-accent hover:underline">
                {t("home.links.practiceArena")} <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="text-border">|</span>
              <Link href="/nyaybandhu/real-life" className="flex items-center gap-1 text-accent hover:underline">
                {t("home.links.checkRealArguments")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-secondary rounded border border-border text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                  {t("home.modules.vicharakBadge")}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{t("home.modules.vicharakTitle")}</h2>
              <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">{t("home.modules.vicharakDesc")}</p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/40 flex items-center text-xs font-medium">
              <Link href="/vicharakbandhu" className="flex items-center gap-1 text-accent hover:underline">
                {t("home.links.startDocumentReview")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-secondary rounded border border-border text-primary">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                  {t("home.modules.rightsBadge")}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{t("home.modules.rightsTitle")}</h2>
              <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">{t("home.modules.rightsDesc")}</p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/40 flex items-center text-xs font-medium">
              <Link href="/know-my-rights" className="flex items-center gap-1 text-accent hover:underline">
                {t("home.links.exploreRights")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-secondary/20 p-5 text-xs text-muted-foreground leading-relaxed mt-6">
          <p className="font-semibold text-foreground mb-1">{t("home.disclaimerTitle")}</p>
          <p>{t("home.disclaimerBody")}</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
