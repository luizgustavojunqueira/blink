import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HighlightedPrompt from "./highlightedPrompt";

function getSpans(container: HTMLElement) {
  const highlightDiv = container.querySelector("[aria-hidden='true']");
  if (!highlightDiv) return [];
  return Array.from(highlightDiv.querySelectorAll("span"));
}

describe("HighlightedPrompt", () => {
  it("renders nothing for null prompt", () => {
    const { container } = render(<HighlightedPrompt prompt={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for empty prompt", () => {
    const { container } = render(<HighlightedPrompt prompt="" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders plain text without highlight classes", () => {
    const { container } = render(<HighlightedPrompt prompt="hello world" />);
    const spans = getSpans(container);

    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe("hello world");
    expect(spans[0].className).toBe("");
  });

  it("highlights priority modifier !high", () => {
    const { container } = render(<HighlightedPrompt prompt="!high" />);
    const spans = getSpans(container);

    const prioritySpan = spans.find((s) => s.textContent === "!high");
    expect(prioritySpan).toBeDefined();
    expect(prioritySpan!.className).toContain("text-high");
    expect(prioritySpan!.className).toContain("font-medium");
  });

  it("highlights priority modifier !urgent", () => {
    const { container } = render(<HighlightedPrompt prompt="!urgent" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "!urgent");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-urgent");
  });

  it("highlights priority modifier !normal", () => {
    const { container } = render(<HighlightedPrompt prompt="!normal" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "!normal");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-normal");
  });

  it("highlights priority modifier !low", () => {
    const { container } = render(<HighlightedPrompt prompt="!low" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "!low");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-low");
  });

  it("uses accent color for unknown priority values", () => {
    const { container } = render(<HighlightedPrompt prompt="!custom" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "!custom");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-accent");
  });

  it("highlights tag modifier #dev", () => {
    const { container } = render(<HighlightedPrompt prompt="#dev" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "#dev");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-tag");
    expect(span!.className).toContain("font-medium");
  });

  it("highlights status modifier @done with done color", () => {
    const { container } = render(<HighlightedPrompt prompt="@done" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "@done");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-done");
  });

  it("highlights status modifier @todo with status color", () => {
    const { container } = render(<HighlightedPrompt prompt="@todo" />);
    const spans = getSpans(container);

    const span = spans.find((s) => s.textContent === "@todo");
    expect(span).toBeDefined();
    expect(span!.className).toContain("text-status");
  });

  it("highlights description delimiter $ with accent color", () => {
    const { container } = render(<HighlightedPrompt prompt="title $ description" />);
    const spans = getSpans(container);

    const delimiterSpan = spans.find((s) => s.textContent === "$");
    expect(delimiterSpan).toBeDefined();
    expect(delimiterSpan!.className).toContain("text-accent");
  });

  it("highlights text after $ as description (fg-dim)", () => {
    const { container } = render(<HighlightedPrompt prompt="title $ description text" />);
    const spans = getSpans(container);

    const descSpan = spans.find((s) =>
      s.textContent?.includes("description text"),
    );
    expect(descSpan).toBeDefined();
    expect(descSpan!.className).toContain("text-fg-dim");
  });

  it("highlights modifiers after $ with their own colors", () => {
    const { container } = render(<HighlightedPrompt prompt="title $ desc !high #tag" />);
    const spans = getSpans(container);

    const prioritySpan = spans.find((s) => s.textContent === "!high");
    expect(prioritySpan).toBeDefined();
    expect(prioritySpan!.className).toContain("text-high");

    const tagSpan = spans.find((s) => s.textContent === "#tag");
    expect(tagSpan).toBeDefined();
    expect(tagSpan!.className).toContain("text-tag");
  });

  it("highlights mixed modifiers correctly", () => {
    const { container } = render(<HighlightedPrompt prompt="title !high @done #dev" />);
    const spans = getSpans(container);

    const titleSpan = spans.find((s) => s.textContent?.includes("title"));
    expect(titleSpan).toBeDefined();
    expect(titleSpan!.className).not.toContain("text-high");
    expect(titleSpan!.className).not.toContain("text-tag");
    expect(titleSpan!.className).not.toContain("text-status");

    expect(spans.find((s) => s.textContent === "!high")!.className).toContain(
      "text-high",
    );
    expect(spans.find((s) => s.textContent === "@done")!.className).toContain(
      "text-done",
    );
    expect(spans.find((s) => s.textContent === "#dev")!.className).toContain(
      "text-tag",
    );
  });
});
