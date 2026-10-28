import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ROW_IN_RANGE, ROW_MARKED, ROW_SELECTED, rowState, useRowState } from "./useRowState";
import { useUiStore } from "../stores/ui";
import { createRootPane } from "../lib/pane/factories";

const state = () => useUiStore.getState();
const GUIDS = ["a", "b", "c", "d", "e", "f"];

beforeEach(() => {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id, showHint: true });
  state().setRendered(root.id, GUIDS, Object.fromEntries(GUIDS.map((g) => [g, "TASK"])));
  state().select(root.id, "a");
  delete document.documentElement.dataset.bulk;
});

const renderRows = () => {
  const renders: Record<string, number> = Object.fromEntries(GUIDS.map((g) => [g, 0]));
  const hooks = GUIDS.map((g) =>
    renderHook(() => {
      renders[g]++;
      return useRowState(state().activePaneId, g);
    }),
  );
  const reset = () => GUIDS.forEach((g) => (renders[g] = 0));
  const rendered = () => GUIDS.filter((g) => renders[g] > 0);
  const value = (g: string) => hooks[GUIDS.indexOf(g)].result.current;
  return { reset, rendered, value, unmountAll: () => hooks.forEach((h) => h.unmount()) };
};

describe("rowState", () => {
  it("flags the selected, marked and in-range rows", () => {
    const paneId = state().activePaneId;
    act(() => state().toggleMarked(paneId, "e"));
    act(() => state().select(paneId, "b"));
    act(() => state().toggleVisual("b"));
    act(() => state().moveDown(2));

    expect(rowState(state(), paneId, "a")).toBe(0);
    expect(rowState(state(), paneId, "b")).toBe(ROW_IN_RANGE);
    expect(rowState(state(), paneId, "c")).toBe(ROW_IN_RANGE);
    expect(rowState(state(), paneId, "d")).toBe(ROW_SELECTED | ROW_IN_RANGE);
    expect(rowState(state(), paneId, "e")).toBe(ROW_MARKED);
  });

  it("is zero for a pane that does not exist", () => {
    expect(rowState(state(), "missing", "a")).toBe(0);
  });
});

describe("useRowState", () => {
  it("re-renders only the rows the cursor leaves and enters", () => {
    const rows = renderRows();
    rows.reset();

    act(() => state().moveDown(1));

    expect(rows.rendered()).toEqual(["a", "b"]);
    expect(rows.value("a")).toBe(0);
    expect(rows.value("b")).toBe(ROW_SELECTED);
    rows.unmountAll();
  });

  it("re-renders only the toggled row when marking", () => {
    const rows = renderRows();
    rows.reset();

    act(() => state().toggleMarked(state().activePaneId, "d"));

    expect(rows.rendered()).toEqual(["d"]);
    expect(rows.value("d")).toBe(ROW_MARKED);
    rows.unmountAll();
  });

  it("re-renders only the rows entering or leaving the visual range", () => {
    const rows = renderRows();
    act(() => state().toggleVisual("a"));
    act(() => state().moveDown(2));
    rows.reset();

    act(() => state().moveDown(1));
    expect(rows.rendered()).toEqual(["c", "d"]);
    expect(rows.value("d")).toBe(ROW_SELECTED | ROW_IN_RANGE);

    rows.reset();
    act(() => state().moveUp(2));
    expect(rows.rendered()).toEqual(["b", "c", "d"]);
    expect(rows.value("b")).toBe(ROW_SELECTED | ROW_IN_RANGE);
    expect(rows.value("c")).toBe(0);
    expect(rows.value("d")).toBe(0);
    rows.unmountAll();
  });

  it("updates every row of the range when visual mode is committed", () => {
    const rows = renderRows();
    act(() => state().toggleVisual("a"));
    act(() => state().moveDown(2));
    rows.reset();

    act(() => state().toggleVisual("a"));

    expect(rows.rendered()).toEqual(["a", "b", "c"]);
    expect(["a", "b", "c"].map(rows.value)).toEqual([ROW_MARKED, ROW_MARKED, ROW_SELECTED | ROW_MARKED]);
    rows.unmountAll();
  });

  it("stops listening once every row unmounts", () => {
    const rows = renderRows();
    rows.unmountAll();
    rows.reset();

    act(() => state().moveDown(1));

    expect(rows.rendered()).toEqual([]);
  });

  it("suppresses row transitions only when many rows change at once", () => {
    const paneId = state().activePaneId;
    const many = Array.from({ length: 60 }, (_, i) => `g${i}`);
    act(() => state().setRendered(paneId, many, Object.fromEntries(many.map((g) => [g, "TASK"]))));
    act(() => state().select(paneId, "g0"));
    const hooks = many.map((g) => renderHook(() => useRowState(paneId, g)));

    act(() => state().moveDown(1));
    expect(document.documentElement.dataset.bulk).toBeUndefined();

    act(() => state().toggleVisual("g1"));
    act(() => state().moveDown(58));
    expect(document.documentElement.dataset.bulk).toBe("");

    hooks.forEach((h) => h.unmount());
  });
});
