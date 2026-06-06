import type { Locale, TranslationTree } from "./types";
import { en } from "./en";
import { hi } from "./hi";
import { bn } from "./bn";

const dictionaries: Record<Locale, TranslationTree> = { en, hi, bn };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "hi" || value === "bn";
}

export function getDictionary(locale: Locale): TranslationTree {
  return dictionaries[locale];
}

export function createTranslator(locale: Locale) {
  const dictionary = getDictionary(locale);

  return function translate(
    key: string,
    params?: Record<string, string | number>
  ): string {
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as TranslationTree)[part];
      }
      return undefined;
    }, dictionary);

    if (typeof value !== "string") {
      return key;
    }

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce(
      (result, [paramKey, paramValue]) =>
        result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
      value
    );
  };
}
