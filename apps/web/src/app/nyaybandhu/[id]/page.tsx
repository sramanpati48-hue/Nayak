"use client";

import React, { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore, TranscriptEvent } from "@/store/nyaybandhu";
import { 
  Scale, 
  Play, 
  ArrowRight, 
  HelpCircle, 
  Award, 
  CheckCircle2, 
  Activity, 
  AlertTriangle,
  Loader2
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SessionPage({ params }: PageProps) {
  const { id } = React.use(params);
  
  const {
    activeSession,
    activeEvents,
    loading,
    error,
    fetchSessionDetails,
    answerCard,
    continueSession,
    finalizeSession,
    addEventStream
  } = useNyaybandhuStore();

  const [streamingEvent, setStreamingEvent] = useState<Partial<TranscriptEvent> | null>(null);
  const [scores, setScores] = useState({ petitioner: 50, respondent: 50 });
  const [streamActive, setStreamActive] = useState(false);
  const [verdictReady, setVerdictReady] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initial load
  useEffect(() => {
    fetchSessionDetails(id);
  }, [id]);

  // Scroll to bottom when events update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeEvents, streamingEvent]);

  // Connect to SSE stream
  const startStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setStreamActive(true);
    setStreamingEvent(null);
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const es = new EventSource(`${API_BASE_URL}/nyaybandhu/sessions/${id}/stream`);
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
          <span className="text-xs text-muted-foreground">Loading your case details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !activeSession) {
    return (
      <DashboardLayout>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive-foreground max-w-lg mx-auto mt-12">
          <h3 className="font-bold mb-1">Session Access Error</h3>
          <p>{error || "The requested analysis workspace could not be found."}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Check if there is an active/unanswered clarification card
  const pendingCard = activeEvents.find(
    (e) => e.event_type === "clarification_request" && e.card_data && !e.card_data.answered
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Workspace Session Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                activeSession.mode === "practice" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-accent/10 text-accent border-accent/20"
              }`}>
                {activeSession.mode === "practice" ? "Practice Arena" : "Check Real Arguments"}
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
              Other Side's Strategy: {activeSession.opposing_counsel_strategy === "textualist" ? "Strictly by the book (literal)" : "Flexible (dynamic)"}
            </p>
          </div>

          {/* Action Control Panel */}
          {activeSession.status === "active" && !streamActive && (
            <div className="flex items-center gap-2">
              {pendingCard ? (
                <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-1.5 rounded border border-amber-500/20 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Answer the question below to proceed
                </span>
              ) : verdictReady || activeEvents.length >= 7 ? (
                <button
                  onClick={() => finalizeSession(id)}
                  className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-5 shadow-sm transition-colors border border-primary/30"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Show Case Summary & Analysis</span>
                </button>
              ) : (
                <button
                  onClick={startStream}
                  className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-5 shadow-sm transition-colors border border-primary/30"
                >
                  <Play className="h-4 w-4" />
                  <span>{activeEvents.length <= 1 ? "Start Case Discussion" : "Continue Discussion"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Finalized Summary Dashboards */}
        {activeSession.status === "finalized" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Verdict Gauge */}
            <div className="rounded-lg border border-primary/30 bg-card p-5 space-y-2 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Argument Leaning</span>
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
        )}

        {/* Core Workspace Transcript Grid */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* Column 1-3: Transcript Column */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">Case Discussion Log</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Privacy Protection Active
                </span>
              </div>

              {/* Log Messages */}
              <div className="p-6 space-y-6 max-h-[550px] overflow-y-auto min-h-[300px]">
                {activeEvents.map((event) => {
                  const isCard = event.event_type === "clarification_request";
                  
                  // Speaker color configurations
                  let speakerColor = "text-accent";
                  if (event.role === "bench") speakerColor = "text-primary";
                  if (event.role === "respondent") speakerColor = "text-red-400/80";
                  
                  return (
                    <div key={event.id} className="space-y-2">
                      {/* Standard dialogue log */}
                      <div className="space-y-1 text-xs border-l border-border/40 pl-3">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${speakerColor}`}>
                            {event.speaker}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-left">{event.text}</p>
                      </div>

                      {/* Clarification card render */}
                      {isCard && event.card_data && (
                        <div className={`flex w-full mt-3 ${
                          event.card_data.side === "left" ? "justify-start" : "justify-end"
                        }`}>
                          <div className={`w-full max-w-sm rounded border p-4 bg-secondary/25 shadow-sm text-xs space-y-3 ${
                            event.card_data.side === "left" 
                              ? "border-red-500/25 border-l-2 border-l-red-400" 
                              : "border-primary/25 border-r-2 border-r-primary"
                          }`}>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              <HelpCircle className="h-3.5 w-3.5" />
                              <span>Helpful Question ({event.card_data.side === "left" ? "Other Side" : "Guide"})</span>
                            </div>
                            
                            <p className="font-semibold text-foreground text-left">{event.card_data.question}</p>
                            
                            {/* Options selection */}
                            <div className="space-y-2 pt-1.5">
                              {event.card_data.options.map((opt, oIdx) => {
                                const isAnswered = event.card_data?.answered;
                                const isSelected = event.card_data?.selected_option === opt;
                                
                                return (
                                  <button
                                    key={oIdx}
                                    disabled={isAnswered || streamActive}
                                    onClick={() => answerCard(id, event.id, opt)}
                                    className={`w-full p-2.5 rounded border text-left text-xs transition-all ${
                                      isSelected
                                        ? "border-primary bg-primary/10 text-accent font-semibold"
                                        : isAnswered
                                          ? "border-border/40 text-muted-foreground bg-secondary/5 cursor-not-allowed"
                                          : "border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground bg-card"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* SSE active stream turn rendering */}
                {streamingEvent && (
                  <div className="space-y-1 text-xs border-l border-primary pl-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${
                        streamingEvent.role === "bench" ? "text-primary" : streamingEvent.role === "respondent" ? "text-red-400/80" : "text-accent"
                      }`}>
                        {streamingEvent.speaker} (Streaming)
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-left">{streamingEvent.text}</p>
                  </div>
                )}
                
                <div ref={scrollRef} />
              </div>
            </div>
          </div>

          {/* Column 4: Score / Assessment Gauges */}
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />
                <span>Argument Strength Meter</span>
              </h3>
              
              <div className="space-y-4 text-xs">
                {/* Petitioner */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="font-semibold text-foreground">Petitioner (Your side) Strength</span>
                    <span className="font-bold text-primary">{scores.petitioner}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      role="progressbar"
                      aria-label="Petitioner (Your side) argument strength"
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
                    <span className="font-semibold text-foreground">Respondent (The other side) Strength</span>
                    <span className="font-bold text-red-400/80">{scores.respondent}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      role="progressbar"
                      aria-label="Respondent (The other side) argument strength"
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
