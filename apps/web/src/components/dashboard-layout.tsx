"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { useSessionContext } from "@/lib/session-context";
import { useTranslation } from "@/lib/language-context";
import { 
  Scale, 
  BookOpen, 
  FileText, 
  Settings, 
  LayoutDashboard,
  Menu, 
  X,
  Play,
  Briefcase,
  User,
  Shield,
  Activity,
  MapPin,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role } = useSessionContext();
  const { t, getRoleLabel, getRoleSummary } = useTranslation();

  const navItems = [
    { name: t("nav.home"), href: "/portal", icon: LayoutDashboard },
    { 
      name: t("nav.nyaybandhu"), 
      href: "/nyaybandhu", 
      icon: Scale,
      subItems: [
        { name: t("nav.practiceArena"), href: "/nyaybandhu/practice", icon: Play },
        { name: t("nav.checkRealArguments"), href: "/nyaybandhu/real-life", icon: Briefcase },
      ]
    },
<<<<<<< HEAD
    { name: t("nav.vicharakbandhu"), href: "/vicharakbandhu", icon: BookOpen },
    { name: t("nav.caseHeatmap"), href: "/case-heatmap", icon: MapPin },
    { name: t("nav.emergency") || "Emergency & Safety", href: "/emergency", icon: ShieldAlert },
    { name: t("nav.reports"), href: "/reports", icon: FileText },
    { name: t("nav.settings"), href: "/settings", icon: Settings },
=======
    { name: "VicharakBandhu (Review Documents)", href: "/vicharakbandhu", icon: BookOpen },
    { name: "Emergency & Safety", href: "/emergency", icon: ShieldAlert },
    { name: "Reports (My Case Summaries)", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
>>>>>>> 4893353 (add helpline)
  ];

  const isActive = (href: string) => {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-accent relative">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source
          src="/videos/background.mp4"
          type="video/mp4"
        />
      </video>

      {/* Content wrapper with relative positioning */}
      <div className="relative z-10 flex w-full min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/95 text-card-foreground backdrop-blur-sm">
        {/* Brand Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2.5 font-semibold text-lg tracking-wide text-accent">
            <Scale className="h-5.5 w-5.5 text-primary" />
            <span>{t("layout.brand")}</span>
          </Link>
        </div>

        {/* User Role Card */}
        <div className="p-4 mx-4 my-3 rounded-lg bg-secondary/40 border border-border/40 flex items-center gap-3">
          <div className="p-2 rounded bg-card text-primary border border-border/60">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">{getRoleLabel(role)}</span>
            <span className="text-[10px] text-muted-foreground truncate">{getRoleSummary(role)}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="space-y-1">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium ${
                    active 
                      ? "bg-secondary text-accent border-l-2 border-primary" 
                      : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
                
                {/* Sub-items list */}
                {item.subItems && active && (
                  <div className="pl-6 space-y-1 mt-1 border-l border-border/50 ml-5">
                    {item.subItems.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${
                            subActive 
                              ? "bg-secondary/60 text-accent font-semibold" 
                              : "hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <sub.icon className="h-3 w-3 shrink-0" />
                          <span>{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom System Status */}
        <div className="p-4 border-t border-border mt-auto flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500/80 animate-pulse" />
            {t("layout.assistantReady")}
          </span>
          <span>v1.0.0</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Persistent Top Header */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Nav toggle button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 border border-border rounded-md bg-secondary text-foreground"
              aria-label={t("layout.toggleMobileMenu")}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            
            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-muted-foreground border-r border-border/50 pr-4">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>{t("layout.securePrivate")}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 text-emerald-500" />
              <span>{t("layout.connectedReady")}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden border-b border-border bg-card/95 backdrop-blur-sm p-4 flex flex-col gap-2 shadow-lg z-50 absolute w-full top-14 left-0"
            >
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <div key={item.href} className="flex flex-col gap-1">
                    <Link
                      onClick={() => !item.subItems && setMobileOpen(false)}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                        active 
                          ? "bg-secondary text-accent" 
                          : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                    {item.subItems && active && (
                      <div className="pl-6 flex flex-col gap-1 mt-1 border-l border-border ml-4">
                        {item.subItems.map((sub) => {
                          const subActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              onClick={() => setMobileOpen(false)}
                              href={sub.href}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                                subActive 
                                  ? "bg-secondary/60 text-accent font-semibold" 
                                  : "hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <sub.icon className="h-3 w-3 shrink-0" />
                              <span>{sub.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Panel Viewport */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-background/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
      </div>
    </div>
  );
}
