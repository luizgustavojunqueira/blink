import { describe, expect, it } from "vitest";
import { PROFILE_ROW_IDS, parseProfileRow, profileRowId } from "./rows";

describe("profile rows", () => {
  it("round-trips every row id", () => {
    for (const id of PROFILE_ROW_IDS) {
      const kind = parseProfileRow(id);
      expect(kind).not.toBeNull();
      expect(profileRowId(kind!)).toBe(id);
    }
  });

  it("rejects unknown ids", () => {
    expect(parseProfileRow(null)).toBeNull();
    expect(parseProfileRow("theme:nord")).toBeNull();
    expect(parseProfileRow("profile:nope")).toBeNull();
  });
});
