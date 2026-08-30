import { describe, expect, it } from "vitest";
import { normalizeTagText } from "./normalizeTagText";

describe("normalizeTagText", () => {
  it("collapses repeated leading markers into one", () => {
    expect(normalizeTagText("###teste")).toBe("#teste");
  });

  it("collapses a repeated marker anywhere in the string", () => {
    expect(normalizeTagText("#work ###urgent")).toBe("#work #urgent");
  });

  it("leaves single markers untouched", () => {
    expect(normalizeTagText("#work #urgent")).toBe("#work #urgent");
  });

  it("leaves text with no marker untouched", () => {
    expect(normalizeTagText("abc")).toBe("abc");
  });

  it("collapses a marker repeated many times", () => {
    expect(normalizeTagText("#####teste")).toBe("#teste");
  });
});
