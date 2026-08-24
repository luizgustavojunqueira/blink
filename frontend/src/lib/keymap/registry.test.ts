import { describe, expect, it } from "vitest";
import { getKeyBinding, keyBindings, resolve } from "./registry";
import type { KeyContext, Mode } from "./types";

const ctx = (mode: Mode) => ({ app: { ui: { mode } } }) as KeyContext;

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
    expect(resolve("#", ctx("normal"))?.id).toBe("insert:#");
    expect(resolve("!", ctx("normal"))?.id).toBe("insert:!");
    expect(resolve("@", ctx("normal"))?.id).toBe("insert:@");
    expect(resolve(":", ctx("normal"))?.id).toBe("insert::");
    expect(resolve("/", ctx("normal"))?.id).toBe("insert:/");
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
    for (const binding of keyBindings) {
      for (const key of binding.keys) {
        for (const mode of binding.modes) {
          expect(resolve(key, ctx(mode))?.id).toBe(binding.id);
        }
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
