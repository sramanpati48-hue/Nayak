"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { useVicharakBandhuStore } from "@/store/vicharakbandhu";
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Scale, 
  BookOpen, 
  Loader2, 
  AlertTriangle, 
  X, 
  Settings,
  Award,
  CheckSquare,
  FileArchive
} from "lucide-react";

import { formatGuidanceReport, triggerDownload } from "@/lib/report-formatter";
import { useTranslation } from "@/lib/language-context";

export default function JudicialReports() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "nyaybandhu" | "vicharakbandhu">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Focus tracking refs for accessible modal dialog
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const { sessions, fetchHistory: fetchNyayHistory, loading: nyayLoading } = useNyaybandhuStore();
  const { reviews, fetchHistory: fetchVicharakHistory, loading: vicharakLoading } = useVicharakBandhuStore();

  useEffect(() => {
    fetchNyayHistory();
    fetchVicharakHistory();
  }, []);

  // Map history sessions and reviews into a unified reports structure
  const reportItems = [
    ...sessions.map((s) => ({
      id: s.id,
      title: s.title,
      module: "nyaybandhu" as const,
      category: s.mode === "practice" ? t("reports.practiceArena") : t("reports.checkRealArguments"),
      status: s.status,
      created_at: s.created_at,
      summary: s.summary || s.description || t("reports.activeSimulation"),
      report: s.status === "finalized" ? {
        compiled_at: s.created_at,
        case_overview: {
          title: s.title,
          summary: s.description || t("reports.testingArguments"),
          status: t("common.finalized")
        },
        description: s.description,
        mode: s.mode,
        opposing_counsel_strategy: s.opposing_counsel_strategy,
        verdict: s.verdict,
        summary: s.summary
      } : null
    })),
    ...reviews.map((r) => ({
      id: r.id,
      title: r.title,
      module: "vicharakbandhu" as const,
      category: t("reports.reviewFiles"),
      status: r.status,
      created_at: r.created_at,
      summary: r.report?.findings_summary || r.case_summary || t("reports.activeReview"),
      report: r.status === "finalized" ? r.report : null
    }))
  ];

  // Sort unified reports descending by date
  reportItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter listings
  const filteredReports = reportItems.filter((item) => {
    const matchesModule = filter === "all" || item.module === filter;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  // Modal accessibility hooks
  useEffect(() => {
    if (selectedItem) {
      // Save trigger button to return focus later
      returnFocusRef.current = document.activeElement as HTMLElement;
      
      // Lock body scroll
      document.body.style.overflow = "hidden";
      
      // Move focus into the modal dialog container
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector("button, [tabindex]:not([tabindex='-1'])") as HTMLElement;
          if (firstFocusable) firstFocusable.focus();
        }
      }, 50);

      // Key listener for Escape and Tab trap
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeModal();
          return;
        }

        if (e.key === "Tab" && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll(
            "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
          );
          const first = focusables[0] as HTMLElement;
          const last = focusables[focusables.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "unset";
      };
    }
  }, [selectedItem]);

  const closeModal = () => {
    setSelectedItem(null);
    // Return focus to the opening element
    setTimeout(() => {
      if (returnFocusRef.current) {
        returnFocusRef.current.focus();
      }
    }, 50);
  };

  const handleExport = (item: any) => {
    let content = "";
    if (item.module === "vicharakbandhu") {
      const rep = item.report;
      content = `# NAYAK CASE SUMMARY REPORT: ${item.title}\n` +
        `Status: Finalized\n` +
        `Date Compiled: ${new Date(rep.compiled_at).toLocaleString()}\n\n` +
        `--------------------------------------------------------------------------------\n` +
        `DISCLAIMER: This report is compiled as a helpful case organizing summary. It does NOT\n` +
        `represent legal advice, a court judgment, a verdict, or a lawyer's opinion.\n` +
        `All information should be verified by a human or a qualified legal professional.\n` +
        `--------------------------------------------------------------------------------\n\n` +
        `## 1. Case Overview\n` +
        `Title: ${rep.case_overview?.title || item.title}\n` +
        `Summary: ${rep.case_overview?.summary || "N/A"}\n\n` +
        `## 2. Extracted Case Structure\n` +
        `Claims & Points of View:\n` +
        (rep.extracted_structure?.claims?.map((c: any) => `- [${c.side}] ${c.text}`).join("\n") || "No claims extracted") + "\n\n" +
        `Timeline:\n` +
        (rep.extracted_structure?.timeline?.map((t: any) => `- [${t.time}] ${t.event}`).join("\n") || "No timeline events extracted") + "\n\n" +
        `## 3. Case Notes Summary\n` +
        `Total Notes: ${rep.bench_notes_summary?.total_notes || 0}\n` +
        `- Timeline Notes: ${rep.bench_notes_summary?.timeline_count || 0}\n` +
        `- Citation Notes: ${rep.bench_notes_summary?.citation_count || 0}\n` +
        `- Testimony Notes: ${rep.bench_notes_summary?.testimony_count || 0}\n\n` +
        `Notes Details:\n` +
        (rep.bench_notes_summary?.notes?.map((n: any) => 
          `* [${n.side_impact.toUpperCase()} | ${n.category.toUpperCase()}] ${n.title} (Effect: ${n.confidence_effect}%)\n` +
          `  Verification: ${n.verification_status} | Source Strength: ${n.source_strength || "moderate"}\n` +
          `  Note body: ${n.note_body}\n` +
          `  Reference: ${n.source_reference || "None"}\n`
        ).join("\n") || "No bench notes recorded") + "\n\n" +
        `## 4. Case Strength Checklist Summary\n` +
        `- Petitioner (your side) Strength: ${rep.confidence_summary?.side_a_confidence || 80}%\n` +
        `- Respondent (the other side) Strength: ${rep.confidence_summary?.side_b_confidence || 80}%\n\n` +
        `Category Estimates:\n` +
        (rep.confidence_summary?.ledger?.map((l: any) => `- ${l.label}: ${l.score}% (${l.status})`).join("\n") || "No ledger scores computed") + "\n\n" +
        `## 5. Warnings & Gaps\n` +
        (rep.caution_flags?.map((f: any) => `* [${f.severity.toUpperCase()}] ${f.title}\n  Description: ${f.description}`).join("\n") || "No critical caution flags active.") + "\n\n" +
        `## 6. Points to Keep in Mind\n` +
        (rep.points_to_keep_in_mind?.map((p: any) => `- ${p.text}`).join("\n") || "No suggestion checklist items.") + "\n\n" +
        `## 7. Key Findings Summary\n` +
        `${rep.findings_summary}\n`;

      const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${item.title.replace(/\s+/g, "_")}_report.md`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const rep = item.report;
      if (rep.mode === "real-life") {
        const markdown = formatGuidanceReport(item.title, rep.summary || "", item.created_at);
        const filename = `guidance-report-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
        triggerDownload(markdown, filename);
      } else {
        content = `# NAYAK CASE SUMMARY AND ANALYSIS: ${item.title}\n` +
          `Status: Finalized\n` +
          `Date Compiled: ${new Date(item.created_at).toLocaleString()}\n\n` +
          `--------------------------------------------------------------------------------\n` +
          `DISCLAIMER: This case summary is compiled as a helpful case organizing summary.\n` +
          `It does NOT represent legal advice, a court judgment, a verdict, or a lawyer's opinion.\n` +
          `--------------------------------------------------------------------------------\n\n` +
          `## 1. Session Overview\n` +
          `Title: ${item.title}\n` +
          `Description: ${rep.description || "No description provided."}\n` +
          `Mode: ${rep.mode === "practice" ? "Practice Arena" : "Check Real Arguments"}\n` +
          `Opponent Strategy: ${rep.opposing_counsel_strategy}\n\n` +
          `## 2. Discussion Summary\n` +
          `${rep.summary || "No verdict summary compiled."}\n\n` +
          `## 3. Discussion Details & Leaning\n` +
          `${rep.verdict || "No final details registered."}\n`;

        const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${item.title.replace(/\s+/g, "_")}_report.md`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const isLoading = nyayLoading || vicharakLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4 space-y-1 text-left">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("reports.compiledRecords")}</span>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-primary" />
            <span>{t("reports.caseSummaries")}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("reports.reportsSubtitle")}
          </p>
        </div>

        {/* Filter and Search Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-3 rounded-lg border border-border/80">
          <div className="flex border border-border rounded p-0.5 bg-secondary/35 text-[11px] font-semibold">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded transition-all ${
                filter === "all" ? "bg-card text-accent shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("reports.allCaseSummaries")}
            </button>
            <button
              onClick={() => setFilter("nyaybandhu")}
              className={`px-3 py-1 rounded transition-all ${
                filter === "nyaybandhu" ? "bg-card text-accent shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("reports.filterNyay")}
            </button>
            <button
              onClick={() => setFilter("vicharakbandhu")}
              className={`px-3 py-1 rounded transition-all ${
                filter === "vicharakbandhu" ? "bg-card text-accent shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("reports.filterVicharak")}
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("reports.searchIndex")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full h-8 border border-border rounded bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        {/* Reports Listing Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isLoading && reportItems.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[200px] gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">{t("reports.syncingLogs")}</span>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/15 text-muted-foreground font-semibold">
                    <th className="p-4">{t("reports.originModule")}</th>
                    <th className="p-4">{t("reports.reportFileTitle")}</th>
                    <th className="p-4">{t("reports.category")}</th>
                    <th className="p-4">{t("reports.statusAvailability")}</th>
                    <th className="p-4">{t("reports.dateCreated")}</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  {filteredReports.map((item) => {
                    const isFinalized = item.status === "finalized";
                    return (
                      <tr key={item.id} className="hover:bg-secondary/10 hover:text-foreground">
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            {item.module === "nyaybandhu" ? (
                              <>
                                <Scale className="h-4 w-4 text-primary" />
                                <span>Nyaybandhu</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="h-4 w-4 text-primary" />
                                <span>VicharakBandhu</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-foreground block">{item.title}</span>
                          <span className="text-[10px] text-muted-foreground block truncate max-w-sm mt-0.5">
                            {item.summary}
                          </span>
                        </td>
                        <td className="p-4 font-medium">{item.category}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] border capitalize ${
                            isFinalized 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold"
                          }`}>
                            {isFinalized 
                              ? (item.module === "nyaybandhu" ? "summary ready" : "finished review") 
                              : "active workspace"}
                          </span>
                        </td>
                        <td className="p-4">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Open Workspace */}
                            <Link
                              href={`/${item.module}/${item.id}`}
                              className="px-2.5 py-1.5 rounded border border-border hover:bg-secondary/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all"
                            >
                              Workspace
                            </Link>

                            {/* View Report */}
                            <button
                              disabled={!isFinalized}
                              onClick={() => setSelectedItem(item)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all text-[10px] font-semibold ${
                                isFinalized
                                  ? "border-primary bg-primary/5 text-primary hover:bg-primary/20"
                                  : "border-border/30 text-muted-foreground/40 bg-secondary/5 cursor-not-allowed"
                              }`}
                              title={isFinalized ? "View Compiled Report" : "Report not compiled yet"}
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>

                            {/* Export Report */}
                            <button
                              disabled={!isFinalized}
                              onClick={() => handleExport(item)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded transition-all text-[10px] font-semibold ${
                                isFinalized
                                  ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm border border-primary/30"
                                  : "bg-secondary text-muted-foreground/30 border border-border/10 cursor-not-allowed"
                              }`}
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Export</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="p-3 bg-secondary rounded-full text-muted-foreground mb-4">
                <FileArchive className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No reports archived</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-[320px]">
                Run case discussions or document reviews to generate downloadable summaries.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Report Dialogue Overlay */}
      {selectedItem && selectedItem.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-desc"
            className="w-full max-w-3xl max-h-[85vh] bg-card border border-border/80 rounded-lg shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold tracking-widest text-primary">
                  {selectedItem.module === "nyaybandhu" ? "Nyaybandhu Discussion Summary" : "VicharakBandhu Review Summary"}
                </span>
                <h2 id="modal-title" className="text-sm font-bold text-foreground truncate max-w-md">
                  {selectedItem.title}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1 border border-border hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div id="modal-desc" className="p-6 overflow-y-auto space-y-6 text-xs text-muted-foreground text-left leading-relaxed">
              
              {/* DISCLAIMER BOX */}
              <div className="p-3.5 bg-primary/5 border border-primary/20 rounded text-[11px] text-muted-foreground flex gap-3.5 items-start">
                <Settings className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Workspace Assistant Note</span>
                  <span>
                    {selectedItem.report.mode === "real-life"
                      ? "This generated output is compiled by a digital support tool to help you organize your thoughts. It does not represent a real court decision, legal judgment, verdict, or legal advice."
                      : "This generated output is compiled as a helpful case organizing summary. It does not represent a real court decision, legal judgment, verdict, or legal advice. All information should be verified."}
                  </span>
                </div>
              </div>

              {/* VicharakBandhu Report Details */}
              {selectedItem.module === "vicharakbandhu" && (
                <div className="space-y-6">
                  {/* Case Overview */}
                  {selectedItem.report.case_overview && (
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Case Overview</span>
                      <p className="pl-2">{selectedItem.report.case_overview.summary}</p>
                    </div>
                  )}

                  {/* Claims and Timeline */}
                  {selectedItem.report.extracted_structure && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Extracted Timeline</span>
                        <div className="pl-2 space-y-1 max-h-36 overflow-y-auto">
                          {selectedItem.report.extracted_structure.timeline?.map((t: any, i: number) => (
                            <div key={i} className="text-[11px]">
                              <span className="font-semibold text-primary block">{t.time}</span>
                              <span>{t.event}</span>
                            </div>
                          )) || <span>No timeline extracted.</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Claims & Points of View</span>
                        <div className="pl-2 space-y-1 max-h-36 overflow-y-auto">
                          {selectedItem.report.extracted_structure.claims?.map((c: any, i: number) => (
                            <div key={i} className="text-[11px]">
                              <span className="font-semibold text-accent block">{c.side === "side_a" || c.side === "Petitioner" ? "Petitioner (your side)" : c.side === "side_b" || c.side === "Respondent" ? "Respondent (the other side)" : c.side} Stand</span>
                              <span>{c.text}</span>
                            </div>
                          )) || <span>No claims extracted.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes Summary */}
                  {selectedItem.report.bench_notes_summary && (
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Case Notes Summary</span>
                      <div className="pl-2 space-y-2">
                        <div className="flex gap-4 font-semibold text-foreground/80">
                          <span>Total: {selectedItem.report.bench_notes_summary.total_notes}</span>
                          <span>Dates/Timelines: {selectedItem.report.bench_notes_summary.timeline_count}</span>
                          <span>Document Citations: {selectedItem.report.bench_notes_summary.citation_count}</span>
                        </div>
                        {selectedItem.report.bench_notes_summary.notes && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto border-t border-border/30 pt-1.5">
                            {selectedItem.report.bench_notes_summary.notes.map((note: any, i: number) => (
                              <div key={i} className="border-b border-border/20 pb-1 last:border-0 flex justify-between gap-4">
                                <div>
                                  <span className="font-bold text-foreground block">{note.title}</span>
                                  <span className="text-[10px] text-muted-foreground/80 block mt-0.5">Ref: {note.source_reference || "N/A"}</span>
                                </div>
                                <span className={`font-semibold shrink-0 ${note.confidence_effect < 0 ? 'text-red-400' : 'text-primary'}`}>
                                  {note.confidence_effect > 0 ? '+' : ''}{note.confidence_effect}% ({note.side_impact})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confidence Summary */}
                  {selectedItem.report.confidence_summary && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Side Strength Estimate</span>
                        <div className="pl-2 space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Petitioner (your side)</span>
                              <span className="font-bold text-primary">{selectedItem.report.confidence_summary.side_a_confidence}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                              <div
                                role="progressbar"
                                aria-label="Petitioner confidence indicator"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={selectedItem.report.confidence_summary.side_a_confidence}
                                className="h-full bg-primary"
                                style={{ width: `${selectedItem.report.confidence_summary.side_a_confidence}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Respondent (the other side)</span>
                              <span className="font-bold text-primary">{selectedItem.report.confidence_summary.side_b_confidence}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                              <div
                                role="progressbar"
                                aria-label="Respondent confidence indicator"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={selectedItem.report.confidence_summary.side_b_confidence}
                                className="h-full bg-primary"
                                style={{ width: `${selectedItem.report.confidence_summary.side_b_confidence}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Warnings & Gaps</span>
                        <div className="pl-2 space-y-2 max-h-36 overflow-y-auto">
                          {selectedItem.report.caution_flags && selectedItem.report.caution_flags.length > 0 ? (
                            selectedItem.report.caution_flags.map((flag: any, i: number) => (
                              <div key={i} className="flex gap-2 items-start border border-red-500/20 bg-red-500/5 p-2 rounded text-[11px]">
                                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-red-400 block">{flag.title}</span>
                                  <span className="text-muted-foreground leading-normal block mt-0.5">{flag.description}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground block pt-1">No warnings flagged.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Points to Keep in Mind */}
                  {selectedItem.report.points_to_keep_in_mind && selectedItem.report.points_to_keep_in_mind.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Points to Keep in Mind</span>
                      <ul className="pl-2 space-y-1 border-l border-primary/30 ml-2">
                        {selectedItem.report.points_to_keep_in_mind.map((point: any) => (
                          <li key={point.id} className="text-[11px] leading-relaxed">
                            {point.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Findings Summary */}
                  <div className="space-y-1">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Findings Summary</span>
                    <p className="pl-2 leading-relaxed">{selectedItem.report.findings_summary}</p>
                  </div>
                </div>
              )}

              {/* Nyaybandhu Verdict Details */}
              {selectedItem.module === "nyaybandhu" && (() => {
                if (selectedItem.report.mode === "real-life") {
                  let parsedSummary: any = null;
                  try {
                    if (selectedItem.report.summary) {
                      parsedSummary = JSON.parse(selectedItem.report.summary);
                    }
                  } catch (e) {
                    console.warn("Failed to parse report summary JSON:", e);
                  }

                  if (parsedSummary) {
                    return (
                      <div className="space-y-6 text-left">
                        <div className="space-y-1">
                          <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Session Overview</span>
                          <div className="pl-2 space-y-1">
                            <p><span className="font-semibold text-foreground">Title:</span> {selectedItem.title}</p>
                            <p><span className="font-semibold text-foreground">Dispute Category:</span> {parsedSummary.matter_type}</p>
                            <p><span className="font-semibold text-foreground">Urgency Level:</span> {parsedSummary.urgency_level}</p>
                          </div>
                        </div>

                        {/* 1. What Happened */}
                        <div className="space-y-1">
                          <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">1. What Happened</span>
                          <div className="pl-2 space-y-1 leading-relaxed">
                            {parsedSummary.facts?.map((f: string, i: number) => (
                              <p key={i}>{f}</p>
                            ))}
                          </div>
                        </div>

                        {/* 2. Case Strength */}
                        <div className="space-y-1">
                          <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">2. Case Strength Overview & Leaning</span>
                          <div className="p-3.5 bg-secondary/15 rounded border border-border/40 pl-2 leading-relaxed">
                            <span className="font-bold text-accent block text-xs mb-1">{selectedItem.report.verdict?.split(".")[0]}</span>
                            <p>{selectedItem.report.verdict?.split(".").slice(1).join(".")}</p>
                          </div>
                        </div>

                        {/* 3. Guidance Review */}
                        <div className="space-y-1">
                          <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">3. Guidance Review</span>
                          <p className="pl-2 leading-relaxed">{parsedSummary.summary}</p>
                        </div>

                        {/* Timeline & People */}
                        <div className="grid gap-4 md:grid-cols-2 text-left">
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Timeline of Events</span>
                            <div className="pl-2 space-y-2 max-h-36 overflow-y-auto">
                              {parsedSummary.timeline?.map((t: any, i: number) => (
                                <div key={i} className="text-[11px] border-b border-border/20 pb-1 last:border-0">
                                  <span className="font-semibold text-primary block">{t.date} ({t.certainty})</span>
                                  <span>{t.event}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">People Involved</span>
                            <div className="pl-2 space-y-2 max-h-36 overflow-y-auto">
                              {parsedSummary.people_involved?.map((p: any, i: number) => (
                                <div key={i} className="text-[11px] flex justify-between gap-2 border-b border-border/20 pb-1 last:border-0">
                                  <span><span className="font-semibold">{p.name}</span> ({p.role})</span>
                                  <span className="text-muted-foreground">{p.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Relief & Documents */}
                        <div className="grid gap-4 md:grid-cols-2 text-left">
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Relief Sought</span>
                            <ul className="pl-6 list-disc space-y-1">
                              {parsedSummary.relief_sought?.map((r: string, i: number) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Documents Audit</span>
                            <div className="pl-2 space-y-2 max-h-36 overflow-y-auto">
                              {parsedSummary.documents_available?.map((d: any, i: number) => (
                                <div key={i} className="text-[11px] border-b border-border/20 pb-1 last:border-0">
                                  <span className="font-semibold block">{d.document} - <span className="text-accent">{d.status}</span></span>
                                  <span className="text-muted-foreground/80">{d.relevance}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Risks & Legal Issues */}
                        <div className="grid gap-4 md:grid-cols-2 text-left">
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Immediate Risks</span>
                            <div className="pl-2 space-y-2 max-h-36 overflow-y-auto">
                              {parsedSummary.immediate_risks?.map((r: any, i: number) => (
                                <div key={i} className="text-[11px] border-b border-border/20 pb-1 last:border-0">
                                  <span className="font-semibold block">{r.risk} - <span className="text-red-400">{r.level} risk</span></span>
                                  <span className="text-muted-foreground/80">{r.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Preliminary Legal Issues</span>
                            <div className="pl-2 space-y-2 max-h-36 overflow-y-auto">
                              {parsedSummary.legal_issues_preliminary?.map((l: any, i: number) => (
                                <div key={i} className="text-[11px] border-b border-border/20 pb-1 last:border-0">
                                  <span className="font-semibold block">{l.issue} - <span className="text-primary">{l.confidence} confidence</span></span>
                                  <span className="text-muted-foreground/80">{l.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Next Steps & Help */}
                        <div className="grid gap-4 md:grid-cols-2 text-left">
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">4. Practical Next Steps</span>
                            <ul className="pl-6 list-disc space-y-1">
                              {parsedSummary.recommended_next_steps?.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">5. Seek Help Channels</span>
                            <ul className="pl-6 list-disc space-y-1">
                              {parsedSummary.safety_flag && <li className="text-red-400">Call Police (112) or Women Helpline (1091) immediately.</li>}
                              <li>District Legal Services Authority (DLSA) for free legal aid.</li>
                              {parsedSummary.matter_type === "cyber abuse" && <li>Cyber Crime helpline (1930 / cybercrime.gov.in).</li>}
                              {parsedSummary.matter_type === "consumer complaint" && <li>Consumer Helpline (1915).</li>}
                            </ul>
                          </div>
                        </div>

                        {/* Follow-up Questions */}
                        {parsedSummary.follow_up_questions && parsedSummary.follow_up_questions.length > 0 && (
                          <div className="p-3 border border-amber-500/20 bg-amber-500/5 rounded text-left">
                            <span className="font-bold text-amber-500 block mb-1">Follow-up Questions (To fill gaps):</span>
                            <ul className="pl-6 list-decimal space-y-1">
                              {parsedSummary.follow_up_questions.map((q: string, i: number) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  }
                }

                // Fallback for practice mode or unparsed summary
                return (
                  <div className="space-y-6 text-left">
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">Session Overview</span>
                      <div className="pl-2 space-y-1">
                        <p><span className="font-semibold text-foreground">Title:</span> {selectedItem.title}</p>
                        <p><span className="font-semibold text-foreground">Mode:</span> {selectedItem.report.mode === "practice" ? "Practice Arena" : "Real Case Review"}</p>
                        <p><span className="font-semibold text-foreground">Strategy:</span> {selectedItem.report.opposing_counsel_strategy === "textualist" ? "Strictly by the book (literal)" : selectedItem.report.opposing_counsel_strategy === "pragmatist" ? "Practical/Purpose-oriented" : "Based on past cases (precedents)"} strategy</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">
                        {selectedItem.report.mode === "real-life" ? "Case Guidance Review" : "Final Summary Digest"}
                      </span>
                      <p className="pl-2 leading-relaxed">{selectedItem.report.summary}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider block border-l border-primary pl-2">
                        {selectedItem.report.mode === "real-life" ? "Case Strength Overview & Leaning" : "Discussion Details & Leaning"}
                      </span>
                      <div className="p-3.5 bg-secondary/15 rounded border border-border/40 pl-2 leading-relaxed">
                        <span className="font-bold text-accent block text-sm mb-1.5">{selectedItem.report.verdict?.split(".")[0]}</span>
                        <p>{selectedItem.report.verdict?.split(".").slice(1).join(".")}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/10">
              <button
                onClick={closeModal}
                className="h-8 px-4 border border-border hover:bg-secondary rounded font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleExport(selectedItem)}
                className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {selectedItem.report?.mode === "real-life" ? "Export Guidance Report" : "Export Markdown"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
