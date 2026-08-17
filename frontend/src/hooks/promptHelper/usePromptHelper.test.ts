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
    expect(result.current.options.every((o) => o.kind === "MODIFIER")).toBe(
      true,
    );
    expect(result.current.selectedIndex).toBe(0);
  });

  it("does not open MODIFIER options for ? inside a command", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/theme ?", 8);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
  });

  it("closes the helper after backspacing / down to empty", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());
    expect(result.current.isOpen).toBe(true);

    inputRef.current!.value = "";
    inputRef.current!.setSelectionRange(0, 0);
    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toHaveLength(0);
  });

  it("closes the helper after backspacing ? down to empty", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("?", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());
    expect(result.current.isOpen).toBe(true);

    inputRef.current!.value = "";
    inputRef.current!.setSelectionRange(0, 0);
    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toHaveLength(0);
  });

  it("closes the helper once a modifier is followed by a space, regardless of how many", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());
    expect(result.current.isOpen).toBe(true);

    for (const spaces of ["@ ", "@  ", "@     "]) {
      inputRef.current!.value = spaces;
      inputRef.current!.setSelectionRange(spaces.length, spaces.length);
      act(() => result.current.update());
      expect(result.current.isOpen).toBe(false);
    }
  });

  it("opens COMMAND options when typing /", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options[0].kind).toBe("COMMAND");
  });

  it("filters COMMAND options case-insensitively", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/TH", 3);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.options.some((o) => o.name === "/theme")).toBe(true);
  });

  it("does not open COMMAND options for extra leading slashes", () => {
    const setPrompt = vi.fn();

    const doubleSlash = createInputRef("//", 2);
    const { result: doubleResult } = renderHook(() =>
      usePromptHelper(doubleSlash, setPrompt),
    );
    act(() => doubleResult.current.update());
    expect(doubleResult.current.isOpen).toBe(false);

    const tripleSlash = createInputRef("///", 3);
    const { result: tripleResult } = renderHook(() =>
      usePromptHelper(tripleSlash, setPrompt),
    );
    act(() => tripleResult.current.update());
    expect(tripleResult.current.isOpen).toBe(false);
  });

  it("filters STATUS options when typing @TO", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@TO", 3);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.every((o) => o.kind === "STATUS")).toBe(true);
    expect(result.current.options.some((o) => o.value === "TODO")).toBe(true);
  });

  it("filters PRIORITY options when typing !HI", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("!HI", 3);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.options.every((o) => o.kind === "PRIORITY")).toBe(
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

  it("opens COMMAND_ARG options when typing /theme <partial>", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/theme c", 8);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.every((o) => o.kind === "COMMAND_ARG")).toBe(
      true,
    );
    expect(result.current.options.some((o) => o.value === "catppuccin")).toBe(
      true,
    );
  });

  it("opens COMMAND_ARG options right after a single space with nothing typed yet", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/theme ", 7);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options).toHaveLength(3);
  });

  it("does not open COMMAND_ARG options when more than one space separates from the previous token", () => {
    const setPrompt = vi.fn();
    const value = "/theme gruv" + " ".repeat(10);
    const inputRef = createInputRef(value, value.length);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toHaveLength(0);
  });

  it("opens modifier options inside /filter", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/filter @", 9);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.every((o) => o.kind === "STATUS")).toBe(true);
  });

  it("opens the ? menu inside /filter", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("/filter ?", 9);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.some((o) => o.value === "$")).toBe(true);
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

  it("selects a COMMAND_ARG option by replacing the whole word, not prefixing it", () => {
    const inputRef = createInputRef("/theme c", 8);
    const setPrompt = vi.fn((next: string) => {
      inputRef.current!.value = next;
    });

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const catppuccinIndex = result.current.options.findIndex(
      (o) => o.value === "catppuccin",
    );

    act(() => result.current.onSelect(catppuccinIndex));

    expect(setPrompt).toHaveBeenCalledWith("/theme catppuccin");
  });

  it("selecting a COMMAND_ARG option replaces the whole argument, even with a stray space in the middle", () => {
    const inputRef = createInputRef("/theme gr u", 11);
    const setPrompt = vi.fn((next: string) => {
      inputRef.current!.value = next;
    });

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const gruvboxIndex = result.current.options.findIndex((o) => o.value === "gruvbox");
    expect(gruvboxIndex).toBeGreaterThanOrEqual(0);

    act(() => result.current.onSelect(gruvboxIndex));

    expect(setPrompt).toHaveBeenCalledWith("/theme gruvbox");
  });

  it("selecting mid-word replaces the entire word instead of splicing into it", () => {
    const inputRef = createInputRef("/theme catppuccin", 11);
    const setPrompt = vi.fn((next: string) => {
      inputRef.current!.value = next;
    });

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const catppuccinIndex = result.current.options.findIndex(
      (o) => o.value === "catppuccin",
    );

    act(() => result.current.onSelect(catppuccinIndex));

    expect(setPrompt).toHaveBeenCalledWith("/theme catppuccin");
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
    expect(result.current.options.every((o) => o.kind === "STATUS")).toBe(true);
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

  it("Tab cycles selectedIndex forward", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const length = result.current.options.length;

    act(() => {
      result.current.onKeyDown({
        key: "Tab",
        shiftKey: false,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(1 % length);
  });

  it("Shift+Tab cycles selectedIndex backward", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    const length = result.current.options.length;

    act(() => {
      result.current.onKeyDown({
        key: "Tab",
        shiftKey: true,
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(length - 1);
  });

  it("ArrowRight does not select an option, so cursor navigation is left untouched", () => {
    const setPrompt = vi.fn();
    const inputRef = createInputRef("@", 1);

    const { result } = renderHook(() => usePromptHelper(inputRef, setPrompt));

    act(() => result.current.update());

    let handled = true;
    act(() => {
      handled = result.current.onKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(handled).toBe(false);
    expect(setPrompt).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
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
