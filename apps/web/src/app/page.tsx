"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Scale, Gavel, Users, ArrowRight, LogOut, ShieldAlert, MapPin, BookOpen } from "lucide-react";
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

  const QUICK_DIALS = [
    { key: "100", number: "100", en: "Police" },
    { key: "101", number: "101", en: "Fire" },
    { key: "108", number: "108", en: "Ambulance" },
  ];

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

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-secondary rounded border border-border text-primary">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 rounded">Safety Module</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Emergency & Safety Hub</h2>
                  <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">Track live location, prepare a one-tap SOS package, and jump to legal, medical, and protection resources when you need urgent support.</p>
                </div>
                <div className="mt-8 pt-4 border-t border-border/40 flex items-center gap-4 text-xs font-medium">
                  <Link href="/emergency" className="flex items-center gap-1 text-accent hover:underline">Open Safety Hub <ArrowRight className="h-3 w-3" /></Link>
                  <span className="text-border">|</span>
                  <Link href="/emergency#location" className="flex items-center gap-1 text-accent hover:underline">Know My Location <MapPin className="h-3 w-3" /></Link>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/45 transition-all shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-secondary rounded border border-border text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold">{t("gateway.portalTitle")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("gateway.portalDesc")}</p>
                </div>
              </div>
            </div>

            {!isSignedIn && (
              <div className="text-center text-xs text-muted-foreground">
                {t("gateway.authHint")} {" "}
                <Link href="/sign-up" className="text-accent hover:underline">{t("gateway.createAccount")}</Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
