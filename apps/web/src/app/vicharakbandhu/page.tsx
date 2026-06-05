"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useVicharakBandhuStore } from "@/store/vicharakbandhu";
import { BookOpen, Plus, Info, History, ArrowRight, Loader2 } from "lucide-react";

export default function VicharakBandhuDashboard() {
  const router = useRouter();
  const { reviews, fetchHistory, createReview, loading } = useVicharakBandhuStore();
  
  const [title, setTitle] = useState("Judicial Review File - Case B");
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreateLoading(true);
    setError(null);
    try {
      const reviewId = await createReview(title);
      router.push(`/vicharakbandhu/${reviewId}`);
    } catch (err: any) {
      setError(err.message || "Failed to initialize review case");
      setCreateLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Module Header */}
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Module 02: Review Files</span>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">VicharakBandhu (Review Documents)</h1>
          </div>
          <p className="text-muted-foreground max-w-[800px] text-sm">
            Review case files, witness statements, and document records. Note down key facts, check for differences in stories, and compile summaries.
          </p>
        </div>

        {/* Operational Scope callout */}
        <div className="flex items-start gap-3.5 p-4 rounded bg-secondary/30 border border-border/80 text-xs text-muted-foreground">
          <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground block">How it works</span>
            <span>VicharakBandhu helps you check documents and statements. You can upload files, write key case notes, and see a summary checklist of your case. It does not decide cases or act as a judge.</span>
          </div>
        </div>

        {/* Form and History Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Intake column */}
          <div className="space-y-5 bg-card border border-border p-5 rounded-lg shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2">
              Start New Document Review
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded text-[11px] text-destructive-foreground">
                  {error}
                </div>
              )}

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-muted-foreground block">Case Name</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-4 shadow-sm transition-colors"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Start Document Review</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* History column */}
          <div className="md:col-span-2 rounded-lg border border-border bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>My Document Reviews</span>
            </h3>
            
            <div className="overflow-x-auto mt-4">
              {loading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Loading history logs...
                </div>
              ) : reviews.length > 0 ? (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-medium">
                      <th className="pb-2 font-semibold">Case ID</th>
                      <th className="pb-2 font-semibold">Case Name</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Date Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {reviews.map((rev) => (
                      <tr key={rev.id} className="text-muted-foreground hover:text-foreground">
                        <td className="py-3 font-semibold text-primary">
                          <Link href={`/vicharakbandhu/${rev.id}`} className="hover:underline">
                            {rev.id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="py-3">
                          <Link href={`/vicharakbandhu/${rev.id}`} className="font-medium text-foreground hover:underline">
                            {rev.title}
                          </Link>
                        </td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] border capitalize ${
                            rev.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-secondary text-muted-foreground border-border/50"
                          }`}>
                            {rev.status === "active" ? "Active" : "Finalized"}
                          </span>
                        </td>
                        <td className="py-3">{new Date(rev.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No active or historical reviews found. Use the panel on the left to start one.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
