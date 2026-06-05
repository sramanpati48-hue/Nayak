"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { Play, ShieldAlert, Scale, Loader2 } from "lucide-react";

export default function SimulationArenaIntake() {
  const router = useRouter();
  const { createSession } = useNyaybandhuStore();
  
  const [title, setTitle] = useState("Case Arguments Practice - Case A");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("textualist");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const sessionId = await createSession(title, description, "practice", strategy);
      router.push(`/nyaybandhu/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "Failed to initiate session");
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
            <Play className="h-4.5 w-4.5 text-primary" />
            <span>Practice Arena</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Set up a safe space to test your case arguments. Compare your claims against different strategies the other side might use.
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
            <label className="font-semibold text-muted-foreground block">Practice Session Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Brief Context */}
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-muted-foreground block">Case Context / Brief (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste key facts, written statements, or case details to help focus the practice session..."
              rows={4}
              className="w-full bg-secondary/20 border border-border rounded p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Strategy Option selection */}
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
                  <span>Starting...</span>
                </>
              ) : (
                <span>Start Practice Session</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
