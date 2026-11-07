import { useSyncExternalStore } from "react";
import { pt } from "./pt";

export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const LANGUAGE_SETTINGS = ["auto", ...LOCALES] as const;
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number];

export const isLanguageSetting = (v: unknown): v is LanguageSetting =>
  (LANGUAGE_SETTINGS as readonly unknown[]).includes(v);

export type Params = Record<string, string | number>;

const DICTIONARIES: Record<Locale, Record<string, string> | null> = { en: null, pt };
const HTML_LANG: Record<Locale, string> = { en: "en", pt: "pt-BR" };

let current: Locale = "en";
const listeners = new Set<() => void>();

const fill = (template: string, params?: Params) =>
  params ? template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match)) : template;

export function t(text: string, params?: Params): string {
  return fill(DICTIONARIES[current]?.[text] ?? text, params);
}

export const getLocale = () => current;

export function resolveLocale(setting: LanguageSetting): Locale {
  if (setting !== "auto") return setting;
  const languages = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  return languages.some((l) => l?.toLowerCase().startsWith("pt")) ? "pt" : "en";
}

export function applyLanguage(setting: LanguageSetting) {
  const next = resolveLocale(setting);
  if (typeof document !== "undefined") document.documentElement.lang = HTML_LANG[next];
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLocale = () => useSyncExternalStore(subscribe, getLocale, getLocale);
