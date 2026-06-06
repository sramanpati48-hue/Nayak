"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { Briefcase, ShieldAlert, FolderPlus, Loader2 } from "lucide-react";
import { useSessionContext } from "@/lib/session-context";
import { hasPermission, getRoleLabel, getRoleSummary } from "@/lib/rbac";

export default function LiveCaseAnalysisIntake() {
  const router = useRouter();
  const { createSession } = useNyaybandhuStore();
  const { role } = useSessionContext();
  const canCreateCase = hasPermission(role, "create_case");

  const [title, setTitle] = useState("Real Case Review - Case 402");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("precedent");
  const [manualSafetyChecked, setManualSafetyChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message || "Failed to initialize live case session");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl text-left">
        {!canCreateCase ? (
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Briefcase className="h-4 w-4" />
              <span>{getRoleLabel(role)} access</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getRoleSummary(role)} This view is locked for case creation, but assigned-case review tools remain available from the workspace history.
            </p>
          </div>
        ) : null}

        {/* Header */}
        <div className="border-b border-border pb-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Real Case Review</span>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-primary" />
            <span>Tell Us What Happened</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Share your experience in simple words. Nayak will help you review both sides and show what may strengthen or weaken your case.
          </p>
        </div>

        {/* Short Banner Disclaimer */}
        <div className="p-3.5 bg-secondary/35 border border-border/80 rounded text-xs text-muted-foreground flex gap-2 items-start">
          <span className="text-base mt-0.5">⚠️</span>
          <div>
            <span className="font-bold text-foreground block">Nayak is an organizing assistant, not a lawyer or court.</span>
            <span className="text-[11px] block mt-0.5 leading-normal">We help you review arguments. This tool does not give legal advice or make binding legal decisions.</span>
          </div>
        </div>

        {!canCreateCase ? (
          <div className="space-y-3 rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Briefcase className="h-4 w-4" />
              <span>{getRoleLabel(role)} access</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getRoleSummary(role)} This role is routed to assigned-case review workspaces rather than new case intake.
            </p>
          </div>
        ) : (
          /* Intake Form */
          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border p-6 rounded-lg shadow-sm">
          {error && (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive-foreground space-y-1">
                <strong className="block">Something went wrong</strong>
                <p>{error}</p>
              </div>
              {manualSafetyChecked && (
                <div className="p-3.5 border border-red-500/30 bg-red-500/5 rounded text-xs space-y-2">
                  <strong className="text-red-500 block">🚨 If you are in immediate danger, do not wait for this tool.</strong>
                  <p className="text-muted-foreground leading-relaxed">
                    Go to a safe place immediately and contact one of these helplines:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[9px]">Police / Emergency</span>
                      <span className="font-extrabold text-foreground text-xs">112 / 100</span>
                    </div>
                    <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[9px]">Women Helpline</span>
                      <span className="font-extrabold text-foreground text-xs">1091 / 181</span>
                    </div>
                    <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[9px]">Child Helpline</span>
                      <span className="font-extrabold text-foreground text-xs">1098</span>
                    </div>
                    <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[9px]">Cybercrime</span>
                      <span className="font-extrabold text-foreground text-xs">1930</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-muted-foreground block">Case Workspace Name</label>
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
            <label className="font-semibold text-muted-foreground block">Describe what happened in your own words</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., My landlord is refusing to return my security deposit of Rs 35,000. He claims there are property damages, but I lived there for 3 years and left the flat in good condition..."
              rows={5}
              className="w-full bg-secondary/20 border border-border rounded p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Manual Safety Flag Toggle */}
          <div className="flex items-start gap-2.5 p-3.5 rounded border border-red-500/20 bg-red-500/5 text-xs">
            <input
              type="checkbox"
              id="manualSafety"
              checked={manualSafetyChecked}
              onChange={(e) => setManualSafetyChecked(e.target.checked)}
              className="rounded border-border bg-card h-4 w-4 mt-0.5 text-red-500 focus:ring-1 focus:ring-red-400"
            />
            <label htmlFor="manualSafety" className="font-semibold text-foreground leading-snug cursor-pointer select-none">
              This situation involves immediate danger / I feel unsafe right now
              <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">Checking this will prioritize emergency helpline numbers and safety warnings in your workspace.</span>
            </label>
          </div>

          {/* strategy configuration */}
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-muted-foreground block">Opposing Strategy Style</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: "textualist", label: "Strictly by the book (literal)", desc: "Relies on the exact words of the law." },
                { id: "pragmatist", label: "Practical/Purpose-oriented", desc: "Focuses on the intent and real-world impact of the law." },
                { id: "precedent", label: "Based on past cases (precedents)", desc: "Relies on rulings made in similar cases in the past." }
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
              Private and Secure
            </span>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-6 shadow-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading Case...</span>
                </>
              ) : (
                <span>Review My Case</span>
              )}
            </button>
          </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
