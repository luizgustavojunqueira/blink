import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TextField from "./textField";

describe("TextField", () => {
  it("renders a textarea with the given value and testId", () => {
    render(<TextField value="hello" onChange={vi.fn()} editing={false} testId="field" />);
    expect(screen.getByTestId("field")).toHaveValue("hello");
  });

  it("calls onChange with the new value on input", () => {
    const onChange = vi.fn();
    render(<TextField value="" onChange={onChange} editing={false} testId="field" />);

    fireEvent.change(screen.getByTestId("field"), { target: { value: "abc" } });

    expect(onChange).toHaveBeenCalledWith("abc");
  });

  it("calls onRequestEdit on click", () => {
    const onRequestEdit = vi.fn();
    render(
      <TextField value="" onChange={vi.fn()} editing={false} onRequestEdit={onRequestEdit} testId="field" />,
    );

    fireEvent.click(screen.getByTestId("field"));

    expect(onRequestEdit).toHaveBeenCalled();
  });

  it("delegates keydown handling to onKeyDown", () => {
    const onKeyDown = vi.fn();
    render(<TextField value="" onChange={vi.fn()} editing={false} onKeyDown={onKeyDown} testId="field" />);

    fireEvent.keyDown(screen.getByTestId("field"), { key: "Enter" });

    expect(onKeyDown).toHaveBeenCalled();
  });

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

  it("exposes the underlying textarea through ref", () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<TextField value="abc" onChange={vi.fn()} editing={false} ref={ref} testId="field" />);
    expect(ref.current).toBe(screen.getByTestId("field"));
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

  it("calls onBlur when the field loses focus", () => {
    const onBlur = vi.fn();
    render(<TextField value="abc" onChange={vi.fn()} editing={true} onBlur={onBlur} testId="field" />);

    fireEvent.blur(screen.getByTestId("field"));

    expect(onBlur).toHaveBeenCalled();
  });

  it("also calls onBlur when editing turns false, since that blurs the field itself", () => {
    const onBlur = vi.fn();
    const { rerender } = render(
      <TextField value="abc" onChange={vi.fn()} editing={true} onBlur={onBlur} testId="field" />,
    );

    rerender(<TextField value="abc" onChange={vi.fn()} editing={false} onBlur={onBlur} testId="field" />);

    expect(onBlur).toHaveBeenCalled();
  });
});
