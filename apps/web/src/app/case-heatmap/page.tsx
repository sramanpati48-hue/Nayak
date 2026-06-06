"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useHeatmapStore } from "@/store/heatmap";
import { useRealtimeCases } from "@/hooks/useRealtimeCases";
import { HeatmapMap } from "@/components/heatmap-map";
import { MapPin, TrendingUp, Info, Filter, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/language-context";

export default function CaseHeatmapPage() {
  const { fetchHeatmapData } = useHeatmapStore();
  const { districtData, isLive, lastUpdate } = useRealtimeCases();
  const { t } = useTranslation();
  const [sortedDistricts, setSortedDistricts] = useState<Array<any>>([]);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  useEffect(() => {
    const sorted = Object.values(districtData).sort((a, b) => b.caseCount - a.caseCount);
    setSortedDistricts(sorted);
  }, [districtData]);

  const totalCases = Object.values(districtData).reduce((sum, d) => sum + d.caseCount, 0);
  const totalDistricts = Object.keys(districtData).length;
  const avgCasesPerDistrict = totalDistricts > 0 ? Math.round(totalCases / totalDistricts) : 0;

  const caseTypeStats = Object.values(districtData).reduce(
    (acc: Record<string, number>, d) => {
      const type = d.topCaseType;
      acc[type] = (acc[type] || 0) + d.caseCount;
      return acc;
    },
    {}
  );

  const avgMoM =
    Object.values(districtData).length > 0
      ? (
          Object.values(districtData).reduce((sum, d) => sum + d.momChange, 0) /
          Object.values(districtData).length
        ).toFixed(2)
      : "0";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("heatmap.badge")}</span>
              <div className="flex items-center gap-2.5 mt-2">
                <MapPin className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">{t("heatmap.title")}</h1>
              </div>
            </div>
            
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/30">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-primary">{t("heatmap.liveData")}</span>
              </div>
            )}
          </div>
          
          <p className="text-muted-foreground max-w-[800px] text-sm">
            {t("heatmap.description")}
            <span className="text-primary ml-1">{t("heatmap.darkRed")}</span> → <span className="text-accent">{t("heatmap.yellow")}</span>.
            {t("heatmap.hoverHint")}
          </p>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded bg-secondary/30 border border-border/80 text-xs text-muted-foreground">
          <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground block">{t("heatmap.liveUpdates")}</span>
            <span>
              {t("heatmap.liveUpdatesDesc")} {isLive ? t("heatmap.connectedLive") : t("heatmap.usingFallback")}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("heatmap.totalCases")}</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{totalCases}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{t("heatmap.acrossDistricts")}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("heatmap.districts")}</span>
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{totalDistricts}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{t("heatmap.trackedJurisdictions")}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("heatmap.avgPerDistrict")}</span>
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{avgCasesPerDistrict}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{t("heatmap.avgCaseCount")}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("heatmap.avgMomChange")}</span>
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div className={`text-2xl font-semibold ${parseFloat(avgMoM) >= 0 ? "text-red-500" : "text-emerald-500"}`}>
              {parseFloat(avgMoM) >= 0 ? "+" : ""}{avgMoM}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{t("heatmap.monthOverMonth")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{t("heatmap.geographicDistribution")}</h2>
            {lastUpdate && (
              <span className="text-[10px] text-muted-foreground">
                {t("heatmap.lastUpdated", { time: lastUpdate.toLocaleTimeString() })}
              </span>
            )}
          </div>
          <HeatmapMap />
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-bold text-foreground text-sm">{t("heatmap.intensityScale")}</h3>
          <div className="grid grid-cols-5 gap-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#8b0000" }} />
              <span className="text-[10px] text-muted-foreground text-center">{t("heatmap.veryHigh")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#ff3333" }} />
              <span className="text-[10px] text-muted-foreground text-center">{t("heatmap.high")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#ff6600" }} />
              <span className="text-[10px] text-muted-foreground text-center">{t("heatmap.medium")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#ffff66" }} />
              <span className="text-[10px] text-muted-foreground text-center">{t("heatmap.low")}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded border border-border" style={{ backgroundColor: "transparent" }} />
              <span className="text-[10px] text-muted-foreground text-center">{t("heatmap.noActivity")}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">{t("heatmap.topDistricts")}</h2>
            <div className="space-y-2">
              {sortedDistricts.slice(0, 5).map((district, index) => (
                <div key={district.districtId} className="rounded-lg border border-border bg-card p-3 hover:border-primary/45 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground bg-secondary rounded px-2 py-0.5">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{district.districtName}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{district.caseCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{t("heatmap.typeLabel", { type: district.topCaseType })}</span>
                    <span
                      className={`font-semibold ${
                        district.momChange >= 0 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {district.momChange >= 0 ? "+" : ""}{district.momChange.toFixed(1)}% MoM
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(district.caseCount / Math.max(...sortedDistricts.map(d => d.caseCount))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">{t("heatmap.caseTypeBreakdown")}</h2>
            <div className="space-y-2">
              {Object.entries(caseTypeStats)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([type, count]) => (
                  <div key={type} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">{type}</span>
                      <span className="text-sm font-bold text-primary">{count as number}</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${((count as number) / totalCases) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t("heatmap.percentOfTotal", { percent: (((count as number) / totalCases) * 100).toFixed(1) })}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
