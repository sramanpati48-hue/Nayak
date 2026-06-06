"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Scale, Gavel, Users, ArrowRight, LogOut } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/lib/language-context";

export default function GatewayHome() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { t } = useTranslation();

  const startMode = (target: "judge" | "portal") => {
    const continueUrl = `/auth/continue?target=${target}`;
    if (isSignedIn) {
      router.push(continueUrl);
      return;
    }
    router.push(`/sign-in?redirect_url=${encodeURIComponent(continueUrl)}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 font-semibold text-lg tracking-wide text-accent">
            <Scale className="h-5 w-5 text-primary" />
            <span>{t("layout.brand")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            {isSignedIn && (
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("gateway.signOut")}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-5xl space-y-8">
            <div className="text-center space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("gateway.badge")}</span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("gateway.title")}</h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">{t("gateway.subtitle")}</p>
              {isSignedIn && user && (
                <p className="text-xs text-muted-foreground">{t("gateway.signedInAs", { email: user.primaryEmailAddress?.emailAddress || user.id })}</p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <button
                onClick={() => startMode("judge")}
                className="group rounded-xl border border-border bg-card/90 backdrop-blur-sm p-6 text-left hover:border-primary/50 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Gavel className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-xl font-bold">{t("gateway.judgeTitle")}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("gateway.judgeDesc")}</p>
              </button>

              <button
                onClick={() => startMode("portal")}
                className="group rounded-xl border border-border bg-card/90 backdrop-blur-sm p-6 text-left hover:border-primary/50 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-secondary text-primary border border-border">
                    <Users className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-xl font-bold">{t("gateway.portalTitle")}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("gateway.portalDesc")}</p>
              </button>
            </div>

            {!isSignedIn && (
              <div className="text-center text-xs text-muted-foreground">
                {t("gateway.authHint")}{" "}
                <Link href="/sign-up" className="text-accent hover:underline">
                  {t("gateway.createAccount")}
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
