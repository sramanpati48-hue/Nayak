export const locales = ["en", "hi", "bn"] as const;

export type Locale = (typeof locales)[number];

export type TranslationTree = {
  [key: string]: string | TranslationTree;
};
