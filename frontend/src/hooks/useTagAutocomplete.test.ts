import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTagAutocomplete } from "./useTagAutocomplete";
import { getModifier } from "../lib/modifiers/registry";
import { toPromptOption } from "../lib/promptOptions";

vi.mock("./useItems", () => ({
  useTags: vi.fn(() => ({ data: [] })),
}));

vi.mock("../lib/modifiers/registry", () => ({
  getModifier: vi.fn(),
}));

function createInputRef(value: string, cursor: number = value.length) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setSelectionRange(cursor, cursor);
  return { current: input };
}

function stubTagOptions(names: string[]) {
  vi.mocked(getModifier).mockReturnValue({
    id: "#",
    displayName: "#",
    description: "Filter by tag",
    getOptions: (rawArgs: string) =>
      names
        .filter((n) => n.startsWith(rawArgs.toLowerCase()))
        .map((n) => toPromptOption("TAG" as never, { name: n, description: "", value: n })),
  });
}

describe("useTagAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  it("does not open suggestions when the current word has no # prefix", () => {
    stubTagOptions(["work", "urgent"]);
    const setValue = vi.fn();
    const inputRef = createInputRef("work", 4);

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
    expect(getModifier).not.toHaveBeenCalled();
  });

  it("queries the tag modifier with the text typed after #", () => {
    stubTagOptions(["work", "urgent"]);
    const setValue = vi.fn();
    const inputRef = createInputRef("#wo", 3);

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

    act(() => result.current.update());

    expect(getModifier).toHaveBeenCalledWith("#");
    expect(result.current.isOpen).toBe(true);
    expect(result.current.options.map((o) => o.value)).toEqual(["work"]);
  });

  it("scopes suggestions to the tag under the cursor when several are typed", () => {
    stubTagOptions(["work", "urgent"]);
    const setValue = vi.fn();
    const inputRef = createInputRef("#work #ur", 9);

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

    act(() => result.current.update());

    expect(result.current.options.map((o) => o.value)).toEqual(["urgent"]);
  });

  it("selecting an option replaces only the current tag and appends a trailing space", () => {
    stubTagOptions(["urgent"]);
    const inputRef = createInputRef("#work #ur", 9);
    const setValue = vi.fn((next: string) => {
      inputRef.current!.value = next;
    });

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

    act(() => result.current.update());
    act(() => result.current.onSelect(0));

    expect(setValue).toHaveBeenCalledWith("#work #urgent ");
    expect(result.current.isOpen).toBe(false);
    expect(inputRef.current!.selectionStart).toBe("#work #urgent ".length);
  });

  it("Escape closes the suggestions", () => {
    stubTagOptions(["work"]);
    const setValue = vi.fn();
    const inputRef = createInputRef("#w", 2);

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

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

  it("ArrowDown cycles selectedIndex", () => {
    stubTagOptions(["work", "urgent"]);
    const setValue = vi.fn();
    const inputRef = createInputRef("#", 1);

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

    act(() => result.current.update());
    act(() => {
      result.current.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it("stays closed once the endpoint returns no matches, as it does today", () => {
    stubTagOptions([]);
    const setValue = vi.fn();
    const inputRef = createInputRef("#anything", 9);

    const { result } = renderHook(() => useTagAutocomplete(inputRef, setValue));

    act(() => result.current.update());

    expect(result.current.isOpen).toBe(false);
  });
});
