import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  paneEditing,
  paneIsActive,
  useCachedSelector,
  usePaneValue,
  useVisiblePanes,
  type PaneSelector,
} from "./usePane";
import { useUiStore, type UiState } from "../stores/ui";
import { createDetailPane, createListPane, createRootPane } from "../lib/pane/factories";
import type { ListPane } from "../lib/pane/types";

const state = () => useUiStore.getState();

const selectPrompt: PaneSelector<string> = (pane) => (pane?.type === "list" ? pane.prompt : "");

beforeEach(() => {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id, showHint: true });
});

describe("usePaneValue", () => {
  it("reads the value off the pane with that id", () => {
    const { result } = renderHook(() => usePaneValue("root", selectPrompt));

    expect(result.current).toBe("");

    act(() => state().setPrompt("blink"));

    expect(result.current).toBe("blink");
  });

  it("falls back to the selector's default when the pane is gone", () => {
    const { result } = renderHook(() => usePaneValue("missing", selectPrompt));

    expect(result.current).toBe("");
  });

  it("ignores changes to other panes", () => {
    const other = createListPane("other", null);
    useUiStore.setState({ panes: [state().panes[0], other] });

    let renders = 0;
    renderHook(() => {
      renders++;
      return usePaneValue("root", selectPrompt);
    });
    const before = renders;

    act(() => state().select("other", "item-1"));

    expect(renders).toBe(before);
  });

  it("does not re-render when the selected value stays equal", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return usePaneValue("root", selectPrompt);
    });
    const before = renders;

    act(() => state().setRendered("root", ["a", "b"], {}));

    expect(renders).toBe(before);
  });
});

describe("paneIsActive / paneEditing", () => {
  it("tracks which pane holds the focus", () => {
    const other = createListPane("other", null);
    useUiStore.setState({ panes: [state().panes[0], other] });

    const { result } = renderHook(() => usePaneValue("root", paneIsActive));

    expect(result.current).toBe(true);

    act(() => state().selectPane("other", "normal"));

    expect(result.current).toBe(false);
  });

  it("is only editing when the pane is active and the mode is insert", () => {
    const { result } = renderHook(() => usePaneValue("root", paneEditing));

    expect(result.current).toBe(false);

    act(() => state().setMode("insert"));

    expect(result.current).toBe(true);
  });
});

describe("useCachedSelector", () => {
  const selectIds = (s: UiState) => s.panes.map((p) => p.id);
  const sameIds = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id, i) => id === b[i]);

  it("keeps the previous reference while the value compares equal", () => {
    const { result } = renderHook(() => useCachedSelector(selectIds, sameIds, []));
    const first = result.current;

    act(() => state().setPrompt("blink"));

    expect(result.current).toBe(first);
  });

  it("hands out a new reference once the value actually changes", () => {
    const { result } = renderHook(() => useCachedSelector(selectIds, sameIds, []));
    const first = result.current;

    act(() => state().pushPane(createDetailPane("d1", "item-1")));

    expect(result.current).not.toBe(first);
    expect(result.current).toEqual(["root", "d1"]);
  });
});

describe("useVisiblePanes", () => {
  it("returns the last panes of the stack as id and type", () => {
    act(() => state().pushPane(createDetailPane("d1", "item-1")));

    const { result } = renderHook(() => useVisiblePanes(2));

    expect(result.current).toEqual([
      { id: "root", type: "list" },
      { id: "d1", type: "detail" },
    ]);
  });

  it("holds its reference when the panes change without entering or leaving the window", () => {
    const { result } = renderHook(() => useVisiblePanes(2));
    const first = result.current;

    act(() => state().setPrompt("blink"));

    expect((state().panes[0] as ListPane).prompt).toBe("blink");
    expect(result.current).toBe(first);
  });
});
