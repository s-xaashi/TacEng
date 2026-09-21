export type Locale = "en" | "so";

export const DEFAULT_LOCALE: Locale = "en";

export const translations = {
  en: {
    languageName: "English",
    switchTo: "Af-Soomaali",
    nav: {
      home: "Home",
      projects: "Projects",
      about: "About",
      blog: "Blog",
      contact: "Contact",
      marketplace: "Marketplace ↗",
    },
  },
  so: {
    languageName: "Af-Soomaali",
    switchTo: "English",
    nav: {
      home: "Hoyga",
      projects: "Mashaariic",
      about: "Aniga igu saabsan",
      blog: "Maqaallo",
      contact: "Xiriir",
      marketplace: "Suuqa dukumentiyada ↗",
    },
  },
} as const;

export type TranslationDictionary = (typeof translations)[Locale];
