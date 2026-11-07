import { getLocale, t, type Locale } from "../i18n";

const DAY_MS = 86_400_000;

type DueWords = {
  today: string[];
  tomorrow: string[];
  yesterday: string[];
  none: string[];
  weekdays: string[];
  weekdayNames: string[];
  months: string[];
};

const WORDS: Record<Locale, DueWords> = {
  en: {
    today: ["today", "tod"],
    tomorrow: ["tomorrow", "tom", "tmr"],
    yesterday: ["yesterday"],
    none: ["none"],
    weekdays: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    weekdayNames: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    months: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
  },
  pt: {
    today: ["hoje"],
    tomorrow: ["amanhã", "amn"],
    yesterday: ["ontem"],
    none: ["nenhuma"],
    weekdays: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
    weekdayNames: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
    months: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  },
};

const ALL_WORDS = Object.values(WORDS);

const plain = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "");

const matches = (word: string, list: string[]) => list.some((w) => plain(w) === word);

export const DUE_NONE = "none";

export function dueKeywords(locale: Locale = getLocale()): string[] {
  const w = WORDS[locale];
  const names = w.weekdayNames.map((name) => name.split("-")[0]);
  return [w.today[0], w.tomorrow[0], w.yesterday[0], ...names.slice(1), names[0], w.none[0]];
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function fromISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return realDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function realDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function weekdayIndex(word: string): number {
  if (word.length < 3) return -1;
  for (const w of ALL_WORDS) {
    const day = w.weekdays.findIndex((short) => plain(short) === word.slice(0, 3));
    if (day !== -1 && plain(w.weekdayNames[day]).startsWith(word)) return day;
  }
  return -1;
}

export function parseDue(input: string, now: Date = new Date()): string | null {
  const word = plain(input.trim().toLowerCase());
  const today = startOfDay(now);

  if (word === DUE_NONE || ALL_WORDS.some((w) => matches(word, w.none))) return "";
  if (ALL_WORDS.some((w) => matches(word, w.today))) return toISODate(today);
  if (ALL_WORDS.some((w) => matches(word, w.tomorrow))) return toISODate(addDays(today, 1));
  if (ALL_WORDS.some((w) => matches(word, w.yesterday))) return toISODate(addDays(today, -1));

  const relative = /^\+(\d{1,3})([dw]?)$/.exec(word);
  if (relative) {
    const amount = Number(relative[1]) * (relative[2] === "w" ? 7 : 1);
    return toISODate(addDays(today, amount));
  }

  const weekday = weekdayIndex(word);
  if (weekday !== -1) {
    const ahead = (weekday - today.getDay() + 7) % 7 || 7;
    return toISODate(addDays(today, ahead));
  }

  const iso = fromISODate(word);
  if (iso) return toISODate(iso);

  const dayMonth = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(word);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = Number(dayMonth[2]);
    if (dayMonth[3]) {
      const year = dayMonth[3].length === 2 ? 2000 + Number(dayMonth[3]) : Number(dayMonth[3]);
      const date = realDate(year, month, day);
      return date ? toISODate(date) : null;
    }
    const thisYear = realDate(today.getFullYear(), month, day);
    if (thisYear && thisYear >= today) return toISODate(thisYear);
    const nextYear = realDate(today.getFullYear() + 1, month, day);
    return nextYear ? toISODate(nextYear) : null;
  }

  return null;
}

export function daysUntil(iso: string, now: Date = new Date()): number | null {
  const date = fromISODate(iso);
  if (!date) return null;
  return Math.round((date.getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function formatDue(iso: string, now: Date = new Date()): string {
  const date = fromISODate(iso);
  const days = daysUntil(iso, now);
  if (!date || days === null) return iso;

  const w = WORDS[getLocale()];
  if (days === 0) return w.today[0];
  if (days === 1) return w.tomorrow[0];
  if (days === -1) return w.yesterday[0];
  if (days > 1 && days < 7) return w.weekdays[date.getDay()];

  const label = `${date.getDate()} ${w.months[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${String(date.getFullYear()).slice(2)}`;
}

export function describeDue(iso: string, now: Date = new Date()): string {
  const date = fromISODate(iso);
  const days = daysUntil(iso, now);
  if (!date || days === null) return "";

  const w = WORDS[getLocale()];
  const full = `${w.weekdays[date.getDay()]} ${date.getDate()} ${w.months[date.getMonth()]} ${date.getFullYear()}`;
  if (days === 0) return `${full} · ${w.today[0]}`;
  if (days === 1) return `${full} · ${w.tomorrow[0]}`;
  if (days === -1) return `${full} · ${w.yesterday[0]}`;
  return days > 0
    ? `${full} · ${t("in {count} days", { count: days })}`
    : `${full} · ${t("{count} days ago", { count: -days })}`;
}

export type DueRange = { due_from?: string; due_to: string };

export function dueRange(view: "today" | "week" | "month", now: Date = new Date()): DueRange {
  const today = startOfDay(now);
  if (view === "today") return { due_to: toISODate(today) };
  if (view === "week") return { due_to: toISODate(addDays(today, (7 - today.getDay()) % 7)) };
  return { due_to: toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
}
