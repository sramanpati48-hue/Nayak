"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Settings, Save, Server, Shield, SunMoon, RotateCcw, BadgeInfo } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useSessionContext } from "@/lib/session-context";
import { useTranslation } from "@/lib/language-context";
import { roles } from "@/lib/rbac";

export default function AppSettings() {
  const { role, userId, setRole, resetUserId } = useSessionContext();
  const { t, getRoleLabel, getRoleSummary } = useTranslation();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="border-b border-border pb-4 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">{t("settings.configuration")}</span>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-primary" />
            <span>{t("settings.title")}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-accent flex items-center gap-2">
              <BadgeInfo className="h-4 w-4 text-primary" />
              <span>{t("settings.roleAccess")}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.roleAccessDesc")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block">{t("settings.currentRole")}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as (typeof roles)[number])}
                  className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {getRoleLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block">{t("settings.currentSessionId")}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={userId}
                    className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs text-foreground"
                  />
                  <button
                    type="button"
                    onClick={resetUserId}
                    className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary px-3 h-9 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("common.reset")}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block">{getRoleLabel(role)}</span>
              <span>{getRoleSummary(role)}</span>
            </div>
            {role === "judge" && (
              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                {t("roles.judgeNotice")}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-accent flex items-center gap-2">
              <SunMoon className="h-4 w-4 text-primary" />
              <span>{t("settings.themePreferences")}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.themeDesc")}
            </p>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="text-xs text-muted-foreground">{t("settings.changeTheme")}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-accent flex items-center gap-2">
              <BadgeInfo className="h-4 w-4 text-primary" />
              <span>{t("language.label")}</span>
            </h3>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <span className="text-xs text-muted-foreground">{t("language.label")}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-accent flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <span>{t("settings.helperConnection")}</span>
            </h3>
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-muted-foreground block">
                {t("settings.helperUrl")}
              </label>
              <input
                type="text"
                defaultValue="http://localhost:8000/api/v1"
                className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-accent flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>{t("settings.assistantKeys")}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.assistantKeysDesc")}
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block">{t("settings.openaiKey")}</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block">{t("settings.anthropicKey")}</label>
                <input
                  type="password"
                  placeholder="sk-ant-api03-..."
                  className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground block">{t("settings.geminiKey")}</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  className="w-full h-9 bg-secondary/20 border border-border rounded px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold h-9 px-6 shadow-sm transition-colors">
              <Save className="h-4 w-4" />
              <span>{t("settings.saveSettings")}</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
