import { describe, expect, it } from "vitest";
import { tokenizePrompt } from "./promptTokenize";

function find(tokens: ReturnType<typeof tokenizePrompt>, text: string) {
  return tokens.find((t) => t.text === text);
}

describe("tokenizePrompt", () => {
  it("keeps plain text as a single token without highlight classes", () => {
    const tokens = tokenizePrompt("hello world");
    expect(tokens).toEqual([{ text: "hello world", className: "" }]);
  });

  it("highlights priority modifier !high", () => {
    const token = find(tokenizePrompt("!high"), "!high");
    expect(token?.className).toContain("text-high");
    expect(token?.className).toContain("font-medium");
  });

  it("highlights priority modifier !urgent", () => {
    expect(find(tokenizePrompt("!urgent"), "!urgent")?.className).toContain("text-urgent");
  });

  it("highlights priority modifier !normal", () => {
    expect(find(tokenizePrompt("!normal"), "!normal")?.className).toContain("text-normal");
  });

  it("highlights priority modifier !low", () => {
    expect(find(tokenizePrompt("!low"), "!low")?.className).toContain("text-low");
  });

  it("marks unknown priority as danger with strikethrough", () => {
    const token = find(tokenizePrompt("!custom"), "!custom");
    expect(token?.className).toContain("text-danger");
    expect(token?.className).toContain("line-through");
    expect(token?.className).toContain("font-bold");
  });

  it("uses accent for bare priority delimiter", () => {
    const token = find(tokenizePrompt("!"), "!");
    expect(token?.className).toContain("text-accent");
    expect(token?.className).not.toContain("line-through");
  });

  it("highlights tag modifier #dev", () => {
    const token = find(tokenizePrompt("#dev"), "#dev");
    expect(token?.className).toContain("text-tag");
    expect(token?.className).toContain("font-medium");
  });

  it("highlights status modifier @done with done color", () => {
    expect(find(tokenizePrompt("@done"), "@done")?.className).toContain("text-done");
  });

  it("highlights status modifier @todo with fg-dim color", () => {
    expect(find(tokenizePrompt("@todo"), "@todo")?.className).toContain("text-fg-dim");
  });

  it("highlights status modifier @in_progress with accent color", () => {
    expect(find(tokenizePrompt("@in_progress"), "@in_progress")?.className).toContain(
      "text-accent",
    );
  });

  it("highlights status modifier @canceled with fg-muted color", () => {
    expect(find(tokenizePrompt("@canceled"), "@canceled")?.className).toContain("text-fg-muted");
  });

  it("highlights status modifier @archived with fg-muted color", () => {
    expect(find(tokenizePrompt("@archived"), "@archived")?.className).toContain("text-fg-muted");
  });

  it("marks unknown status as danger with strikethrough", () => {
    const token = find(tokenizePrompt("@banana"), "@banana");
    expect(token?.className).toContain("text-danger");
    expect(token?.className).toContain("line-through");
    expect(token?.className).toContain("font-bold");
  });

  it("uses accent for bare status delimiter", () => {
    const token = find(tokenizePrompt("@"), "@");
    expect(token?.className).toContain("text-accent");
    expect(token?.className).not.toContain("line-through");
  });

  it("highlights description delimiter $ with accent color", () => {
    expect(find(tokenizePrompt("title $ description"), "$")?.className).toContain("text-accent");
  });

  it("highlights text after $ as description (fg-dim)", () => {
    const token = tokenizePrompt("title $ description text").find((t) =>
      t.text.includes("description text"),
    );
    expect(token?.className).toContain("text-fg-dim");
  });

  it("highlights modifiers after $ with their own colors", () => {
    const tokens = tokenizePrompt("title $ desc !high #tag");
    expect(find(tokens, "!high")?.className).toContain("text-high");
    expect(find(tokens, "#tag")?.className).toContain("text-tag");
  });

  it("highlights mixed modifiers correctly", () => {
    const tokens = tokenizePrompt("title !high @done #dev");
    const title = tokens.find((t) => t.text.includes("title"));
    expect(title?.className).not.toContain("text-high");
    expect(title?.className).not.toContain("text-tag");
    expect(find(tokens, "!high")?.className).toContain("text-high");
    expect(find(tokens, "@done")?.className).toContain("text-done");
    expect(find(tokens, "#dev")?.className).toContain("text-tag");
  });
});
