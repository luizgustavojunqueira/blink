import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextOverlay } from "./textOverlay";

function getSpans(container: HTMLElement) {
  const overlay = container.querySelector("[aria-hidden='true']");
  if (!overlay) return [];
  return Array.from(overlay.querySelectorAll("span"));
}

describe("TextOverlay", () => {
  it("renders nothing for empty text and no cursor", () => {
    const { container } = render(<TextOverlay text="" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders plain text as a single span without highlight, by default", () => {
    const { container } = render(<TextOverlay text="hello world" />);
    const spans = getSpans(container);
    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe("hello world");
    expect(spans[0].className).toBe("");
  });

  it("applies a custom tokenize function", () => {
    const tokenize = (text: string) => [{ text, className: "text-tag" }];
    const { container } = render(<TextOverlay text="#work" tokenize={tokenize} />);
    const spans = getSpans(container);
    expect(spans[0].className).toBe("text-tag");
  });

  it("renders the block cursor at the given offset, splitting the token around it", () => {
    const { container, getByTestId } = render(<TextOverlay text="abc" cursor={1} />);
    const overlay = container.querySelector("[aria-hidden='true']")!;
    expect(Array.from(overlay.children).map((s) => s.textContent)).toEqual(["a", "b", "c"]);
    expect(getByTestId("block-cursor")).toHaveTextContent("b");
  });

  it("renders an empty block cursor at the end of the text", () => {
    const { getByTestId } = render(<TextOverlay text="abc" cursor={3} />);
    expect(getByTestId("block-cursor")).toBeInTheDocument();
  });

  it("renders just the cursor for empty text when a cursor position is given", () => {
    const { container, getByTestId } = render(<TextOverlay text="" cursor={0} />);
    expect(container.innerHTML).not.toBe("");
    expect(getByTestId("block-cursor")).toBeInTheDocument();
  });

  it("does not render a cursor when cursor is null", () => {
    const { queryByTestId } = render(<TextOverlay text="abc" cursor={null} />);
    expect(queryByTestId("block-cursor")).not.toBeInTheDocument();
  });

  it("wraps by default", () => {
    const { container } = render(<TextOverlay text="abc" />);
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay?.className).toContain("whitespace-pre-wrap");
  });

  it("does not wrap when wrap is false", () => {
    const { container } = render(<TextOverlay text="abc" wrap={false} />);
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay?.className).toContain("whitespace-pre");
    expect(overlay?.className).not.toContain("whitespace-pre-wrap");
  });
});
