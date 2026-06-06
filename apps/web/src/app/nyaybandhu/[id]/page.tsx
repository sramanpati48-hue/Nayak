"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore, TranscriptEvent } from "@/store/nyaybandhu";
import { buildSessionRequestQueryParams } from "@/lib/request-context";
import { useSessionContext } from "@/lib/session-context";
import { useTranslation } from "@/lib/language-context";
import { hasPermission } from "@/lib/rbac";
import { 
  Scale, 
  Play, 
  ArrowRight, 
  HelpCircle, 
  Award, 
  CheckCircle2, 
  Activity, 
  AlertTriangle,
  Loader2,
  Download,
  Info,
  ShieldCheck
} from "lucide-react";

import { formatGuidanceReport, triggerDownload, REPORT_VERSION } from "@/lib/report-formatter";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SessionPage({ params }: PageProps) {
  const { id } = use(params);
  
  const {
    activeSession,
    activeEvents,
    loading,
    error,
    fetchSessionDetails,
    answerCard,
    continueSession,
    finalizeSession,
    addInternNote,
    markLawyerReviewComplete,
    addEventStream
  } = useNyaybandhuStore();
  const { role } = useSessionContext();
  const { t, getRoleLabel, getRoleSummary } = useTranslation();

  const [streamingEvent, setStreamingEvent] = useState<Partial<TranscriptEvent> | null>(null);
  const [scores, setScores] = useState({ petitioner: 50, respondent: 50 });
  const [streamActive, setStreamActive] = useState(false);
  const [verdictReady, setVerdictReady] = useState(false);
  const [manualSafetyChecked, setManualSafetyChecked] = useState(false);
  const [internNote, setInternNote] = useState("");
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initial load
  useEffect(() => {
    fetchSessionDetails(id);
  }, [id]);

  // Sync manual safety toggle if preset in description
  useEffect(() => {
    if (activeSession?.description?.startsWith("[SAFETY_ALERT: TRUE]")) {
      setManualSafetyChecked(true);
    }
  }, [activeSession]);

  // Scroll to bottom when events update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeEvents, streamingEvent]);

  const handleExportGuidanceReport = () => {
    if (!activeSession || !activeSession.summary) return;
    const markdown = formatGuidanceReport(activeSession.title, activeSession.summary, activeSession.created_at.toString());
    const filename = `guidance-report-${activeSession.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    triggerDownload(markdown, filename);
  };

  const canAnswerCrossQuestions = hasPermission(role, "answer_cross_questions");
  const canExportReports = hasPermission(role, "export_reports");
  const canAddInternNotes = hasPermission(role, "add_intern_notes");
  const canMarkLawyerReviewComplete = hasPermission(role, "mark_lawyer_review_complete");
  const canViewJudgeWorkspace = hasPermission(role, "view_judge_evaluation_workspace");
  const canFinalizeSession = role === "normal_user" || canMarkLawyerReviewComplete;

  const handleSaveInternNote = async () => {
    if (!internNote.trim()) return;
    await addInternNote(id, internNote.trim());
    setInternNote("");
  };

  const handleMarkReviewComplete = async () => {
    await markLawyerReviewComplete(id, activeSession?.summary);
  };

  // Connect to SSE stream
  const startStream = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setStreamActive(true);
    setStreamingEvent(null);
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const query = (await buildSessionRequestQueryParams()).toString();
    const es = new EventSource(`${API_BASE_URL}/nyaybandhu/sessions/${id}/stream?${query}`);
    eventSourceRef.current = es;

    es.addEventListener("turn_started", (e: any) => {
      const data = JSON.parse(e.data);
      setStreamingEvent({
        id: "stream-temp",
        speaker: data.speaker,
        role: data.role,
        text: "",
        event_type: "argument"
      });
    });

    es.addEventListener("argument_chunk", (e: any) => {
      const data = JSON.parse(e.data);
      setStreamingEvent(prev => {
        if (!prev) return null;
        return { ...prev, text: (prev.text || "") + data.chunk };
      });
    });

    es.addEventListener("score_update", (e: any) => {
      const data = JSON.parse(e.data);
      setScores({ petitioner: data.petitioner, respondent: data.respondent });
    });

    es.addEventListener("clarification_card", (e: any) => {
      // Stream details will sync on done, but we can capture it here
    });

    es.addEventListener("verdict_ready", (e: any) => {
      setVerdictReady(true);
    });

    es.addEventListener("done", () => {
      es.close();
      setStreamActive(false);
      setStreamingEvent(null);
      // Re-fetch details from SQLite to sync official list
      fetchSessionDetails(id);
    });

    es.onerror = () => {
      es.close();
      setStreamActive(false);
      setStreamingEvent(null);
    };
  };

  // Close EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (loading && !activeSession) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">{t("session.loadingDetails")}</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !activeSession) {
    return (
      <DashboardLayout>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive-foreground max-w-lg mx-auto mt-12">
          <h3 className="font-bold mb-1">{t("session.accessError")}</h3>
          <p>{error || "The requested analysis workspace could not be found."}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Safety scanner calculations
  const isPresetSafety = activeSession.description?.startsWith("[SAFETY_ALERT: TRUE]");
  const cleanDescription = isPresetSafety 
    ? activeSession.description?.replace("[SAFETY_ALERT: TRUE]\n", "") 
    : activeSession.description;

  const dangerKeywords = ["violence", "threat", "abuse", "beat", "harassment", "hurt", "stalk", "cyber", "scam", "danger", "police", "kill", "harm", "assault", "force", "weapon", "hit", "physical"];
  const containsDangerKeywords = cleanDescription?.toLowerCase().split(/\W+/).some((word: string) => dangerKeywords.includes(word)) || activeSession.title.toLowerCase().split(/\W+/).some((word: string) => dangerKeywords.includes(word));
  
  // Prioritize warning if either manual toggle or keyword detector is active
  const showSafetyAlert = manualSafetyChecked || isPresetSafety || containsDangerKeywords;

  // Check if there is an active/unanswered clarification card
  const pendingCard = activeEvents.find(
    (e) => e.event_type === "clarification_request" && e.card_data && !e.card_data.answered
  );

  const rbacConfig = activeSession.config?.rbac || {};
  const internNotes = Array.isArray(rbacConfig.intern_notes) ? rbacConfig.intern_notes : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Workspace Session Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                activeSession.mode === "practice" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-accent/10 text-accent border-accent/20"
              }`}>
                {activeSession.mode === "practice" ? "Practice Arena" : "Real Case Review"}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                activeSession.status === "active"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-secondary text-muted-foreground border-border/50"
              }`}>
                {activeSession.status === "active" ? "Active" : "Finalized"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{activeSession.title}</h1>
            <p className="text-xs text-muted-foreground">
              Opposing Strategy Style: {activeSession.opposing_counsel_strategy === "textualist" ? "Strictly by the book (literal)" : activeSession.opposing_counsel_strategy === "pragmatist" ? "Practical/Purpose-oriented" : "Based on past cases (precedents)"}
            </p>
            <div className="rounded border border-border/60 bg-secondary/20 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground block">{getRoleLabel(role)}</span>
              <span>{getRoleSummary(role)}</span>
            </div>
          </div>

          {/* Action Control Panel */}
          {activeSession.status === "active" && !streamActive && (
            <div className="flex items-center gap-2">
              {canViewJudgeWorkspace ? (
                <span className="text-[10px] text-foreground font-semibold bg-secondary/40 px-2 py-1.5 rounded border border-border/60">
                  Judge workspace is read-only. Review the record and supporting summary below.
                </span>
              ) : pendingCard && canAnswerCrossQuestions ? (
                <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-1.5 rounded border border-amber-500/20 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Answer the question below to proceed
                </span>
              ) : verdictReady || activeEvents.length >= (activeSession.mode === "real-life" ? 22 : 7) ? (
                canFinalizeSession ? (
                  <button
                    onClick={canMarkLawyerReviewComplete ? handleMarkReviewComplete : () => finalizeSession(id)}
                    className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-5 shadow-sm transition-colors border border-primary/30"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{canMarkLawyerReviewComplete ? "Mark Lawyer Review Complete" : activeSession.mode === "real-life" ? "Get Case Guidance Report" : "Show Case Summary & Analysis"}</span>
                  </button>
                ) : null
              ) : canAnswerCrossQuestions ? (
                <button
                  onClick={startStream}
                  className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-5 shadow-sm transition-colors border border-primary/30"
                >
                  <Play className="h-4 w-4" />
                  <span>{activeEvents.length <= 1 ? "Start Case Review" : "Continue Case Review"}</span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Finalized Summary Dashboards */}
        {activeSession.status === "finalized" && (() => {
          if (activeSession.mode === "real-life") {
            let parsedSummary: any = null;
            try {
              if (activeSession.summary) {
                parsedSummary = JSON.parse(activeSession.summary);
              }
            } catch (e) {
              console.warn("Failed to parse dynamic summary:", e);
            }

            if (parsedSummary) {
              return (
                <div className="rounded-lg border border-primary/30 bg-card p-6 space-y-6 text-left">
                  {/* Report Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("session.guidanceReport")}</span>
                      <h2 className="text-lg font-bold text-foreground mt-0.5">{t("session.yourGuidanceReport")}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded">
                        Matter: {parsedSummary.matter_type}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                        parsedSummary.urgency_level === "high"
                          ? "bg-red-500/10 border-red-500/20 text-red-500"
                          : parsedSummary.urgency_level === "medium"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            : "bg-secondary border-border/50 text-muted-foreground"
                      }`}>
                        Urgency: {parsedSummary.urgency_level}
                      </span>
                      {canExportReports && (
                        <button
                          onClick={handleExportGuidanceReport}
                          className="text-[10px] uppercase font-bold px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded inline-flex items-center gap-1 transition-all"
                        >
                          <Download className="h-3 w-3" />
                          <span>{t("common.exportGuidanceReport")}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-3.5 bg-secondary/35 border border-border/80 rounded text-xs text-muted-foreground leading-relaxed">
                    <strong>{t("session.aboutReport")}</strong>: {parsedSummary.disclaimer || t("session.defaultDisclaimer")}
                  </div>

                  {/* 1. What Happened */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">1. What Happened (Your Story)</span>
                    <div className="pl-2 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                      {parsedSummary.facts?.map((fact: string, idx: number) => (
                        <p key={idx}>{fact}</p>
                      ))}
                    </div>
                  </div>

                  {/* 2. Case Strength Overview */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">2. Case Strength Overview</span>
                    <div className="pl-2 space-y-1">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span>{t("common.status")}:</span>
                        <span className="text-accent">{activeSession.verdict?.split(".")[0]}</span>
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {activeSession.verdict?.split(".").slice(1).join(".")}
                      </p>
                    </div>
                  </div>

                  {/* 3. Guidance Review */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">3. Guidance Review</span>
                    <p className="pl-2 text-xs text-muted-foreground leading-relaxed">
                      {parsedSummary.summary}
                    </p>
                  </div>

                  {/* Strengths & Gaps (Weaknesses) */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">{t("session.caseStrengths")}</span>
                      <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                        {parsedSummary.strengths?.map((str: string, idx: number) => (
                          <li key={idx}>{str}</li>
                        )) || <li>{t("session.noStrengths")}</li>}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">{t("session.challengesGaps")}</span>
                      <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                        {parsedSummary.weaknesses_or_gaps?.map((weak: string, idx: number) => (
                          <li key={idx}>{weak}</li>
                        )) || <li>{t("session.noGaps")}</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Timeline & People */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">{t("session.timeline")}</span>
                      <div className="pl-2 space-y-2 text-xs text-muted-foreground">
                        {parsedSummary.timeline?.map((t: any, idx: number) => (
                          <div key={idx} className="border-b border-border/30 pb-1.5 last:border-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">{t.date}</span>
                              <span className="text-[9px] uppercase bg-secondary px-1.5 py-0.5 rounded border border-border/50 font-semibold">{t.certainty}</span>
                            </div>
                            <p className="mt-0.5 leading-relaxed">{t.event}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">{t("session.peopleInvolved")}</span>
                      <div className="pl-2 space-y-2 text-xs text-muted-foreground">
                        {parsedSummary.people_involved?.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center border-b border-border/30 pb-1.5 last:border-0">
                            <div>
                              <span className="font-semibold text-foreground block">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground/80 block mt-0.5">{p.role}</span>
                            </div>
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold ${
                              p.status === "confirmed" 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            }`}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Relief Sought & Documents Check */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Relief Sought (What you want)</span>
                      <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                        {parsedSummary.relief_sought?.map((rel: string, idx: number) => (
                          <li key={idx}>{rel}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Documents Audit</span>
                      <div className="pl-2 space-y-2.5 text-xs text-muted-foreground">
                        {parsedSummary.documents_available?.map((d: any, idx: number) => (
                          <div key={idx} className="border-b border-border/30 pb-2 last:border-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">{d.document}</span>
                              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold ${
                                d.status === "available" 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                  : d.status === "missing" 
                                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              }`}>{d.status.replace(/_/g, " ")}</span>
                            </div>
                            <p className="mt-0.5 leading-relaxed text-[11px]">{d.relevance}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risks & Issues */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Immediate Risks</span>
                      <div className="pl-2 space-y-2 text-xs text-muted-foreground">
                        {parsedSummary.immediate_risks?.map((r: any, idx: number) => (
                          <div key={idx} className="border border-border/60 bg-secondary/15 rounded p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">{r.risk}</span>
                              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold ${
                                r.level === "high"
                                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                                  : r.level === "moderate"
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                    : "bg-secondary border-border/50 text-muted-foreground"
                              }`}>{r.level}</span>
                            </div>
                            <p className="leading-relaxed text-[11px]">{r.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Preliminary Legal Issues</span>
                      <div className="pl-2 space-y-2 text-xs text-muted-foreground">
                        {parsedSummary.legal_issues_preliminary?.map((i: any, idx: number) => (
                          <div key={idx} className="border border-border/60 bg-secondary/15 rounded p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">{i.issue}</span>
                              <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold ${
                                i.confidence === "high"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                  : i.confidence === "medium"
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                              }`}>{i.confidence} confidence</span>
                            </div>
                            <p className="leading-relaxed text-[11px]">{i.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Practical Next Steps & Seek Help */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">4. Practical Next Steps</span>
                      <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                        {parsedSummary.recommended_next_steps?.map((step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">5. Where You Can Seek Help</span>
                      <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                        {parsedSummary.safety_flag && (
                          <li className="text-red-400 font-semibold">Immediate safety danger: Go to a safe place and call Police (112) or Women Helpline (1091).</li>
                        )}
                        <li>District Legal Services Authority (DLSA) for free legal aid in your region.</li>
                        {parsedSummary.matter_type === "landlord-tenant" && (
                          <li>Rent Control Authority or local Sub-Divisional Magistrate (SDM).</li>
                        )}
                        {parsedSummary.matter_type === "employment/salary dispute" && (
                          <li>Labor Commissioner or regional labor aid cell.</li>
                        )}
                        {parsedSummary.matter_type === "consumer complaint" && (
                          <li>National Consumer Helpline (1915 / National Consumer Dispute Redressal Commission).</li>
                        )}
                        {parsedSummary.matter_type === "cyber abuse" && (
                          <li>National Cyber Crime Portal (1930 / cybercrime.gov.in).</li>
                        )}
                        <li>Consult a licensed advocate to draft and send a formal legal notice.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Follow-up Questions (Gaps) */}
                  {parsedSummary.follow_up_questions && parsedSummary.follow_up_questions.length > 0 && (
                    <div className="space-y-2 p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg">
                      <span className="font-bold text-amber-500 text-xs uppercase tracking-wider block text-left">Important Follow-up Questions to Address Gaps:</span>
                      <ul className="pl-6 list-decimal text-xs text-muted-foreground space-y-1.5 mt-1.5 text-left">
                        {parsedSummary.follow_up_questions.map((q: string, idx: number) => (
                          <li key={idx} className="font-medium text-foreground/90">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ── Trust & Review Section ── */}
                  <div className="border-t border-border/60 pt-5 mt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider">Trust & Review</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      This section helps you (and any lawyer or legal-aid volunteer reviewing this report)
                      see what was captured, what is still missing, and what needs professional verification.
                    </p>

                    {/* A. Facts We Understood */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">A. Facts We Understood</span>
                      {parsedSummary.facts && parsedSummary.facts.length > 0 ? (
                        <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                          {parsedSummary.facts.map((fact: string, idx: number) => (
                            <li key={idx}>{fact}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="pl-2 text-xs text-muted-foreground italic">No facts were captured from the description provided.</p>
                      )}
                    </div>

                    {/* B. Information Still Missing */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-amber-500 pl-2">B. Information Still Missing</span>
                      {parsedSummary.missing_information && parsedSummary.missing_information.length > 0 ? (
                        <ul className="pl-6 list-disc text-xs text-amber-400/90 space-y-1">
                          {parsedSummary.missing_information.map((m: string, idx: number) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="pl-2 text-xs text-muted-foreground italic">No obvious gaps detected, but a lawyer should still verify completeness.</p>
                      )}
                    </div>

                    {/* C. What Needs Lawyer / Legal-Aid Verification */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-red-400 pl-2">C. Needs Lawyer / Legal-Aid Verification</span>
                      {(() => {
                        const items = (parsedSummary.legal_issues_preliminary || []).filter((li: any) => li.confidence !== "high");
                        if (items.length > 0) {
                          return (
                            <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1.5">
                              {items.map((li: any, idx: number) => (
                                <li key={idx}>
                                  <span className="font-semibold text-foreground">{li.issue}</span>
                                  <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold uppercase">{li.confidence} confidence</span>
                                  {li.reason && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{li.reason}</p>}
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return (
                          <p className="pl-2 text-xs text-muted-foreground italic">All preliminary legal issues were assessed with high confidence, but a licensed advocate should still confirm.</p>
                        );
                      })()}
                    </div>

                    {/* D. Safety Warning (conditional) */}
                    {parsedSummary.safety_flag && (
                      <div className="p-3.5 border border-red-500/20 bg-red-500/5 rounded text-xs text-muted-foreground leading-relaxed space-y-1">
                        <strong className="text-red-500 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Safety Warning
                        </strong>
                        <p>This case involves safety concerns. If you or someone you know is in immediate danger, contact the helplines listed in the sidebar before taking any other action.</p>
                      </div>
                    )}

                    {/* Report Metadata */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                      <span className="inline-flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Report Generated: {new Date(activeSession.created_at).toLocaleString()}
                      </span>
                      <span>Report Version: {REPORT_VERSION}</span>
                      <span>Matter: {parsedSummary.matter_type || "Not classified"}</span>
                      <span>Urgency: {parsedSummary.urgency_level || "Not assessed"}</span>
                      <span>Safety Flag: {parsedSummary.safety_flag ? "Yes" : "No"}</span>
                    </div>

                    {canAddInternNotes && (
                      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <span className="font-semibold text-foreground text-xs uppercase tracking-wider block">{t("session.internNotes")}</span>
                        <p className="text-[11px] text-muted-foreground">
                          Record short case observations for the supervising lawyer. Notes are stored with the case record.
                        </p>
                        <textarea
                          value={internNote}
                          onChange={(e) => setInternNote(e.target.value)}
                          rows={3}
                          className="w-full rounded border border-border bg-card p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Summarize a discrepancy, missing document, or follow-up question..."
                        />
                        <button
                          type="button"
                          onClick={handleSaveInternNote}
                          className="inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-4"
                        >
                          {t("session.saveInternNote")}
                        </button>
                        {internNotes.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            {internNotes.map((note: any) => (
                              <div key={note.id} className="rounded border border-border/60 bg-card p-3 text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground">{note.note}</p>
                                <p className="mt-1 text-[10px] uppercase tracking-wider">{note.author_role} • {new Date(note.created_at).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {canViewJudgeWorkspace && (
                      <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <span className="font-semibold text-foreground text-xs uppercase tracking-wider block">{t("session.judgeWorkspace")}</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          This area is intentionally read-only. It surfaces the current record, structured notes, and report state without suggesting that the system is making a judicial decision.
                        </p>
                        <div className="text-[11px] text-muted-foreground space-y-1">
                          <p><span className="font-semibold text-foreground">Assigned roles:</span> {(rbacConfig.assigned_roles || []).join(", ") || "law_intern, lawyer, judge"}</p>
                          <p><span className="font-semibold text-foreground">{t("session.lawyerReviewComplete")}</span> {rbacConfig.lawyer_review_complete ? t("common.yes") : t("common.no")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          }

          // Fallback / standard real-life or practice render
          return (
            activeSession.mode === "real-life" ? (
              <div className="rounded-lg border border-primary/30 bg-card p-6 space-y-6 text-left">
                {/* Report Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Nayak Case Guidance Report</span>
                    <h2 className="text-lg font-bold text-foreground mt-0.5">Your Case Guidance Report</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-primary/20 border border-primary/30 text-primary font-bold">
                      Summary Ready
                    </span>
                    {canExportReports && (
                      <button
                        onClick={handleExportGuidanceReport}
                        className="text-[10px] uppercase font-bold px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded inline-flex items-center gap-1 transition-all"
                      >
                        <Download className="h-3 w-3" />
                        <span>Export Guidance Report</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="p-3.5 bg-secondary/35 border border-border/80 rounded text-xs text-muted-foreground leading-relaxed">
                  <strong>About this Guidance Report</strong>: This report is compiled by Nayak (a digital support tool) to help you organize your thoughts and see both sides of your issue. It is <strong>not</strong> legal advice, a court judgment, or an official decision. Always consult a qualified lawyer or legal aid service for legal representation.
                </div>

                {/* What Happened (Original Story) */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">1. Your Story</span>
                  <p className="pl-2 text-xs text-muted-foreground leading-relaxed">{cleanDescription}</p>
                </div>

                {/* Case Leaning */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">2. Case Strength Overview</span>
                  <div className="pl-2 space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      Leaning Status: <span className="text-accent">{activeSession.verdict?.split(".")[0]}</span>
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {activeSession.verdict?.split(".").slice(1).join(".")}
                    </p>
                  </div>
                </div>

                {/* Case Summary */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">3. Guidance Review</span>
                  <p className="pl-2 text-xs text-muted-foreground leading-relaxed">
                    {activeSession.summary}
                  </p>
                </div>

                {/* Next Steps and Where to Report */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">4. Practical Next Steps</span>
                    <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                      <li>Review the detailed points listed in the case logs.</li>
                      <li>Gather timestamped photos, emails, receipts, or contracts.</li>
                      <li>Send a written follow-up or demand notice to the other side if safe to do so.</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">5. Where You Can Seek Help</span>
                    <ul className="pl-6 list-disc text-xs text-muted-foreground space-y-1">
                      <li>Local police station (for danger or safety threats).</li>
                      <li>District Legal Services Authority (DLSA) for free legal aid.</li>
                      <li>National Consumer Helpline (1915) for consumer/cheating matters.</li>
                      <li>Cybercrime portal (1930) for online fraud or threat cases.</li>
                    </ul>
                  </div>
                </div>

                {showSafetyAlert && (
                  <div className="p-3 border border-red-500/20 bg-red-500/5 rounded text-xs text-muted-foreground">
                    <strong className="text-red-500">Urgent Safety Reminder</strong>: This matter involves safety concerns. We strongly encourage you to prioritize your safety and contact local authorities or the helplines listed on the right sidebar immediately.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3 text-left">
                {/* Verdict Gauge */}
                <div className="rounded-lg border border-primary/30 bg-card p-5 space-y-2 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("session.argumentLeaning")}</span>
                  <div className="text-3xl font-extrabold text-accent">{activeSession.verdict?.split(".")[0]}</div>
                  <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                    {activeSession.verdict?.split(".").slice(1).join(".")}
                  </p>
                </div>
                
                {/* Case Summary */}
                <div className="md:col-span-2 rounded-lg border border-border bg-card p-5 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Completed Case Summary</span>
                  <h4 className="text-xs font-bold text-foreground">How Your Arguments Look</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                    {activeSession.summary}
                  </p>
                </div>
              </div>
            )
          );
        })()}

        {/* Core Workspace Transcript Grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* Column 1-3: Transcript Column */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  {activeSession.mode === "real-life" ? "Case Review Board" : "Case Discussion Log"}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Privacy Protection Active
                </span>
              </div>

              {/* Log Messages */}
              <div className="p-6 space-y-6 max-h-[550px] overflow-y-auto min-h-[300px]">
                {(() => {
                  const isRealLife = activeSession.mode === "real-life";

                  // Derive phase boundaries: a new phase starts at each "argument" event
                  // following the initial startup event (index 0).
                  // Phase structure: [argument(s)] [clarification_request?]
                  type Phase = { index: number; events: typeof activeEvents };
                  const phases: Phase[] = [];
                  let current: Phase | null = null as Phase | null;

                  activeEvents.forEach((event, idx) => {
                    // Skip the opening startup event (bench/guide welcome)
                    if (idx === 0) {
                      current = { index: 1, events: [event] };
                      return;
                    }
                    // A new phase starts when we see an argument event after a clarification_request
                    // or when the previous event was a clarification_request that was answered
                    const prevEvent = activeEvents[idx - 1];
                    const isNewPhase =
                      event.event_type === "argument" &&
                      prevEvent &&
                      (prevEvent.event_type === "clarification_request" || idx === 1);

                    if (isNewPhase && idx > 1) {
                      if (current) phases.push(current);
                      current = { index: phases.length + 2, events: [event] };
                    } else {
                      if (current) {
                        current.events.push(event);
                      } else {
                        current = { index: 1, events: [event] };
                      }
                    }
                  });
                  if (current && current.events.length > 0) phases.push(current);

                  // Phase labels
                  const phaseLabels = isRealLife
                    ? ["Initial Review", "Opening Arguments", "Evidence & Timeline Review", "Final Assessment"]
                    : ["Opening Statements", "Opening Arguments", "Cross-Examination", "Closing Arguments"];

                  return phases.map((phase, pIdx) => (
                    <div key={pIdx} className="space-y-4">
                      {/* Phase divider (skip for the very first phase) */}
                      {pIdx > 0 && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-border/60" />
                          <span className="text-[9px] uppercase font-bold tracking-widest text-primary/70 bg-card px-2">
                            {phaseLabels[pIdx] || `Phase ${pIdx + 1}`}
                          </span>
                          <div className="flex-1 h-px bg-border/60" />
                        </div>
                      )}

                      {phase.events.map((event) => {
                        const isCard = event.event_type === "clarification_request";

                        let speakerName = event.speaker;
                        let speakerColor = "text-accent";
                        let borderStyle = "border-l-border/40";
                        let containerBg = "";

                        if (isRealLife) {
                          if (event.role === "bench" || event.speaker.toLowerCase().includes("bench")) {
                            speakerName = "Guide";
                            speakerColor = "text-accent font-bold";
                            borderStyle = "border-l-primary/50";
                          } else if (event.role === "petitioner" || event.speaker.toLowerCase().includes("petitioner")) {
                            speakerName = "Support Review";
                            speakerColor = "text-emerald-500 font-extrabold";
                            borderStyle = "border-l-emerald-500/40";
                            containerBg = "bg-emerald-500/5 p-2 rounded-r";
                          } else if (event.role === "respondent" || event.speaker.toLowerCase().includes("opposing")) {
                            speakerName = "Challenge Review";
                            speakerColor = "text-amber-500 font-extrabold";
                            borderStyle = "border-l-amber-500/40";
                            containerBg = "bg-amber-500/5 p-2 rounded-r";
                          }
                        } else {
                          if (event.role === "bench") {
                            speakerColor = "text-primary";
                            borderStyle = "border-l-primary/40";
                          }
                          if (event.role === "respondent") {
                            speakerColor = "text-red-400/80";
                            borderStyle = "border-l-red-400/20";
                          }
                        }

                        return (
                          <div key={event.id} className="space-y-2">
                            {/* Argument row */}
                            {!isCard && (
                              <div className={`space-y-1 text-xs border-l-2 pl-3 ${borderStyle} ${containerBg}`}>
                                <div className="flex items-center justify-between">
                                  <span className={`font-semibold ${speakerColor}`}>
                                    {speakerName}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-muted-foreground leading-relaxed text-left">{event.text}</p>
                              </div>
                            )}

                            {/* Cross-question / Clarification card — rendered as a distinct card row */}
                            {isCard && event.card_data && (
                              <div className="my-2">
                                {/* Card header label */}
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`h-px flex-1 ${event.card_data.side === "left" ? "bg-amber-500/30" : "bg-primary/30"}`} />
                                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                                    event.card_data.side === "left"
                                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                      : "bg-primary/10 border-primary/20 text-primary"
                                  }`}>
                                    {isRealLife
                                      ? (event.card_data.side === "left" ? "Cross-Question — Challenge Review" : "Cross-Question — Guide")
                                      : (event.card_data.side === "left" ? "Cross-Question — Opposing Counsel" : "Cross-Question — Bench")
                                    }
                                  </span>
                                  <div className={`h-px flex-1 ${event.card_data.side === "left" ? "bg-amber-500/30" : "bg-primary/30"}`} />
                                </div>

                                {/* Card body */}
                                <div className={`flex w-full ${
                                  event.card_data.side === "left" ? "justify-start" : "justify-end"
                                }`}>
                                  <div className={`w-full max-w-md rounded-lg border p-4 bg-secondary/25 shadow-sm text-xs space-y-3 ${
                                    event.card_data.side === "left"
                                      ? "border-amber-500/25 border-l-2 border-l-amber-400"
                                      : "border-primary/25 border-r-2 border-r-primary"
                                  }`}>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                      <HelpCircle className="h-3.5 w-3.5" />
                                      <span>{isRealLife ? "Your input needed" : "Counsel must respond"}</span>
                                    </div>

                                    <p className="font-semibold text-foreground text-left">{event.card_data.question}</p>

                                    {/* Context text from the event */}
                                    {event.text && event.text !== event.card_data.question && (
                                      <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-border/40 pl-2">{event.text}</p>
                                    )}

                                    {/* Options */}
                                    <div className="space-y-2 pt-1.5">
                                      {event.card_data.options.map((opt, oIdx) => {
                                        const isAnswered = event.card_data?.answered;
                                        const isSelected = event.card_data?.selected_option === opt;

                                        return (
                                          <button
                                            key={oIdx}
                                            disabled={isAnswered || streamActive || !canAnswerCrossQuestions}
                                            onClick={() => answerCard(id, event.id, opt)}
                                            className={`w-full p-2.5 rounded border text-left text-xs transition-all ${
                                              isSelected
                                                ? "border-primary bg-primary/10 text-accent font-semibold"
                                                : isAnswered || !canAnswerCrossQuestions
                                                  ? "border-border/40 text-muted-foreground bg-secondary/5 cursor-not-allowed"
                                                  : "border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground bg-card"
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Answered badge */}
                                    {event.card_data.answered && (
                                      <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wider pt-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>{t("common.answered")}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}

                {/* SSE active stream turn rendering */}
                {streamingEvent && (() => {
                  const isRealLife = activeSession.mode === "real-life";
                  let speakerName = streamingEvent.speaker;
                  let speakerColor = "text-accent";
                  let borderStyle = "border-l-primary";

                  if (isRealLife) {
                    if (streamingEvent.role === "bench" || streamingEvent.speaker?.toLowerCase().includes("bench")) {
                      speakerName = "Guide";
                      speakerColor = "text-accent font-bold";
                    } else if (streamingEvent.role === "petitioner" || streamingEvent.speaker?.toLowerCase().includes("petitioner")) {
                      speakerName = "Support Review";
                      speakerColor = "text-emerald-500 font-extrabold";
                      borderStyle = "border-l-emerald-500";
                    } else if (streamingEvent.role === "respondent" || streamingEvent.speaker?.toLowerCase().includes("opposing")) {
                      speakerName = "Challenge Review";
                      speakerColor = "text-amber-500 font-extrabold";
                      borderStyle = "border-l-amber-500";
                    }
                  } else {
                    if (streamingEvent.role === "bench") {
                      speakerColor = "text-primary";
                    }
                    if (streamingEvent.role === "respondent") {
                      speakerColor = "text-red-400/80";
                    }
                  }

                  return (
                    <div className={`space-y-1 text-xs border-l pl-3 ${borderStyle} animate-pulse`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${speakerColor}`}>
                          {speakerName} (Reviewing...)
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-left">{streamingEvent.text}</p>
                    </div>
                  );
                })()}
                
                <div ref={scrollRef} />
              </div>
            </div>
          </div>

          {/* Column 4: Score / Assessment Gauges / Helplines */}
          <div className="space-y-6 text-left">
            {activeSession.mode === "real-life" ? (
              <>
                {/* Manual Safety Toggle */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{t("session.safetySettings")}</span>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={manualSafetyChecked}
                      onChange={(e) => setManualSafetyChecked(e.target.checked)}
                      className="rounded border-border bg-card h-4 w-4 mt-0.5 text-red-500 focus:ring-1 focus:ring-red-400"
                    />
                    <span className="font-semibold text-foreground leading-snug">
                      This situation involves immediate danger / I feel unsafe right now
                    </span>
                  </label>
                </div>

                {/* Case Strength Overview Gauge */}
                <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Case Strength Overview</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {showSafetyAlert ? "🔴" : scores.petitioner >= 65 ? "🟢" : scores.petitioner >= 45 ? "🟡" : "⚪"}
                      </span>
                      <span className="font-extrabold text-foreground text-xs uppercase tracking-wider">
                        {showSafetyAlert 
                          ? "Urgent help needed" 
                          : scores.petitioner >= 65 
                            ? "Strong enough to explore further" 
                            : scores.petitioner >= 45 
                              ? "Needs more proof" 
                              : "Unclear at this stage"}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {showSafetyAlert 
                        ? "This situation involves safety risks or ongoing danger. Please check the helplines below and seek help immediately." 
                        : scores.petitioner >= 65 
                          ? "Your arguments look solid, and you have key points supporting your claim. It is worth discussing this with a lawyer or filing an official complaint." 
                          : scores.petitioner >= 45 
                            ? "You have a valid concern, but you will need more evidence (like documents, receipts, or messages) to prove it." 
                            : "We need more details. Answer the helpful questions on screen to help us analyze the situation."}
                    </p>
                  </div>
                </div>

                {/* Emergency Helplines Card */}
                {showSafetyAlert && (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-lg space-y-3 text-xs animate-in fade-in duration-200">
                    <div className="flex gap-2 items-start text-red-500">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-red-400">🚨 Urgent Safety Notice</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                          If you are in immediate physical danger, experiencing domestic violence, threats, or abuse, please go to a safe place immediately and call for help.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-red-500/20 pt-2.5 space-y-2">
                      <span className="font-semibold text-foreground block text-[9px] uppercase tracking-wide">Emergency Helplines (India)</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                          <span className="text-muted-foreground block text-[9px]">Police</span>
                          <span className="font-extrabold text-foreground text-xs">112 / 100</span>
                        </div>
                        <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                          <span className="text-muted-foreground block text-[9px]">Women</span>
                          <span className="font-extrabold text-foreground text-xs">1091 / 181</span>
                        </div>
                        <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                          <span className="text-muted-foreground block text-[9px]">Child Help</span>
                          <span className="font-extrabold text-foreground text-xs">1098</span>
                        </div>
                        <div className="p-2 bg-secondary/35 rounded border border-border/40 text-center">
                          <span className="text-muted-foreground block text-[9px]">Cybercrime</span>
                          <span className="font-extrabold text-foreground text-xs">1930</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {canAddInternNotes && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground uppercase tracking-wider">{t("session.internNotes")}</span>
                      <span className="text-[9px] uppercase tracking-wider text-primary">Review support</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Capture short observations, missing documents, or follow-up questions for the supervising lawyer.
                    </p>
                    <textarea
                      value={internNote}
                      onChange={(e) => setInternNote(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-border bg-card p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Summarize a discrepancy, missing document, or follow-up question..."
                    />
                    <button
                      type="button"
                      onClick={handleSaveInternNote}
                      className="inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-4"
                    >
                      {t("session.saveInternNote")}
                    </button>
                    {internNotes.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        {internNotes.map((note: any) => (
                          <div key={note.id} className="rounded border border-border/60 bg-card p-3 text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">{note.note}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider">{note.author_role} • {new Date(note.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canViewJudgeWorkspace && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-bold text-foreground uppercase tracking-wider">{t("session.judgeWorkspace")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      This area is read-only. It surfaces the record and structured notes without implying that the system is making a judicial decision.
                    </p>
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p><span className="font-semibold text-foreground">Assigned roles:</span> {(rbacConfig.assigned_roles || []).join(", ") || "law_intern, lawyer, judge"}</p>
                      <p><span className="font-semibold text-foreground">Lawyer review complete:</span> {rbacConfig.lawyer_review_complete ? "Yes" : "No"}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-primary" />
                  <span>Argument Strength Meter</span>
                </h3>
                
                <div className="space-y-4 text-xs">
                  {/* Petitioner */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="font-semibold text-foreground">Petitioner (your side) Strength</span>
                      <span className="font-bold text-primary">{scores.petitioner}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        role="progressbar"
                        aria-label="Petitioner (your side) argument strength"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={scores.petitioner}
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${scores.petitioner}%` }}
                      />
                    </div>
                  </div>

                  {/* Respondent */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="font-semibold text-foreground">Respondent (the other side) Strength</span>
                      <span className="font-bold text-red-400/80">{scores.respondent}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        role="progressbar"
                        aria-label="Respondent (the other side) argument strength"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={scores.respondent}
                        className="h-full bg-red-400/70 transition-all duration-500" 
                        style={{ width: `${scores.respondent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
