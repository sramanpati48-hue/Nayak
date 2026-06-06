"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useHeatmapStore } from "@/store/heatmap";
import { useRealtimeCases } from "@/hooks/useRealtimeCases";
import { HeatmapMap } from "@/components/heatmap-map";
import { MapPin, TrendingUp, Info, Filter, RefreshCw } from "lucide-react";

export default function CaseHeatmapPage() {
  const { fetchHeatmapData, loading } = useHeatmapStore();
  const { districtData, isLive, lastUpdate, loading: dataLoading } = useRealtimeCases();
  const [sortedDistricts, setSortedDistricts] = useState<Array<any>>([]);

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  // Sort districts by case count
  useEffect(() => {
    const sorted = Object.values(districtData).sort((a, b) => b.caseCount - a.caseCount);
    setSortedDistricts(sorted);
  }, [districtData]);

  // Calculate stats
  const totalCases = Object.values(districtData).reduce((sum, d) => sum + d.caseCount, 0);
  const totalDistricts = Object.keys(districtData).length;
  const avgCasesPerDistrict = totalDistricts > 0 ? Math.round(totalCases / totalDistricts) : 0;

  // Case type stats
  const caseTypeStats = Object.values(districtData).reduce(
    (acc: Record<string, number>, d) => {
      const type = d.topCaseType;
      acc[type] = (acc[type] || 0) + d.caseCount;
      return acc;
    },
    {}
  );

  // MoM average
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
        {/* Module Header */}
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Case Analytics</span>
              <div className="flex items-center gap-2.5 mt-2">
                <MapPin className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Case Heatmap</h1>
              </div>
            </div>
            
            {/* Live Status */}
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/30">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-primary">Live Data</span>
              </div>
            )}
          </div>
          
          <p className="text-muted-foreground max-w-[800px] text-sm">
            Real-time case distribution across districts. Color intensity represents case concentration: 
            <span className="text-primary ml-1">Dark Red (High)</span> → <span className="text-accent">Yellow (Low)</span>. 
            Hover over districts for detailed metrics.
          </p>
        </div>

        {/* Info Callout */}
        <div className="flex items-start gap-3.5 p-4 rounded bg-secondary/30 border border-border/80 text-xs text-muted-foreground">
          <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground block">Live Updates</span>
            <span>
              Data refreshes every 30 seconds. Hover over any district zone to see: Case count, 
              top case type, and month-over-month percentage change. {isLive ? "Currently connected to live API." : "Using fallback data."}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Cases</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{totalCases}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Across all districts</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Districts</span>
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{totalDistricts}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Tracked jurisdictions</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg per District</span>
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{avgCasesPerDistrict}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Average case count</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg MoM Change</span>
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div className={`text-2xl font-semibold ${parseFloat(avgMoM) >= 0 ? "text-red-500" : "text-emerald-500"}`}>
              {parseFloat(avgMoM) >= 0 ? "+" : ""}{avgMoM}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Month-over-month</p>
          </div>
        </div>

        {/* Heatmap */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Geographic Distribution</h2>
            {lastUpdate && (
              <span className="text-[10px] text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
          <HeatmapMap />
        </div>

        {/* Color Legend */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-bold text-foreground text-sm">Intensity Scale</h3>
          <div className="grid grid-cols-5 gap-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#8b0000" }} />
              <span className="text-[10px] text-muted-foreground text-center">Very High (80%+)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#ff3333" }} />
              <span className="text-[10px] text-muted-foreground text-center">High (60-80%)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#ff6600" }} />
              <span className="text-[10px] text-muted-foreground text-center">Medium (40-60%)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded" style={{ backgroundColor: "#ffff66" }} />
              <span className="text-[10px] text-muted-foreground text-center">Low (1-40%)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full h-6 rounded border border-border" style={{ backgroundColor: "transparent" }} />
              <span className="text-[10px] text-muted-foreground text-center">No Activity</span>
            </div>
          </div>
        </div>

        {/* Top Districts and Case Type Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Districts */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Top 5 Districts by Case Volume</h2>
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
                    <span className="text-muted-foreground">Type: {district.topCaseType}</span>
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

          {/* Case Type Distribution */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Case Type Distribution</h2>
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
                      {(((count as number) / totalCases) * 100).toFixed(1)}% of total
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
