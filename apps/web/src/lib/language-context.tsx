"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createTranslator, isLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";
import { isRole, type Role } from "@/lib/rbac";

const LOCALE_STORAGE_KEY = "nayak.locale";
const LOCALE_EVENT = "nayak-locale-changed";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : "en";
}

function setStoredLocale(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(new Event(LOCALE_EVENT));
}

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof createTranslator>;
  getRoleLabel: (role: string | null | undefined) => string;
  getRoleSummary: (role: string | null | undefined) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const syncLocale = () => setLocaleState(getStoredLocale());

    syncLocale();
    window.addEventListener("storage", syncLocale);
    window.addEventListener(LOCALE_EVENT, syncLocale as EventListener);

    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener(LOCALE_EVENT, syncLocale as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setStoredLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t = createTranslator(locale);

    const getRoleLabel = (role: string | null | undefined) => {
      const resolvedRole: Role = isRole(role) ? role : "normal_user";
      return t(`roles.${resolvedRole}.label`);
    };

    const getRoleSummary = (role: string | null | undefined) => {
      const resolvedRole: Role = isRole(role) ? role : "normal_user";
      return t(`roles.${resolvedRole}.summary`);
    };

    return { locale, setLocale, t, getRoleLabel, getRoleSummary };
  }, [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }

  return context;
}
