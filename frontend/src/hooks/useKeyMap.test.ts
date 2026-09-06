import { describe, expect, it } from "vitest";
import { eventToKey } from "./useKeyMap";
import { keyBindings } from "../lib/keymap/registry";

const press = (init: Partial<KeyboardEvent>) => eventToKey(init as KeyboardEvent);

const fromToken = (token: string): KeyboardEvent => {
  const parts = token.split("+");
  const key = parts.pop() ?? "";

  return {
    key: key === "space" ? " " : key,
    ctrlKey: parts.includes("ctrl"),
    altKey: parts.includes("alt"),
    metaKey: parts.includes("meta"),
    shiftKey: parts.includes("shift"),
  } as KeyboardEvent;
};

describe("eventToKey", () => {
  it("names the space bar the way the keymap registers it", () => {
    expect(press({ key: " " })).toBe("space");
  });

  it("lowercases named keys and leaves single characters as typed", () => {
    expect(press({ key: "Escape" })).toBe("escape");
    expect(press({ key: "ArrowDown" })).toBe("arrowdown");
    expect(press({ key: "G" })).toBe("G");
  });

  it("prefixes the modifiers that are held down", () => {
    expect(press({ key: "d", ctrlKey: true })).toBe("ctrl+d");
    expect(press({ key: "ArrowRight", ctrlKey: true })).toBe("ctrl+arrowright");
  });

  it("ignores a modifier pressed on its own", () => {
    expect(press({ key: "Shift" })).toBe("");
  });
});

describe("keymap registry: key tokens", () => {
  it("only registers tokens that a real key press can produce", () => {
    for (const binding of keyBindings) {
      for (const combo of binding.keys) {
        for (const token of combo.split(" ")) {
          expect(token, `${binding.id} has an empty token in "${combo}"`).not.toBe("");
          expect(eventToKey(fromToken(token)), `${binding.id} registers "${token}"`).toBe(token);
        }
      }
    }
  });
});
