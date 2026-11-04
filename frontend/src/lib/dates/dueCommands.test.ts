import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCreate } from "../commands/implementations/create";
import { parseEdit } from "../commands/implementations/edit";
import { parseFilter } from "../commands/implementations/filter";
import { monthCommand, todayCommand, weekCommand } from "../commands/implementations/dueView";
import { getCommand } from "../commands/registry";
import { dueModifier, extractDue } from "../modifiers/implementations/due";
import { tokenizePrompt } from "../../components/prompt/promptTokenize";
import { useUiStore } from "../../stores/ui";
import { createRootPane } from "../pane/factories";
import type { AppContext } from "../types";

const NOW = new Date(2026, 10, 18, 9, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("^ modifier", () => {
  it("turns each date into YYYY-MM-DD and keeps the rest of the text", () => {
    expect(extractDue("pay rent ^fri #home")).toEqual({
      values: ["2026-11-20"],
      invalid: [],
      remaining: "pay rent #home",
    });
    expect(extractDue("x ^none")).toMatchObject({ values: [""] });
    expect(extractDue("x ^soon")).toMatchObject({ values: [], invalid: ["soon"] });
  });

  it("suggests keywords with the date they stand for", () => {
    const options = dueModifier.getOptions!("to");
    expect(options.map((o) => o.value)).toEqual(["today", "tomorrow"]);
    expect(options[1].description).toBe("thu 19 nov 2026 · tomorrow");
    expect(dueModifier.getOptions!("26/11").map((o) => o.description)).toEqual(["thu 26 nov 2026 · in 8 days"]);
    expect(dueModifier.getOptions!("soon")).toEqual([]);
  });

  it("colors valid dates and strikes invalid ones in the prompt", () => {
    const tokens = tokenizePrompt("call mom ^tomorrow ^soon");
    expect(tokens.find((t) => t.text === "^tomorrow")?.className).toContain("text-accent");
    expect(tokens.find((t) => t.text === "^soon")?.className).toContain("line-through");
  });
});

describe("create, edit and filter with ^", () => {
  it("creates an item with a due date", () => {
    expect(parseCreate("pay rent ^31/12/26")).toMatchObject({ ok: true, req: { title: "pay rent", due_date: "2026-12-31" } });
    expect(parseCreate("pay rent")).toMatchObject({ ok: true, req: { due_date: undefined } });
    expect(parseCreate("pay rent ^none")).toMatchObject({ ok: true, req: { due_date: undefined } });
  });

  it("rejects an unknown or repeated date when creating", () => {
    expect(parseCreate("pay rent ^soon")).toEqual({ ok: false, error: 'Invalid due date "soon"' });
    expect(parseCreate("pay rent ^fri ^mon")).toEqual({ ok: false, error: "An item can only have one due date" });
  });

  it("sets or clears the due date when editing", () => {
    expect(parseEdit("^tomorrow", 3)).toEqual({ ok: true, patch: expect.objectContaining({ due_date: "2026-11-19" }) });
    expect(parseEdit("^none", 3)).toEqual({ ok: true, patch: expect.objectContaining({ due_date: "" }) });
    expect(parseEdit("^soon", 1)).toEqual({ ok: false, error: 'Invalid due date "soon"' });
  });

  it("filters by a single day", () => {
    expect(parseFilter("^today #work")).toMatchObject({ due_from: "2026-11-18", due_to: "2026-11-18", tags: ["work"] });
    expect(parseFilter("rent")).toMatchObject({ due_from: undefined, due_to: undefined });
  });
});

describe(":today, :week and :month", () => {
  const run = (command: typeof todayCommand, rawArgs = "") => {
    const setFilter = vi.fn();
    const root = createRootPane();
    useUiStore.setState({ mode: "insert", panes: [root], activePaneId: root.id });
    command.execute!({ rawArgs, app: { ui: { setFilter } } as unknown as AppContext });
    return setFilter.mock.calls[0][0];
  };

  it("are registered as commands", () => {
    expect(getCommand("today")).toBe(todayCommand);
    expect(getCommand("week")).toBe(weekCommand);
    expect(getCommand("month")).toBe(monthCommand);
  });

  it("show open items due by the end of the range, from every group, soonest first", () => {
    expect(run(todayCommand)).toEqual({
      due_to: "2026-11-18",
      recursive: true,
      status: ["TODO", "IN_PROGRESS"],
      order: ["due", "priority"],
    });
    expect(run(weekCommand).due_to).toBe("2026-11-22");
    expect(run(monthCommand).due_to).toBe("2026-11-30");
  });

  it("keep every other filter the user types", () => {
    expect(run(weekCommand, "rent #home !high @done %title")).toEqual({
      title: "rent",
      tags: ["home"],
      priority: ["high"],
      status: ["done"],
      order: ["title"],
      due_to: "2026-11-22",
      recursive: true,
    });
  });

  it("ignore a ^date, since the view sets the range", () => {
    expect(run(todayCommand, "^fri")).toMatchObject({ due_to: "2026-11-18" });
    expect(run(todayCommand, "^fri").due_from).toBeUndefined();
  });
});
