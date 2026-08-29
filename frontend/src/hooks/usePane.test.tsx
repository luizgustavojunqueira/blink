import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { usePane, useListPane } from "./usePane";
import { useUiStore } from "../stores/ui";
import { createDetailPane, createRootPane } from "../lib/pane/factories";

describe("usePane", () => {
  beforeEach(() => {
    const root = createRootPane();
    useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
  });

  it("returns the pane for the given id", () => {
    const { result } = renderHook(() => usePane("root"));

    expect(result.current.pane?.id).toBe("root");
    expect(result.current.isActive).toBe(true);
  });

  it("marks the pane inactive when it is not the active pane", () => {
    const root = createRootPane();
    const a = createRootPane();
    a.id = "a";
    useUiStore.setState({ panes: [root, a], activePaneId: "a" });

    const { result } = renderHook(() => usePane("root"));

    expect(result.current.isActive).toBe(false);
  });

  it("select wraps the store select scoped to the pane id", () => {
    const { result } = renderHook(() => usePane("root"));

    act(() => result.current.select("item-1"));

    expect(useUiStore.getState().activePaneId).toBe("root");
    expect(useUiStore.getState().panes[0]).toMatchObject({ type: "list", selectedId: "item-1" });
  });

  it("setRenderedIds wraps the store setRenderedIds scoped to the pane id", () => {
    const { result } = renderHook(() => usePane("root"));

    act(() => result.current.setRenderedIds(["a", "b", "c"]));

    expect(useUiStore.getState().panes[0]).toMatchObject({ renderedIds: ["a", "b", "c"] });
  });
});

describe("useListPane", () => {
  beforeEach(() => {
    const root = createRootPane();
    useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
  });

  it("returns the pane when it is a list pane", () => {
    const { result } = renderHook(() => useListPane("root"));

    expect(result.current.pane?.type).toBe("list");
  });

  it("narrows detail panes out", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", root.id, "item-1");
    useUiStore.setState({ panes: [root, detail], activePaneId: "d1" });

    const { result } = renderHook(() => useListPane("d1"));

    expect(result.current.pane).toBeUndefined();
  });
});
