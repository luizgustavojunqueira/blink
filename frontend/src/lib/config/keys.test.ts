import { describe, expect, it } from "vitest";
import { findConflict, isValidKeymapEntry, parseKeys } from "./keys";
import { keyBindings } from "../keymap/registry";

const keys = (input: string) => {
  const parsed = parseKeys(input);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.keys;
};

const error = (input: string) => {
  const parsed = parseKeys(input);
  return "error" in parsed ? parsed.error : null;
};

describe("parseKeys", () => {
  it("splits alternatives on commas and sequences on spaces", () => {
    expect(keys("j, arrowdown")).toEqual(["j", "arrowdown"]);
    expect(keys("g g")).toEqual(["g g"]);
    expect(keys("  g   g ,x ")).toEqual(["g g", "x"]);
  });

  it("writes keys the same way the keyboard handler names them", () => {
    expect(keys("Ctrl+D")).toEqual(["ctrl+D"]);
    expect(keys("shift+ctrl+ArrowDown")).toEqual(["ctrl+shift+arrowdown"]);
    expect(keys("alt+meta+ctrl+x")).toEqual(["ctrl+alt+meta+x"]);
    expect(keys("G")).toEqual(["G"]);
  });

  it("accepts common aliases for named keys", () => {
    expect(keys("esc, up, pgdn, return")).toEqual([
      "escape",
      "arrowup",
      "pagedown",
      "enter",
    ]);
  });

  it("accepts symbol keys, including plus", () => {
    expect(keys("+, ctrl++, #")).toEqual(["+", "ctrl++", "#"]);
  });

  it("drops duplicates and empty alternatives", () => {
    expect(keys("j, j,, ")).toEqual(["j"]);
    expect(keys("")).toEqual([]);
  });

  it("rejects what the keyboard can never produce", () => {
    expect(error("foo")).toMatch(/not a key/);
    expect(error("hyper+j")).toMatch(/not a modifier/);
    expect(error("ctrl+ctrl+j")).toMatch(/repeats/);
    expect(error("ctrl+")).toMatch(/not a key/);
    expect(error("shift+g")).toMatch(/character itself/);
  });

  it("limits sequence length and number of alternatives", () => {
    expect(error("a b c d")).toMatch(/at most 3/);
    expect(error("a, b, c, d, e, f")).toMatch(/at most 5/);
  });
});

describe("findConflict", () => {
  it("reports a key already used in the same scope", () => {
    const conflict = findConflict("list:down", ["k"], {});

    expect(conflict?.key).toBe("k");
    expect(conflict?.binding.id).toBe("list:up");
  });

  it("reports a key taken by a global binding", () => {
    expect(findConflict("list:down", ["t"], {})?.binding.id).toBe("toggleHint");
    expect(findConflict("list:down", ["escape"], {})?.binding.id).toBe(
      "escape",
    );
  });

  it("reports the fixed prompt prefixes", () => {
    expect(findConflict("list:down", [":"], {})?.binding.id).toBe(
      "insertPrefix",
    );
  });

  it("allows the same key in a different scope", () => {
    expect(findConflict("list:down", ["y"], {})).toBeNull();
    expect(findConflict("detail:down", ["r"], {})).toBeNull();
  });

  it("reports a key that is a prefix of another sequence, and the other way around", () => {
    expect(findConflict("list:down", ["g"], {})?.binding.id).toBe("list:top");
    expect(findConflict("list:top", ["j j"], {})?.binding.id).toBe("list:down");
  });

  it("reports a binding whose own alternatives hide each other", () => {
    expect(findConflict("list:top", ["z", "z z"], {})?.binding.id).toBe(
      "list:top",
    );
  });

  it("checks against the current keymap, not the defaults", () => {
    expect(
      findConflict("list:down", ["n"], { "list:up": ["n"] })?.binding.id,
    ).toBe("list:up");
    expect(findConflict("list:down", ["k"], { "list:up": ["n"] })).toBeNull();
  });

  it("lets bindings that share keys by design keep sharing them", () => {
    expect(
      findConflict("updateTo:DONE", ["x"], { "bulkUpdateTo:DONE": ["x"] }),
    ).toBeNull();
  });

  it("finds no conflict in the default keymap", () => {
    for (const b of keyBindings) {
      expect(findConflict(b.id, b.keys, {}), b.id).toBeNull();
    }
  });
});

describe("isValidKeymapEntry", () => {
  it("accepts normalized key lists", () => {
    expect(isValidKeymapEntry(["j", "ctrl+d", "g g"])).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidKeymapEntry([])).toBe(false);
    expect(isValidKeymapEntry("j")).toBe(false);
    expect(isValidKeymapEntry([1])).toBe(false);
    expect(isValidKeymapEntry(["Ctrl+d"])).toBe(false);
    expect(isValidKeymapEntry(["j", "j"])).toBe(false);
    expect(isValidKeymapEntry(["nope"])).toBe(false);
  });
});
