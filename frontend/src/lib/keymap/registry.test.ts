import { describe, expect, it } from "vitest";
import { getKeyBinding, keyBindings, resolve } from "./registry";
import type { KeyContext, Mode } from "./types";
import type { ListPane } from "../pane/types";

type CtxOptions = { panes?: number; activeIdx?: number; selectedId?: string | null };

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
  return { app: { ui: { mode, panes: list, activePaneId: pane.id } }, pane } as KeyContext;
};

describe("keymap registry: resolve", () => {
  it("resolves the navigation keys in normal mode", () => {
    expect(resolve("j", ctx("normal"))?.id).toBe("list:down");
    expect(resolve("arrowdown", ctx("normal"))?.id).toBe("list:down");
    expect(resolve("k", ctx("normal"))?.id).toBe("list:up");
    expect(resolve("arrowup", ctx("normal"))?.id).toBe("list:up");
  });

  it("resolves the paged navigation keys in normal mode", () => {
    expect(resolve("ctrl+d", ctx("normal"))?.id).toBe("list:ctrldown");
    expect(resolve("ctrl+arrowdown", ctx("normal"))?.id).toBe("list:ctrldown");
    expect(resolve("ctrl+u", ctx("normal"))?.id).toBe("list:ctrlup");
    expect(resolve("ctrl+arrowup", ctx("normal"))?.id).toBe("list:ctrlup");
  });

  it("maps the digits to the status bindings", () => {
    expect(resolve("1", ctx("normal"))?.id).toBe("updateTo:TODO");
    expect(resolve("2", ctx("normal"))?.id).toBe("updateTo:IN_PROGRESS");
    expect(resolve("3", ctx("normal"))?.id).toBe("updateTo:DONE");
    expect(resolve("4", ctx("normal"))?.id).toBe("updateTo:CANCELED");
    expect(resolve("5", ctx("normal"))?.id).toBe("updateTo:ARCHIVED");
  });

  it("resolves the prompt prefixes in normal mode", () => {
    expect(resolve("i", ctx("normal"))?.id).toBe("insertMode");
    expect(resolve("#", ctx("normal"))?.id).toBe("insertPrefix");
    expect(resolve("!", ctx("normal"))?.id).toBe("insertPrefix");
    expect(resolve("@", ctx("normal"))?.id).toBe("insertPrefix");
    expect(resolve(":", ctx("normal"))?.id).toBe("insertPrefix");
  });

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
