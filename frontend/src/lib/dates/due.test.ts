import { describe, expect, it } from "vitest";
import { daysUntil, describeDue, dueRange, formatDue, parseDue } from "./due";

const NOW = new Date(2026, 10, 15, 14, 30);

describe("parseDue", () => {
  it.each([
    ["today", "2026-11-15"],
    ["Today", "2026-11-15"],
    ["tomorrow", "2026-11-16"],
    ["tom", "2026-11-16"],
    ["yesterday", "2026-11-14"],
    ["+3", "2026-11-18"],
    ["+3d", "2026-11-18"],
    ["+2w", "2026-11-29"],
    ["fri", "2026-11-20"],
    ["friday", "2026-11-20"],
    ["sun", "2026-11-22"],
    ["mon", "2026-11-16"],
    ["26/11", "2026-11-26"],
    ["15/11", "2026-11-15"],
    ["10/01", "2027-01-10"],
    ["1/2", "2027-02-01"],
    ["31/12/26", "2026-12-31"],
    ["31/12/2027", "2027-12-31"],
    ["2026-12-05", "2026-12-05"],
    ["none", ""],
  ])("reads %s as %s", (input, expected) => {
    expect(parseDue(input, NOW)).toBe(expected);
  });

  it.each(["", "soon", "31/02", "30/02/26", "2026-02-30", "13/13", "+", "fr", "+1y"])("rejects %s", (input) => {
    expect(parseDue(input, NOW)).toBeNull();
  });
});

describe("formatDue", () => {
  it.each([
    ["2026-11-15", "today"],
    ["2026-11-16", "tomorrow"],
    ["2026-11-14", "yesterday"],
    ["2026-11-20", "fri"],
    ["2026-11-21", "sat"],
    ["2026-11-22", "22 nov"],
    ["2026-11-25", "25 nov"],
    ["2026-11-01", "1 nov"],
    ["2027-01-10", "10 jan 27"],
  ])("shows %s as %s", (iso, label) => {
    expect(formatDue(iso, NOW)).toBe(label);
  });

  it("counts days from the start of today", () => {
    expect(daysUntil("2026-11-15", NOW)).toBe(0);
    expect(daysUntil("2026-11-13", NOW)).toBe(-2);
  });

  it("describes the date in full with the distance", () => {
    expect(describeDue("2026-11-20", NOW)).toBe("fri 20 nov 2026 · in 5 days");
    expect(describeDue("2026-11-13", NOW)).toBe("fri 13 nov 2026 · 2 days ago");
  });
});

describe("dueRange", () => {
  it("ends today, this sunday or the end of the month", () => {
    expect(dueRange("today", NOW)).toEqual({ due_to: "2026-11-15" });
    expect(dueRange("week", new Date(2026, 10, 18))).toEqual({ due_to: "2026-11-22" });
    expect(dueRange("week", NOW)).toEqual({ due_to: "2026-11-15" });
    expect(dueRange("month", NOW)).toEqual({ due_to: "2026-11-30" });
    expect(dueRange("month", new Date(2026, 1, 3))).toEqual({ due_to: "2026-02-28" });
  });
});
