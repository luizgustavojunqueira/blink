import { describe, expect, it } from "vitest";
import { availableKeys, getKeyBinding, keyBindings, resolve } from "./registry";
import type { KeyQueryContext, Mode } from "./types";
import type { DetailField, ListPane } from "../pane/types";

type CtxOptions = {
  panes?: number;
  activeIdx?: number;
  selectedId?: string | null;
};

const listPane = (id: string, selectedId: string | null): ListPane => ({
  id,
  type: "list",
  prompt: "",
  parentId: null,
  selectedId,
  renderedIds: selectedId ? [selectedId] : [],
  filter: {},
});

const ctx = (mode: Mode, { panes = 1, activeIdx = 0, selectedId = "item-1" }: CtxOptions = {}) => {
  const list = Array.from({ length: panes }, (_, i) => listPane(`pane-${i}`, selectedId));
  const pane = list[activeIdx];
  return {
    ui: { mode, panes: list, activePaneId: pane.id },
    pane,
  } as KeyQueryContext;
};

const detailCtx = (mode: Mode, selectedField: DetailField): KeyQueryContext => {
  const pane = {
    id: "detail-0",
    type: "detail" as const,
    parentId: null,
    itemId: "item-1",
    selectedField,
  };
  return {
    ui: { mode, panes: [pane], activePaneId: pane.id },
    pane,
  } as KeyQueryContext;
};

describe("keymap registry: resolve", () => {
  it("keeps the item bindings out of reach while nothing is selected", () => {
    expect(resolve("3", ctx("normal", { selectedId: null }))).toBeUndefined();
    expect(resolve("l", ctx("normal", { selectedId: null }))).toBeUndefined();
  });

  it("resolves escape in both modes", () => {
    expect(resolve("escape", ctx("normal"))?.id).toBe("escape");
    expect(resolve("escape", ctx("insert"))?.id).toBe("escape");
  });

  it("ignores normal mode keys while typing in insert mode", () => {
    expect(resolve("j", ctx("insert"))).toBeUndefined();
    expect(resolve("3", ctx("insert"))).toBeUndefined();
    expect(resolve("i", ctx("insert"))).toBeUndefined();
  });

  it("returns undefined for an unbound key", () => {
    expect(resolve("z", ctx("normal"))).toBeUndefined();
    expect(resolve("ctrl+z", ctx("normal"))).toBeUndefined();
    expect(resolve("9", ctx("normal"))).toBeUndefined();
  });

  it("reaches every binding through each of its keys, so none is shadowed", () => {
    const contexts = [
      ctx("normal"),
      ctx("insert"),
      ctx("normal", { selectedId: null }),
      ctx("normal", { panes: 2, activeIdx: 0 }),
      ctx("normal", { panes: 2, activeIdx: 1 }),
      detailCtx("normal", "status"),
      detailCtx("normal", "priority"),
      detailCtx("normal", "title"),
    ];

    for (const binding of keyBindings) {
      for (const key of binding.keys) {
        const reached = contexts.some((c) => resolve(key, c)?.id === binding.id);
        expect(reached, `${binding.id} via ${key}`).toBe(true);
      }
    }
  });
});

describe("keymap registry: getKeyBinding", () => {
  it("returns every registered binding by id", () => {
    for (const binding of keyBindings) {
      expect(getKeyBinding(binding.id)).toBe(binding);
    }
  });

  it("returns undefined for an unknown id", () => {
    expect(getKeyBinding("nope")).toBeUndefined();
  });
});

describe("keymap registry: availableKeys", () => {
  const find = (list: ReturnType<typeof availableKeys>, id: string) =>
    list.find((a) => a.binding.id === id);

  it("only returns bindings that match the given context", () => {
    const list = availableKeys(ctx("normal"));

    expect(find(list, "list:down")).toBeDefined();
    expect(find(list, "detail:down")).toBeUndefined();
  });

  it("merges every key of a binding into one entry, instead of one per key", () => {
    const list = availableKeys(ctx("normal"));

    const down = find(list, "list:down");
    expect(down?.keys.sort()).toEqual(["arrowdown", "j"]);
  });

  it("groups by the binding's hint, falling back to misc when there is none", () => {
    const list = availableKeys(ctx("normal"));

    expect(find(list, "list:down")?.group).toBe("nav");
    expect(find(list, "escape")?.group).toBe("misc");
  });

  it("switches which bindings are available between list and detail contexts", () => {
    const listEntries = availableKeys(ctx("normal"));
    const detailEntries = availableKeys(detailCtx("normal", "status"));

    expect(find(listEntries, "list:down")).toBeDefined();
    expect(find(listEntries, "detail:down")).toBeUndefined();

    expect(find(detailEntries, "detail:down")).toBeDefined();
    expect(find(detailEntries, "list:down")).toBeUndefined();
  });

  it("only surfaces the status bind matching the selected field", () => {
    const list = availableKeys(detailCtx("normal", "status"));

    expect(find(list, "detail:status:DONE")).toBeDefined();
    expect(find(list, "detail:priority:HIGH")).toBeUndefined();
  });

  it("still includes global bindings while typing in insert mode", () => {
    const list = availableKeys(ctx("insert"));

    expect(find(list, "escape")).toBeDefined();
    expect(find(list, "list:down")).toBeUndefined();
  });

  it("never returns an entry with no keys left", () => {
    for (const c of [ctx("normal"), ctx("insert"), detailCtx("normal", "title")]) {
      for (const entry of availableKeys(c)) {
        expect(entry.keys.length).toBeGreaterThan(0);
      }
    }
  });
});
