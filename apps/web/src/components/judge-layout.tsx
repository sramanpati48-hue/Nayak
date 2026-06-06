"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Gavel, Scale, LogOut, Home } from "lucide-react";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { useTranslation } from "@/lib/language-context";

export function JudgeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/95 backdrop-blur-sm">
        <div className="p-6 border-b border-border">
          <Link href="/judge" className="flex items-center gap-2.5 font-semibold text-lg text-accent">
            <Gavel className="h-5 w-5 text-primary" />
            <span>{t("judge.brand")}</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/judge"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
              pathname === "/judge" ? "bg-secondary text-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <Scale className="h-4 w-4" />
            {t("judge.caseQueue")}
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          >
            <Home className="h-4 w-4" />
            {t("gateway.backToModes")}
          </Link>
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("gateway.signOut")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-6 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("judge.workspace")}</span>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
