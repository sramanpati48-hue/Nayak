"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useVicharakBandhuStore, BenchNoteEntry } from "@/store/vicharakbandhu";
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Mic, 
  Layers, 
  Award, 
  CheckSquare, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  FileCheck,
  AlertTriangle,
  Loader2,
  FileArchive
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewWorkspacePage({ params }: PageProps) {
  const { id } = use(params);
  
  const {
    activeReview,
    activeDocuments,
    activeEntries,
    loading,
    error,
    fetchReviewDetails,
    ingestText,
    uploadFile,
    createEntry,
    updateEntry,
    deleteEntry,
    compileReport
  } = useVicharakBandhuStore();

  // Text intake state
  const [inputText, setInputText] = useState("");
  
  // File upload state
  const docInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // Form states for creating/editing entries
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategory, setFormCategory] = useState("timeline");
  const [formSide, setFormSide] = useState("neutral");
  const [formMateriality, setFormMateriality] = useState("medium");
  const [formVerification, setFormVerification] = useState("unverified");
  const [formSource, setFormSource] = useState("");
  const [formEffect, setFormEffect] = useState(0);
  const [formEffectType, setFormEffectType] = useState("neutral");
  const [formSourceStrength, setFormSourceStrength] = useState("moderate");
  const [formAiDetected, setFormAiDetected] = useState(false);

  useEffect(() => {
    fetchReviewDetails(id);
  }, [id]);

  const handleTextIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await ingestText(id, inputText);
    setInputText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "voice") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFile(id, files[0], type);
  };

  const openNewNoteForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormBody("");
    setFormCategory("timeline");
    setFormSide("neutral");
    setFormMateriality("medium");
    setFormVerification("unverified");
    setFormSource("");
    setFormEffect(0);
    setFormEffectType("neutral");
    setFormSourceStrength("moderate");
    setFormAiDetected(false);
    setNoteFormOpen(true);
  };

  const openEditNoteForm = (entry: BenchNoteEntry) => {
    setEditingId(entry.id);
    setFormTitle(entry.title);
    setFormBody(entry.note_body);
    setFormCategory(entry.category);
    setFormSide(entry.side_impact);
    setFormMateriality(entry.materiality);
    setFormVerification(entry.verification_status);
    setFormSource(entry.source_reference || "");
    setFormEffect(entry.confidence_effect);
    setFormEffectType(entry.effect_type || "neutral");
    setFormSourceStrength(entry.source_strength || "moderate");
    setFormAiDetected(entry.ai_detected || false);
    setNoteFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) return;

    const payload = {
      title: formTitle,
      note_body: formBody,
      category: formCategory,
      side_impact: formSide,
      materiality: formMateriality,
      verification_status: formVerification,
      source_reference: formSource || undefined,
      confidence_effect: Number(formEffect),
      effect_type: formEffectType,
      source_strength: formSourceStrength,
      ai_detected: formAiDetected
    };

    if (editingId) {
      await updateEntry(editingId, payload);
    } else {
      await createEntry(id, payload);
    }
    setNoteFormOpen(false);
  };

  if (loading && !activeReview) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Retrieving case folders...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !activeReview) {
    return (
      <DashboardLayout>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive-foreground max-w-lg mx-auto mt-12">
          <h3 className="font-bold mb-1">Access Denied</h3>
          <p>{error || "Case record directory not found."}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Workspace Title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary">VicharakBandhu workspace</span>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              <span>{activeReview.title}</span>
            </h1>
          </div>
          
          {activeReview.status === "active" && (
            <button
              onClick={() => compileReport(id)}
              className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-5 shadow-sm transition-colors border border-primary/30"
            >
              <FileCheck className="h-4 w-4" />
              <span>Compile Final Report</span>
            </button>
          )}
        </div>

        {/* Final Report compiled view */}
        {activeReview.status === "finalized" && activeReview.report && (
          <div className="rounded-lg border border-primary/30 bg-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
              <div className="text-left">
                <span className="text-xs font-bold text-accent uppercase tracking-wider block">Structured Review Report (Helpful Summary)</span>
                <span className="text-[10px] text-muted-foreground">
                  Compiled: {new Date(activeReview.report.compiled_at).toLocaleString()}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-primary/20 border border-primary/30 text-primary font-bold">
                Summary Complete
              </span>
            </div>

            {/* Case Overview */}
            {activeReview.report.case_overview && (
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Case Overview</h4>
                <div className="p-3 bg-secondary/10 rounded border border-border/40 text-xs text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground block">{activeReview.report.case_overview.title}</span>
                  <p className="leading-relaxed">{activeReview.report.case_overview.summary}</p>
                </div>
              </div>
            )}

            {/* Extracted Case Structure */}
            {activeReview.report.extracted_structure && (
              <div className="grid gap-4 md:grid-cols-2 text-left">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Extracted Timeline</h4>
                  <div className="p-3 bg-secondary/10 rounded border border-border/40 text-xs space-y-2 max-h-40 overflow-y-auto">
                    {activeReview.report.extracted_structure.timeline?.map((t: any, i: number) => (
                      <div key={i} className="text-[11px] leading-normal">
                        <span className="font-semibold text-primary block">{t.time}</span>
                        <span className="text-muted-foreground">{t.event}</span>
                      </div>
                    )) || <span className="text-muted-foreground">No timeline events extracted.</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Claims & Points of View Found</h4>
                  <div className="p-3 bg-secondary/10 rounded border border-border/40 text-xs space-y-2 max-h-40 overflow-y-auto">
                    {activeReview.report.extracted_structure.claims?.map((c: any, i: number) => (
                      <div key={i} className="text-[11px] leading-normal">
                        <span className="font-semibold text-accent block">{c.side} Stand</span>
                        <span className="text-muted-foreground">{c.text}</span>
                      </div>
                    )) || <span className="text-muted-foreground">No claims extracted.</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Bench Notes Summary */}
            {activeReview.report.bench_notes_summary && (
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Case Notes Summary</h4>
                <div className="p-3.5 bg-secondary/10 rounded border border-border/40 text-xs space-y-3">
                  <div className="flex flex-wrap gap-4 text-muted-foreground font-semibold">
                    <span>Total Notes: <span className="text-foreground">{activeReview.report.bench_notes_summary.total_notes}</span></span>
                    <span>Timeline: <span className="text-foreground">{activeReview.report.bench_notes_summary.timeline_count}</span></span>
                    <span>Citations: <span className="text-foreground">{activeReview.report.bench_notes_summary.citation_count}</span></span>
                    <span>Testimonies: <span className="text-foreground">{activeReview.report.bench_notes_summary.testimony_count}</span></span>
                  </div>
                  {activeReview.report.bench_notes_summary.notes && activeReview.report.bench_notes_summary.notes.length > 0 && (
                    <div className="space-y-2 border-t border-border/40 pt-2.5 max-h-44 overflow-y-auto">
                      {activeReview.report.bench_notes_summary.notes.map((note: any, i: number) => (
                        <div key={i} className="text-[11px] leading-normal flex justify-between gap-4 border-b border-border/30 pb-1.5 last:border-b-0">
                          <div>
                            <span className="font-bold text-foreground block">{note.title}</span>
                            <span className="text-muted-foreground text-[10px]">
                              Category: {note.category} | Materiality: {note.materiality} | Ref: {note.source_reference || "N/A"}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold block ${note.confidence_effect < 0 ? 'text-red-400' : 'text-primary'}`}>
                              {note.confidence_effect > 0 ? '+' : ''}{note.confidence_effect}%
                            </span>
                            <span className="text-[10px] text-muted-foreground block capitalize">{note.side_impact}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confidence Summary */}
            {activeReview.report.confidence_summary && (
              <div className="grid gap-4 md:grid-cols-2 text-left">
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Side Strength Checklist</h4>
                  <div className="p-3 bg-secondary/10 rounded border border-border/40 space-y-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="font-semibold text-foreground">Petitioner (your side) Strength</span>
                        <span className="font-bold text-primary">{activeReview.report.confidence_summary.side_a_confidence}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-label="Report Petitioner side confidence score"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={activeReview.report.confidence_summary.side_a_confidence}
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${activeReview.report.confidence_summary.side_a_confidence}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="font-semibold text-foreground">Respondent (the other side) Strength</span>
                        <span className="font-bold text-primary">{activeReview.report.confidence_summary.side_b_confidence}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-label="Report Respondent side confidence score"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={activeReview.report.confidence_summary.side_b_confidence}
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${activeReview.report.confidence_summary.side_b_confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Caution Flags</h4>
                  <div className="p-3 bg-secondary/10 rounded border border-border/40 text-xs space-y-2 max-h-36 overflow-y-auto">
                    {activeReview.report.caution_flags && activeReview.report.caution_flags.length > 0 ? (
                      activeReview.report.caution_flags.map((flag: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start border border-red-500/20 bg-red-500/5 p-2 rounded text-[11px]">
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-red-400 block">{flag.title}</span>
                            <span className="text-muted-foreground leading-normal block mt-0.5">{flag.description}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No critical caution flags active.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Points to Keep in Mind */}
            {activeReview.report.points_to_keep_in_mind && activeReview.report.points_to_keep_in_mind.length > 0 && (
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-l-2 border-accent pl-2">Points to Keep in Mind</h4>
                <ul className="p-3.5 bg-secondary/10 rounded border border-border/40 text-xs text-muted-foreground space-y-2.5">
                  {activeReview.report.points_to_keep_in_mind.map((point: any) => (
                    <li key={point.id} className="flex gap-2 items-start border-l border-primary/50 pl-2 text-[11px] leading-relaxed">
                      <span>{point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Findings & Assistive Review Disclaimer */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-2 text-muted-foreground leading-relaxed text-left">
              <span className="font-bold text-foreground block">Review Findings Digest:</span>
              <p>{activeReview.report.findings_summary}</p>
              <div className="border-t border-border/50 pt-2.5 text-[10px] italic text-muted-foreground/80 flex items-start gap-1.5 mt-2">
                <Settings className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                <span><strong>Note on AI Assistance</strong>: VicharakBandhu outputs, checklists, warning flags, and reports are designed strictly as a helpful organizing tool. They do not represent real court decisions, legal judgments, or legal advice. All assessments should be checked by a human.</span>
              </div>
            </div>
          </div>
        )}

        {/* 3-Panel Grid Structure */}
        <div className="grid gap-5 lg:grid-cols-3">
          
          {/* Left Panel: Intake & Ingestion */}
          <div className="space-y-5">
            {/* Ingestion Slots */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2">
                Add Case Information
              </h3>
              
              {/* Text Intake Form */}
              <form onSubmit={handleTextIngest} className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground block">Type or Paste Case Details</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste case text or details here to review timeline and facts..."
                  rows={3}
                  className="w-full bg-secondary/20 border border-border rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-8 px-4 w-full transition-colors"
                >
                  Save Text Details
                </button>
              </form>

              <div className="border-t border-border/50 pt-4 space-y-3">
                <span className="text-[11px] font-semibold text-muted-foreground block">Upload Document or Voice Files</span>
                
                {/* Audio Upload */}
                <div>
                  <input
                    type="file"
                    ref={voiceInputRef}
                    onChange={(e) => handleFileUpload(e, "voice")}
                    accept="audio/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => voiceInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border border-border hover:bg-secondary/40 h-9 rounded text-xs text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Mic className="h-4 w-4 text-primary" />
                    <span>Upload Recorded Tapes</span>
                  </button>
                </div>

                {/* Doc Upload */}
                <div>
                  <input
                    type="file"
                    ref={docInputRef}
                    onChange={(e) => handleFileUpload(e, "document")}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border border-border hover:bg-secondary/40 h-9 rounded text-xs text-muted-foreground hover:text-foreground transition-all"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Upload Case Documents</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {activeDocuments.length > 0 && (
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Uploaded Files</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeDocuments.map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center text-[11px] text-muted-foreground border-b border-border/40 pb-1.5">
                        <span className="truncate max-w-[150px] font-medium text-foreground">{doc.filename}</span>
                        <span className="capitalize text-[10px] bg-secondary border border-border/40 px-1 rounded text-foreground">
                          {doc.file_type} ({(doc.file_size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Extracted Case Structure */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2">
                Case Timeline & Arguments
              </h3>
              
              {activeReview.structure ? (
                <div className="space-y-4 text-xs">
                  {/* Timeline */}
                  {activeReview.structure.timeline && (
                    <div className="space-y-2">
                      <span className="font-semibold text-foreground block">Timeline of Events</span>
                      <div className="space-y-2 border-l border-border/50 ml-2 pl-3">
                        {activeReview.structure.timeline.map((t, idx) => (
                          <div key={idx} className="relative space-y-0.5 text-[11px]">
                            <span className="font-semibold text-primary block">{t.time}</span>
                            <span className="text-muted-foreground text-left block leading-normal">{t.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Claims */}
                  {activeReview.structure.claims && (
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <span className="font-semibold text-foreground block">Key Arguments Found</span>
                      <div className="space-y-2">
                        {activeReview.structure.claims.map((c, idx) => (
                          <div key={idx} className="space-y-0.5 text-[11px]">
                            <span className="font-semibold text-accent block">
                              {c.side === "side_a" ? "Petitioner (your side)" : c.side === "side_b" ? "Respondent (the other side)" : c.side} Stand
                            </span>
                            <span className="text-muted-foreground text-left block leading-normal">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Timeline and arguments will appear here automatically after you paste text or upload files.
                </div>
              )}
            </div>
          </div>

          {/* Center Panel: Bench Notes / Record Entries */}
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Case Notes & Checklist</span>
                </h3>
                
                {activeReview.status === "active" && (
                  <button
                    onClick={openNewNoteForm}
                    className="p-1 border border-border hover:bg-secondary rounded text-primary hover:text-accent transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* CRUD Entry Form */}
              {noteFormOpen && activeReview.status === "active" && (
                <form onSubmit={handleFormSubmit} className="p-4 border border-primary/20 bg-secondary/15 rounded-lg space-y-3 text-xs">
                  <span className="font-bold text-accent block border-b pb-1 mb-2">
                    {editingId ? "Edit Case Note" : "Create Case Note"}
                  </span>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground block">Title</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full h-8 bg-card border border-border rounded px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground block">Note Details</label>
                    <textarea
                      required
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      rows={2}
                      className="w-full bg-card border border-border rounded p-2"
                    />
                  </div>

                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Note Type</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2"
                      >
                        <option value="timeline">Date or Timeline</option>
                        <option value="citation">Document Citation</option>
                        <option value="testimony">Witness Statement</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Who does this help?</label>
                      <select
                        value={formSide}
                        onChange={(e) => setFormSide(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2"
                      >
                        <option value="petitioner">Petitioner (your side)</option>
                        <option value="respondent">Respondent (the other side)</option>
                        <option value="neutral">Neutral / Unsure</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">How important is this?</label>
                      <select
                        value={formMateriality}
                        onChange={(e) => setFormMateriality(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2"
                      >
                        <option value="high">Very important</option>
                        <option value="medium">Somewhat important</option>
                        <option value="low">Minor detail</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Fact-check status</label>
                      <select
                        value={formVerification}
                        onChange={(e) => setFormVerification(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2"
                      >
                        <option value="verified">Verified (True)</option>
                        <option value="unverified">Unverified (Unsure)</option>
                        <option value="discrepancy">Discrepancy (Story differs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Where was this found? (e.g. Page 4)</label>
                      <input
                        type="text"
                        value={formSource}
                        placeholder="Exhibit D, Page 4"
                        onChange={(e) => setFormSource(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Effect on Case Strength (%)</label>
                      <input
                        type="number"
                        step="1"
                        value={formEffect}
                        onChange={(e) => setFormEffect(Number(e.target.value))}
                        className="w-full h-8 bg-card border border-border rounded px-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Effect Type</label>
                      <select
                        value={formEffectType}
                        onChange={(e) => setFormEffectType(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2 text-xs"
                      >
                        <option value="neutral">Neutral</option>
                        <option value="corroboration">Corroboration (Agrees with story)</option>
                        <option value="contradiction">Contradiction (Disagrees with story)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground block">Source Reliability</label>
                      <select
                        value={formSourceStrength}
                        onChange={(e) => setFormSourceStrength(e.target.value)}
                        className="w-full h-8 bg-card border border-border rounded px-2 text-xs"
                      >
                        <option value="strong">Strong / Trustworthy</option>
                        <option value="moderate">Moderate / Normal</option>
                        <option value="weak">Weak / Questionable</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1 text-left">
                    <input
                      type="checkbox"
                      id="formAiDetected"
                      checked={formAiDetected}
                      onChange={(e) => setFormAiDetected(e.target.checked)}
                      className="rounded border-border bg-card h-4 w-4 text-primary focus:ring-1 focus:ring-primary"
                    />
                    <label htmlFor="formAiDetected" className="text-[10px] font-semibold text-muted-foreground cursor-pointer">
                      Mark as a concern spotted by the assistant
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setNoteFormOpen(false)}
                      className="h-8 px-3 border border-border hover:bg-secondary rounded font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded font-semibold"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              )}

              {/* Bench Notes List */}
              <div className="space-y-3.5 overflow-y-auto max-h-[500px] flex-1">
                {activeEntries.length > 0 ? (
                  activeEntries.map((entry) => (
                    <div key={entry.id} className="p-4 rounded border border-border/80 bg-secondary/15 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-foreground text-sm">{entry.title}</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            Type: {entry.category === "timeline" ? "Date/Timeline" : entry.category === "citation" ? "Document Citation" : entry.category === "testimony" ? "Witness Statement" : entry.category} | Importance: {entry.materiality === "high" ? "Very important" : entry.materiality === "medium" ? "Somewhat important" : entry.materiality === "low" ? "Minor detail" : entry.materiality}
                          </span>
                        </div>
                        
                        {activeReview.status === "active" && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditNoteForm(entry)}
                              className="p-1 text-muted-foreground hover:text-accent"
                                title="Edit Entry"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1 text-muted-foreground hover:text-red-500"
                                title="Delete Entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground leading-relaxed text-left">{entry.note_body}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary border border-border/40 text-muted-foreground capitalize">
                          Effect: {entry.effect_type === "corroboration" ? "Corroboration (Agrees with story)" : entry.effect_type === "contradiction" ? "Contradiction (Disagrees with story)" : entry.effect_type || "neutral"}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary border border-border/40 text-muted-foreground capitalize font-medium">
                          Source Reliability: {entry.source_strength || "moderate"}
                        </span>
                        {entry.ai_detected && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-semibold">
                            Spotted by Assistant
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                        <span className="italic">Found in: {entry.source_reference || "None"}</span>
                        <span className={`font-semibold ${
                          entry.confidence_effect < 0 ? "text-red-400" : "text-primary"
                        }`}>
                          Strength Effect: {entry.confidence_effect > 0 ? "+" : ""}{entry.confidence_effect}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No case notes recorded yet. Click the '+' icon above to add important dates, citations, or statements manually.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Confidence, Suggestions, Report */}
          <div className="space-y-5">
            {/* Confidence Ledger */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-1.5">
                <Award className="h-4.5 w-4.5 text-primary" />
                <span>Strength Checklist</span>
              </h3>
              
              <div className="space-y-4">
                {/* Side Confidences (Accessible Side-by-Side Meters) */}
                {activeReview.confidence_ledger && (
                  <div className="grid gap-3.5 grid-cols-2 pb-3 border-b border-border/40">
                    <div className="space-y-1 text-xs text-left">
                      <span className="font-semibold text-muted-foreground block">Petitioner (your side) Strength</span>
                      <span className="text-lg font-bold text-foreground block">
                        {activeReview.confidence_ledger.side_a_confidence !== undefined 
                          ? `${activeReview.confidence_ledger.side_a_confidence}%` 
                          : "80%"}
                      </span>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-label="Petitioner side confidence score"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={activeReview.confidence_ledger.side_a_confidence !== undefined ? activeReview.confidence_ledger.side_a_confidence : 80}
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${activeReview.confidence_ledger.side_a_confidence !== undefined ? activeReview.confidence_ledger.side_a_confidence : 80}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-left">
                      <span className="font-semibold text-muted-foreground block">Respondent (the other side) Strength</span>
                      <span className="text-lg font-bold text-foreground block">
                        {activeReview.confidence_ledger.side_b_confidence !== undefined 
                          ? `${activeReview.confidence_ledger.side_b_confidence}%` 
                          : "80%"}
                      </span>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-label="Respondent side confidence score"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={activeReview.confidence_ledger.side_b_confidence !== undefined ? activeReview.confidence_ledger.side_b_confidence : 80}
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${activeReview.confidence_ledger.side_b_confidence !== undefined ? activeReview.confidence_ledger.side_b_confidence : 80}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeReview.confidence_ledger?.ledger ? (
                  activeReview.confidence_ledger.ledger.map((item, idx) => (
                    <div key={idx} className="space-y-1 text-xs text-left">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.label}</span>
                        <span className={`font-bold ${
                          item.score >= 80 ? "text-primary" : "text-amber-500"
                        }`}>{item.score}% ({item.status})</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-label={item.label}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={item.score}
                          className={`h-full transition-all duration-300 ${
                            item.score >= 80 ? "bg-primary" : "bg-amber-500/80"
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    Ingest brief text on the left to initialize the confidence ledger scores.
                  </div>
                )}
              </div>
            </div>

            {/* Caution Flags Section */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 border-b border-border/60 pb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-400" />
                <span>Warnings & Gaps</span>
              </h3>
              
              <div className="space-y-3.5 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                {activeReview.confidence_ledger?.caution_flags && activeReview.confidence_ledger.caution_flags.length > 0 ? (
                  activeReview.confidence_ledger.caution_flags.map((flag) => (
                    <div key={flag.id} className="p-3 border border-red-500/20 bg-red-500/5 rounded text-left">
                      <span className="font-bold text-red-400 block">{flag.title}</span>
                      <span className="text-muted-foreground text-[11px] block mt-0.5 leading-normal">{flag.description}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    No active critical caution warnings detected.
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions bulletin (Points to Keep in Mind) */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>Points to Keep in Mind</span>
              </h3>
              
              <ul className="space-y-3.5 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                {activeReview.suggestions?.points ? (
                  activeReview.suggestions.points.map((point) => (
                    <li key={point.id} className="flex gap-2 items-start border-l border-primary/40 pl-2 text-left">
                      <span className="text-muted-foreground text-left leading-normal">{point.text}</span>
                    </li>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2 text-center w-full">
                    No suggestion points computed. Submit text on the left to build case checklists.
                  </div>
                )}
              </ul>
            </div>

            {/* Confidence Change Logs */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-2 flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-primary" />
                <span>Case Strength History</span>
              </h3>
              
              <div className="space-y-3 max-h-44 overflow-y-auto text-left">
                {activeReview.confidence_ledger?.change_log && activeReview.confidence_ledger.change_log.length > 0 ? (
                  [...activeReview.confidence_ledger.change_log].reverse().map((log, idx) => (
                    <div key={idx} className="border-b border-border/30 pb-2 last:border-0 text-[11px]">
                      <p className="text-muted-foreground leading-normal">{log.reason}</p>
                      <span className="text-[9px] text-muted-foreground/60 block mt-1">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    History of changes is updated dynamically as case notes are added.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
