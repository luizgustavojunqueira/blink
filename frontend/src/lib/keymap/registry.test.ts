import { afterEach, describe, expect, it } from "vitest";
import {
  applyKeymap,
  availableKeys,
  getKeyBinding,
  isPrefix,
  keyBindings,
  resolve,
} from "./registry";
import type { KeyQueryContext, Mode } from "./types";
import type { DetailField, ListPane } from "../pane/types";
import { Group, Task } from "../../types/backend";
import type { ItemType } from "../../types/backend";

type CtxOptions = {
  panes?: number;
  activeIdx?: number;
  selectedId?: string | null;
  markedIds?: Set<string> | null;
  itemType?: ItemType;
};

const listPane = (
  id: string,
  selectedId: string | null,
  markedIds: Set<string> = new Set(),
): ListPane => ({
  id,
  type: "list",
  prompt: "",
  parentId: null,
  selectedId,
  renderedIds: selectedId ? [selectedId] : [],
  markedIds,
  anchorGuid: null,
  renderedTypes: {},
  filter: {},
});

const ctx = (
  mode: Mode,
  {
    panes = 1,
    activeIdx = 0,
    selectedId = "item-1",
    markedIds = null,
    itemType = Task,
  }: CtxOptions = {},
) => {
  const list = Array.from({ length: panes }, (_, i) =>
    listPane(`pane-${i}`, selectedId, markedIds ?? new Set()),
  );
  const pane = list[activeIdx];
  return {
    ui: { mode, panes: list, activePaneId: pane.id },
    pane,
    itemType: selectedId ? itemType : undefined,
  } as KeyQueryContext;
};

const detailCtx = (mode: Mode, selectedField: DetailField): KeyQueryContext => {
  const pane = {
    id: "detail-0",
    type: "detail" as const,
    itemId: "item-1",
    selectedField,
  };
  return {
    ui: { mode, panes: [pane], activePaneId: pane.id },
    pane,
  } as KeyQueryContext;
};

const configCtx = (selectedRow: string): KeyQueryContext => {
  const pane = { id: "config-0", type: "config" as const, selectedRow };
  return {
    ui: { mode: "normal", panes: [pane], activePaneId: pane.id },
    pane,
  } as KeyQueryContext;
};

describe("keymap registry: resolve", () => {
  it("keeps the item bindings out of reach while nothing is selected", () => {
    expect(resolve("3", ctx("normal", { selectedId: null }))).toBeUndefined();
    expect(resolve("l", ctx("normal", { selectedId: null }))).toBeUndefined();
  });

  it("resolves escape in all modes", () => {
    expect(resolve("escape", ctx("normal"))?.id).toBe("escape");
    expect(resolve("escape", ctx("insert"))?.id).toBe("escape");
    expect(resolve("escape", ctx("visual"))?.id).toBe("escape");
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
      ctx("normal", { itemType: Group }),
      ctx("insert"),
      ctx("normal", { selectedId: null, markedIds: new Set() }),
      ctx("normal", { markedIds: new Set(["item-1"]) }),
      ctx("normal", { panes: 2, activeIdx: 0 }),
      ctx("normal", { panes: 2, activeIdx: 1 }),
      detailCtx("normal", "status"),
      detailCtx("normal", "priority"),
      detailCtx("normal", "title"),
      configCtx("theme:gruvbox"),
      configCtx("theme:mine"),
      configCtx("key:list:down"),
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

describe("keymap registry: applyKeymap", () => {
  afterEach(() => applyKeymap({}));

  it("moves a binding to its new keys and frees the old ones", () => {
    applyKeymap({ "list:down": ["n"] });

    expect(resolve("n", ctx("normal"))?.id).toBe("list:down");
    expect(resolve("j", ctx("normal"))).toBeUndefined();
    expect(getKeyBinding("list:down")?.keys).toEqual(["n"]);
  });

  it("indexes the prefixes of remapped sequences", () => {
    applyKeymap({ "list:top": ["z z"] });

    expect(isPrefix("z", ctx("normal"))).toBe(true);
    expect(isPrefix("g", ctx("normal"))).toBe(false);
    expect(resolve("z z", ctx("normal"))?.id).toBe("list:top");
  });

  it("ignores overrides for fixed bindings and unknown ids", () => {
    applyKeymap({ escape: ["q"], nope: ["x"] });

    expect(resolve("escape", ctx("normal"))?.id).toBe("escape");
    expect(resolve("q", ctx("normal"))).toBeUndefined();
  });

  it("shows the remapped keys in the available keys", () => {
    applyKeymap({ "list:down": ["n"] });

    const down = availableKeys(ctx("normal")).find((a) => a.binding.id === "list:down");
    expect(down?.keys).toEqual(["n"]);
  });

  it("goes back to the defaults with an empty keymap", () => {
    applyKeymap({ "list:down": ["n"] });
    applyKeymap({});

    expect(resolve("j", ctx("normal"))?.id).toBe("list:down");
    expect(getKeyBinding("list:down")).toBe(keyBindings.find((b) => b.id === "list:down"));
  });
});
