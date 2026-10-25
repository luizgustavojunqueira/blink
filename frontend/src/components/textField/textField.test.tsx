import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TextField from "./textField";

describe("TextField", () => {
  it("focuses the textarea when editing turns true", () => {
    const { rerender } = render(
      <TextField value="abc" onChange={vi.fn()} editing={false} testId="field" />,
    );
    expect(document.activeElement).not.toBe(screen.getByTestId("field"));

    rerender(<TextField value="abc" onChange={vi.fn()} editing={true} testId="field" />);

    expect(document.activeElement).toBe(screen.getByTestId("field"));
  });

  it("blurs the textarea when editing turns false", () => {
    const { rerender } = render(
      <TextField value="abc" onChange={vi.fn()} editing={true} testId="field" />,
    );
    expect(document.activeElement).toBe(screen.getByTestId("field"));

    rerender(<TextField value="abc" onChange={vi.fn()} editing={false} testId="field" />);

    expect(document.activeElement).not.toBe(screen.getByTestId("field"));
  });

  it("shows the block cursor only while editing with a collapsed selection", () => {
    render(<TextField value="abc" onChange={vi.fn()} editing={true} testId="field" />);
    expect(screen.getByTestId("block-cursor")).toBeInTheDocument();
  });

  it("hides the block cursor while not editing", () => {
    render(<TextField value="abc" onChange={vi.fn()} editing={false} testId="field" />);
    expect(screen.queryByTestId("block-cursor")).not.toBeInTheDocument();
  });

  it("applies a custom tokenize function to the overlay", () => {
    const tokenize = () => [{ text: "abc", className: "text-tag" }];
    const { container } = render(
      <TextField value="abc" onChange={vi.fn()} editing={false} tokenize={tokenize} testId="field" />,
    );
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay?.querySelector("span")?.className).toBe("text-tag");
  });

  it("strips newlines typed or pasted into a singleLine field", () => {
    const onChange = vi.fn();
    render(
      <TextField value="" onChange={onChange} editing={false} singleLine testId="field" />,
    );

    fireEvent.change(screen.getByTestId("field"), { target: { value: "a\nb" } });

    expect(onChange).toHaveBeenCalledWith("ab");
  });

  it("prevents Enter from inserting a newline in a singleLine field", () => {
    render(<TextField value="" onChange={vi.fn()} editing={false} singleLine testId="field" />);

    const event = fireEvent.keyDown(screen.getByTestId("field"), {
      key: "Enter",
      cancelable: true,
    });

    expect(event).toBe(false);
  });

  it("still lets onKeyDown observe Enter on a singleLine field", () => {
    const onKeyDown = vi.fn();
    render(
      <TextField
        value=""
        onChange={vi.fn()}
        editing={false}
        singleLine
        onKeyDown={onKeyDown}
        testId="field"
      />,
    );

    fireEvent.keyDown(screen.getByTestId("field"), { key: "Enter" });

    expect(onKeyDown).toHaveBeenCalled();
  });

  it("does not wrap a singleLine field, so long text scrolls horizontally", () => {
    const { container } = render(
      <TextField value="a very long line of text" onChange={vi.fn()} editing={false} singleLine testId="field" />,
    );
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay?.className).toContain("whitespace-pre");
    expect(overlay?.className).not.toContain("whitespace-pre-wrap");
    expect(screen.getByTestId("field")).toHaveAttribute("wrap", "off");
  });

  it("pins scroll to the far end when the caret sits at the end of an overflowing singleLine field", () => {
    render(<TextField value="a very long line of text" onChange={vi.fn()} editing={false} singleLine testId="field" />);
    const field = screen.getByTestId("field") as HTMLTextAreaElement;

    Object.defineProperty(field, "scrollWidth", { value: 500, configurable: true });
    field.setSelectionRange(field.value.length, field.value.length);
    fireEvent.select(field);

    expect(field.scrollLeft).toBe(500);
  });

  it("scrolls the overlay far enough to reveal the trailing cursor cell, not just the text", () => {
    const { container } = render(
      <TextField value="a very long line of text" onChange={vi.fn()} editing={false} singleLine testId="field" />,
    );
    const field = screen.getByTestId("field") as HTMLTextAreaElement;
    const overlay = container.querySelector("[aria-hidden='true']") as HTMLDivElement;

    Object.defineProperty(field, "scrollWidth", { value: 500, configurable: true });
    Object.defineProperty(overlay, "scrollWidth", { value: 520, configurable: true });
    field.setSelectionRange(field.value.length, field.value.length);
    fireEvent.select(field);

    expect(overlay.scrollLeft).toBe(520);
  });

  it("does not force scroll when the caret is not at the end of a singleLine field", () => {
    render(<TextField value="a very long line of text" onChange={vi.fn()} editing={false} singleLine testId="field" />);
    const field = screen.getByTestId("field") as HTMLTextAreaElement;

    Object.defineProperty(field, "scrollWidth", { value: 500, configurable: true });
    field.scrollLeft = 42;
    field.setSelectionRange(0, 0);
    fireEvent.select(field);

    expect(field.scrollLeft).toBe(42);
  });

  it("wraps a regular (non-singleLine) field", () => {
    const { container } = render(<TextField value="abc" onChange={vi.fn()} editing={false} testId="field" />);
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay?.className).toContain("whitespace-pre-wrap");
    expect(screen.getByTestId("field")).toHaveAttribute("wrap", "soft");
  });

  it("also calls onBlur when editing turns false, since that blurs the field itself", () => {
    const onBlur = vi.fn();
    const { rerender } = render(
      <TextField value="abc" onChange={vi.fn()} editing={true} onBlur={onBlur} testId="field" />,
    );

    rerender(<TextField value="abc" onChange={vi.fn()} editing={false} onBlur={onBlur} testId="field" />);

    expect(onBlur).toHaveBeenCalled();
  });

  it("shows a bullet per character instead of the value when masked", () => {
    const { container } = render(
      <TextField value="secret" onChange={vi.fn()} editing={false} mask testId="field" />,
    );

    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay?.textContent).toBe("••••••");
    expect(overlay?.textContent).not.toContain("secret");
  });
});
