"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { Briefcase, ShieldAlert, FolderPlus, Loader2 } from "lucide-react";

export default function LiveCaseAnalysisIntake() {
  const router = useRouter();
  const { createSession } = useNyaybandhuStore();

  const [title, setTitle] = useState("Live Case Analysis - Writ Petition 402");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("precedent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const sessionId = await createSession(title, description, "real-life", strategy);
      router.push(`/nyaybandhu/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "Failed to initialize live case session");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="border-b border-border pb-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Nyaybandhu Intake</span>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-primary" />
            <span>Live Case Analysis</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Establish a secure litigation directory. run deep citations audits and check gaps in active pleadings arguments.
          </p>
        </div>

        {/* Intake Form */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border p-6 rounded-lg shadow-sm">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-muted-foreground block">Litigation Workspace Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Context brief */}
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-muted-foreground block">Pleadings Draft / Case Brief</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste active petition text or citation indexes to run adversarial sweeps..."
              rows={4}
              className="w-full bg-secondary/20 border border-border rounded p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* strategy configuration */}
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-muted-foreground block">Expected Opposing Counsel Strategy</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "textualist", label: "Textualist", desc: "Rigid statutory definitions analysis." },
                { id: "pragmatist", label: "Pragmatist", desc: "Policy impact argument testing." },
                { id: "precedent", label: "Precedent-Oriented", desc: "Focuses on overrulings logs." }
              ].map((item) => (
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

          {/* Submit */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Isolated PII Redaction Enabled
            </span>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-6 shadow-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Ingesting Case...</span>
                </>
              ) : (
                <span>Initialize Case Analysis</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
