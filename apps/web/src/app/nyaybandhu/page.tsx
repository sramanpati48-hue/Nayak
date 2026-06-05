"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { Scale, Play, Briefcase, Info, History } from "lucide-react";

export default function NyaybandhuDashboard() {
  const { sessions, fetchHistory, loading } = useNyaybandhuStore();

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Module Header */}
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Module 01: Test Arguments</span>
          <div className="flex items-center gap-2.5">
            <Scale className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Nyaybandhu (See Both Sides)</h1>
          </div>
          <p className="text-muted-foreground max-w-[800px] text-sm">
            Look at case arguments from both your side and the other side. Try out different arguments in a practice arena or spot gaps in your current case papers.
          </p>
        </div>

        {/* Operational Overview Callout */}
        <div className="flex items-start gap-3.5 p-4 rounded bg-secondary/30 border border-border/80 text-xs text-muted-foreground">
          <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground block">How it works</span>
            <span>Choose between **Practice Arena** (a safe space to test how arguments respond to different styles of questioning) and **Check Real Arguments** (to review case files, identify missing facts, and audit text for inconsistencies).</span>
          </div>
        </div>

        {/* Navigation / Selection Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Simulation Card */}
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/30 transition-all">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-3">
                <Play className="h-4 w-4" />
                <span>Practice Arena</span>
              </div>
              <h3 className="text-base font-bold text-foreground">Test arguments in a safe space</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Test your arguments, see how they hold up against strictly literal or dynamic reasoning, and keep a log of the discussion.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/nyaybandhu/practice"
                className="inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-4 w-full transition-colors"
              >
                Open Practice Arena
              </Link>
            </div>
          </div>

          {/* Live Case Card */}
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/30 transition-all">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-3">
                <Briefcase className="h-4 w-4" />
                <span>Check Real Arguments</span>
              </div>
              <h3 className="text-base font-bold text-foreground">Spot gaps in real case documents</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Look for gaps in case files, check references, and verify details in your written drafts.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/nyaybandhu/real-life"
                className="inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-4 w-full transition-colors"
              >
                Check Real Arguments
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Session History Panel */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span>Recent Workspace Sessions</span>
          </h3>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Loading history...
              </div>
            ) : sessions.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground font-medium">
                    <th className="pb-2.5 font-semibold">Case ID</th>
                    <th className="pb-2.5 font-semibold">Case Name</th>
                    <th className="pb-2.5 font-semibold">Workspace Type</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    <th className="pb-2.5 font-semibold">Date Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sessions.map((session) => (
                    <tr key={session.id} className="text-muted-foreground hover:text-foreground">
                      <td className="py-3 font-semibold text-primary">
                        <Link href={`/nyaybandhu/${session.id}`} className="hover:underline">
                          {session.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="py-3">
                        <Link href={`/nyaybandhu/${session.id}`} className="font-medium text-foreground hover:underline">
                          {session.title}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary border border-border/50 text-foreground capitalize">
                          {session.mode === "practice" ? "Practice" : "Document Check"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border capitalize ${
                          session.status === "active" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-secondary text-muted-foreground border-border/50"
                        }`}>
                          {session.status === "active" ? "Active" : "Finalized"}
                        </span>
                      </td>
                      <td className="py-3">{new Date(session.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No active or historical analysis sessions found. Use the options above to start one.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
