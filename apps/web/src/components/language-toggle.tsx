"use client";

import * as React from "react";
import { useTranslation } from "@/lib/language-context";
import type { Locale } from "@/lib/i18n/types";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-[4.5rem] rounded-md border bg-muted" />;
  }

  const options: { value: Locale; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "hi", label: "HI" },
  ];

  return (
    <div
      className="flex items-center rounded-md border border-border bg-secondary/30 p-0.5"
      role="group"
      aria-label={t("language.label")}
    >
      {options.map((option) => {
        const active = locale === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={
              option.value === "en"
                ? t("language.switchToEnglish")
                : t("language.switchToHindi")
            }
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
