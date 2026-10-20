import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "../stores/ui";
import { createListPane } from "./pane/factories";
import { removeSelection } from "./removeSelection";
import type { ListPane } from "./pane/types";
import type { AppContext } from "./types";

function setup(overrides: Partial<ListPane>) {
  const pane: ListPane = {
    ...createListPane("p1", null),
    renderedGuids: ["a", "b", "c"],
    ...overrides,
  };
  useUiStore.setState({ panes: [pane], activePaneId: pane.id });
  const remove = vi.fn().mockResolvedValue(undefined);
  const app = { ui: useUiStore.getState(), items: { remove } } as unknown as AppContext;
  const current = () => useUiStore.getState().panes[0] as ListPane;
  return { pane, app, remove, current };
}

describe("removeSelection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the selected item and moves to the next one", async () => {
    const { pane, app, remove, current } = setup({ selectedGuid: "b" });

    await removeSelection(app, pane);

    expect(remove).toHaveBeenCalledWith(["b"]);
    expect(current().selectedGuid).toBe("c");
  });

  it("falls back to the previous item when the last one goes", async () => {
    const { pane, app, current } = setup({ selectedGuid: "c" });

    await removeSelection(app, pane);

    expect(current().selectedGuid).toBe("b");
  });

  it("deletes the marked items and clears the marks", async () => {
    const { pane, app, remove, current } = setup({
      selectedGuid: "a",
      markedGuids: new Set(["a", "b"]),
    });

    await removeSelection(app, pane);

    expect(remove).toHaveBeenCalledWith(["a", "b"]);
    expect(current().markedGuids.size).toBe(0);
    expect(current().selectedGuid).toBe("c");
  });

  it("asks for a target when nothing is selected", async () => {
    const { pane, app, remove } = setup({ selectedGuid: null });

    expect(await removeSelection(app, pane)).toBe("Select or mark an item");
    expect(remove).not.toHaveBeenCalled();
  });

  it("returns the error when the server refuses", async () => {
    const { pane, app, remove } = setup({ selectedGuid: "a" });
    remove.mockRejectedValue(new Error("boom"));

    expect(await removeSelection(app, pane)).toBe("boom");
  });

  it("points the child pane at the newly selected item", async () => {
    const { pane, app } = setup({
      selectedGuid: "a",
      renderedTypes: { a: "GROUP", b: "GROUP", c: "TASK" },
    });
    const child = { ...createListPane("p2", "a"), renderedGuids: ["x"] };
    useUiStore.setState({ panes: [pane, child] });

    await removeSelection(app, pane);

    const panes = useUiStore.getState().panes;
    expect(panes).toHaveLength(2);
    expect(panes[1].type === "list" && panes[1].parentGuid).toBe("b");
  });

  it("keeps the selection when only another item is marked", async () => {
    const { pane, app, current } = setup({ selectedGuid: "a", markedGuids: new Set(["b"]) });

    await removeSelection(app, pane);

    expect(current().selectedGuid).toBe("a");
  });

  it("goes back to the parent pane when the last item is deleted", async () => {
    const root = { ...createListPane("p0", null), renderedGuids: ["g"], selectedGuid: "g" };
    const { pane, app } = setup({ parentGuid: "g", renderedGuids: ["a"], selectedGuid: "a" });
    useUiStore.setState({ panes: [root, pane], activePaneId: pane.id });

    await removeSelection(app, pane);

    const state = useUiStore.getState();
    expect(state.panes.map((p) => p.id)).toEqual(["p0"]);
    expect(state.activePaneId).toBe("p0");
  });

  it("stays on the root pane when it empties", async () => {
    const { pane, app, current } = setup({ renderedGuids: ["a"], selectedGuid: "a" });

    await removeSelection(app, pane);

    expect(useUiStore.getState().panes).toHaveLength(1);
    expect(current().selectedGuid).toBeNull();
  });
});
