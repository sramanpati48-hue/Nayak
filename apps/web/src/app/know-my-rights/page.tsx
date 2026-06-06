"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useKnowMyRightsStore } from "@/store/know-my-rights";
import { ShieldAlert, Heart, Search, Plus, Info, BookMarked } from "lucide-react";

export default function KnowMyRightsDashboard() {
  const { rights, resources, favorites, fetchRights, fetchResources, loading, addToFavorites, removeFromFavorites } = useKnowMyRightsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"rights" | "resources">("rights");

  useEffect(() => {
    fetchRights(selectedCategory);
    fetchResources();
  }, [selectedCategory]);

  const categories = ["Legal Rights", "Information Rights", "Property Rights", "Consumer Rights"];
  const filteredRights = searchQuery 
    ? rights.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rights;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Module Header */}
        <div className="border-b border-border pb-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Module 03: Know Your Rights</span>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Know My Rights</h1>
          </div>
          <p className="text-muted-foreground max-w-[800px] text-sm">
            Understand your legal rights and responsibilities. Access guides, resources, and answers to common legal questions. Knowledge is your best defense.
          </p>
        </div>

        {/* Info Callout */}
        <div className="flex items-start gap-3.5 p-4 rounded bg-secondary/30 border border-border/80 text-xs text-muted-foreground">
          <Info className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground block">Why this matters</span>
            <span>Knowing your rights helps you recognize unfair treatment, ask the right questions, and make informed decisions about your case. Save your favorite rights for quick reference.</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rights by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border border-border bg-background text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab("rights")}
            className={`pb-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "rights"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Your Rights ({filteredRights.length})
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`pb-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === "resources"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Resources ({resources.length})
          </button>
        </div>

        {/* Content Area */}
        <div>
          {activeTab === "rights" && (
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory(undefined)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Rights Grid */}
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                {filteredRights.map((right) => (
                  <div
                    key={right.id}
                    className="rounded-lg border border-border bg-card p-5 hover:border-primary/45 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-sm leading-tight">
                          {right.title}
                        </h3>
                        <p className="text-[10px] text-primary mt-1.5 uppercase font-semibold">
                          {right.category}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (favorites.includes(right.id)) {
                            removeFromFavorites(right.id);
                          } else {
                            addToFavorites(right.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Heart
                          className="h-4 w-4"
                          fill={favorites.includes(right.id) ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {right.description}
                    </p>
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-2">
                        {right.content.substring(0, 100)}...
                      </p>
                      {right.source && (
                        <span className="text-[9px] text-primary/70 font-medium">
                          Source: {right.source}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredRights.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">
                    No rights found matching your search.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "resources" && (
            <div className="grid gap-4 md:grid-cols-2">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-lg border border-border bg-card p-5 hover:border-primary/45 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                        {resource.type}
                      </div>
                      <h3 className="font-bold text-foreground text-sm">
                        {resource.title}
                      </h3>
                    </div>
                    <BookMarked className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {resource.content}
                  </p>
                  {resource.url && (
                    <Link
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      View Resource →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
