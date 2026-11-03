const DAY_MS = 86_400_000;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export const DUE_NONE = "none";

export const DUE_KEYWORDS = [
  "today",
  "tomorrow",
  "yesterday",
  ...WEEKDAY_NAMES.slice(1),
  WEEKDAY_NAMES[0],
  DUE_NONE,
] as const;

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
  const short = WEEKDAYS.indexOf(word.slice(0, 3));
  if (short === -1) return -1;
  const full = WEEKDAY_NAMES[short];
  return full.startsWith(word) && word.length >= 3 ? short : -1;
}

export function parseDue(input: string, now: Date = new Date()): string | null {
  const word = input.trim().toLowerCase();
  const today = startOfDay(now);

  if (word === DUE_NONE) return "";
  if (word === "today" || word === "tod") return toISODate(today);
  if (word === "tomorrow" || word === "tom" || word === "tmr") return toISODate(addDays(today, 1));
  if (word === "yesterday") return toISODate(addDays(today, -1));

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

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1 && days < 7) return WEEKDAYS[date.getDay()];

  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${String(date.getFullYear()).slice(2)}`;
}

export function describeDue(iso: string, now: Date = new Date()): string {
  const date = fromISODate(iso);
  const days = daysUntil(iso, now);
  if (!date || days === null) return "";

  const full = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  if (days === 0) return `${full} · today`;
  if (days === 1) return `${full} · tomorrow`;
  if (days === -1) return `${full} · yesterday`;
  return days > 0 ? `${full} · in ${days} days` : `${full} · ${-days} days ago`;
}

export type DueRange = { due_from?: string; due_to: string };

export function dueRange(view: "today" | "week" | "month", now: Date = new Date()): DueRange {
  const today = startOfDay(now);
  if (view === "today") return { due_to: toISODate(today) };
  if (view === "week") return { due_to: toISODate(addDays(today, (7 - today.getDay()) % 7)) };
  return { due_to: toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
}
