import { describe, expect, it } from "vitest";
import { tokenizeTags } from "./tokenizeTags";

function find(tokens: ReturnType<typeof tokenizeTags>, text: string) {
  return tokens.find((t) => t.text === text);
}

describe("tokenizeTags", () => {
  it("highlights a single tag", () => {
    const token = find(tokenizeTags("#work"), "#work");
    expect(token?.className).toContain("text-tag");
  });

  it("highlights several tags independently", () => {
    const tokens = tokenizeTags("#work #urgent");
    expect(find(tokens, "#work")?.className).toContain("text-tag");
    expect(find(tokens, "#urgent")?.className).toContain("text-tag");
  });

  it("flags a stray word without # as invalid", () => {
    const token = find(tokenizeTags("#work oops"), " oops");
    expect(token?.className).toContain("text-danger");
    expect(token?.className).toContain("line-through");
  });

  it("flags an empty field's worth of plain text as invalid", () => {
    const token = find(tokenizeTags("just text"), "just text");
    expect(token?.className).toContain("text-danger");
  });

  it("leaves the whitespace between valid tags unstyled, instead of flagging it", () => {
    const token = find(tokenizeTags("#work #urgent"), " ");
    expect(token?.className).toBe("");
  });

  it("leaves surrounding whitespace unstyled even with several spaces", () => {
    const token = find(tokenizeTags("#work   #urgent"), "   ");
    expect(token?.className).toBe("");
  });
});
