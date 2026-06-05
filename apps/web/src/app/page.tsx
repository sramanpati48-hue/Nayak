"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Scale, BookOpen, FileText, ArrowRight, ShieldAlert, Award } from "lucide-react";
import { useNyaybandhuStore } from "@/store/nyaybandhu";
import { useVicharakBandhuStore } from "@/store/vicharakbandhu";

export default function Home() {
  const { sessions, fetchHistory: fetchNyayHistory } = useNyaybandhuStore();
  const { reviews, fetchHistory: fetchVicharakHistory } = useVicharakBandhuStore();

  useEffect(() => {
    fetchNyayHistory();
    fetchVicharakHistory();
  }, []);

  const activeSessionsCount = sessions.filter(s => s.status === "active").length;
  const caseReviewsCount = reviews.length;
  const compiledReportsCount = 
    sessions.filter(s => s.status === "finalized").length + 
    reviews.filter(r => r.status === "finalized").length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Banner Section */}
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Your Legal Case Assistant</span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Nayak
          </h1>
          <p className="text-muted-foreground max-w-[800px] text-sm md:text-base leading-relaxed">
            A simple, secure tool to help you organize case details, see both sides of an argument, and spot gaps in your records.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Cases</span>
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{activeSessionsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active workspaces for testing case arguments</p>
          </div>
          
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document Reviews</span>
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{caseReviewsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Active file reviews and checklists</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ready Summaries</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{compiledReportsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Completed case summaries ready to read</p>
          </div>
        </div>

        {/* Module Panels */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Nyaybandhu Card */}
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-secondary rounded border border-border text-primary">
                  <Scale className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                  Module 01: Test Arguments
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Nyaybandhu (See Both Sides)
              </h2>
              <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                Look at case arguments from both your side and the other side. Try out different arguments in a practice arena or spot gaps in your current case papers.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/40 flex items-center gap-4 text-xs font-medium">
              <Link 
                href="/nyaybandhu/practice" 
                className="flex items-center gap-1 text-accent hover:underline"
              >
                Practice Arena <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="text-border">|</span>
              <Link 
                href="/nyaybandhu/real-life" 
                className="flex items-center gap-1 text-accent hover:underline"
              >
                Check Real Arguments <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* VicharakBandhu Card */}
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-secondary rounded border border-border text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">
                  Module 02: Review Files
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                VicharakBandhu (Review Documents)
              </h2>
              <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                Review case files, witness statements, and document records. Note down key facts, check for differences in stories, and compile summaries.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-border/40 flex items-center text-xs font-medium">
              <Link 
                href="/vicharakbandhu" 
                className="flex items-center gap-1 text-accent hover:underline"
              >
                Start Document Review <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Global Disclaimer */}
        <div className="rounded-lg border border-border bg-secondary/20 p-5 text-xs text-muted-foreground leading-relaxed mt-6">
          <p className="font-semibold text-foreground mb-1">Important Note:</p>
          <p>Nayak is a supportive computer tool designed to help you organize documents, facts, and arguments. It is <strong>not</strong> a lawyer, a judge, or a court, and it <strong>cannot</strong> give you legal advice or decide a case. Please consult a qualified lawyer for legal representation.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
