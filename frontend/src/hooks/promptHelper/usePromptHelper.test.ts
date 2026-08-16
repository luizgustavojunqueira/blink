import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePromptHelper } from "./usePromptHelper";

function createInputRef(value: string, cursor: number) {
  const input = document.createElement("input");
  input.value = value;
  input.setSelectionRange(cursor, cursor);
  return { current: input };
}

describe("usePromptHelper", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it("opens MODIFIER options when typing ?", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("?", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.every((o) => o.type === "MODIFIER")).toBe(
      true,
    );
    expect(result.current.selectedIndex).toBe(0);
  });

  it("opens MODIFIER options when typing /", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options[0].type).toBe("COMMAND");
  });

  it("filters STATUS options when typing @TO", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@TO", 3);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.every((o) => o.type === "STATUS")).toBe(true);
    expect(result.current.options.some((o) => o.value === "TODO")).toBe(true);
  });

  it("filters PRIORITY options when typing !HI", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("!HI", 3);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.options.every((o) => o.type === "PRIORITY")).toBe(
      true,
    );
    expect(result.current.options.some((o) => o.value === "HIGH")).toBe(true);
  });

  it("closes options for unknown modifier", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("xfoo", 4);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toHaveLength(0);
  });

  it("selects a STATUS option and inserts value with correct cursor", () => {
    const inputRef = createInputRef("@TO", 3);
    const setPrompt = vi.fn((next: string) => {
      inputRef.current!.value = next;
    });

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const todoIndex = result.current.options.findIndex(
      (o) => o.value === "TODO",
    );

    act(() => result.current.onSelect(todoIndex));

    expect(setPrompt).toHaveBeenCalledWith("@TODO");
    expect(result.current.isOpen).toBe(false);
    expect(inputRef.current!.selectionStart).toBe("@TODO".length);
  });

  it("selects a MODIFIER and reopens its options", () => {
    const inputRef = createInputRef("?", 1);
    const setPrompt = vi.fn((next: string) => {
      inputRef.current!.value = next;
    });

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());
    act(() => result.current.onSelect(0));

    expect(setPrompt).toHaveBeenCalledWith("@");
    expect(result.current.options.every((o) => o.type === "STATUS")).toBe(true);
  });

  it("ArrowDown cycles selectedIndex", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const length = result.current.options.length;

    act(() => {
      result.current.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(1 % length);
  });

  it("Escape closes the helper", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.onKeyDown({
        key: "Escape",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("Enter selects the current option", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    act(() => {
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(setPrompt).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });
});
