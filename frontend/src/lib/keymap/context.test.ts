import { describe, expect, it } from "vitest";
import { queryContext } from "./context";
import { createDetailPane, createListPane, createRootPane } from "../pane/factories";
import { useUiStore } from "../../stores/ui";
import { Group, Task } from "../../types/backend";

const ui = () => useUiStore.getState();

describe("queryContext", () => {
  it("reads the selected item's type from the pane itself", () => {
    const pane = createRootPane();
    pane.renderedIds = ["t1", "g1"];
    pane.renderedTypes = { t1: Task, g1: Group };
    pane.selectedId = "g1";

    expect(queryContext(ui(), pane).itemType).toBe(Group);
  });

  it("has no type while nothing is selected", () => {
    expect(queryContext(ui(), createListPane("child", "g1")).itemType).toBeUndefined();
  });

  it("has no type on a detail pane", () => {
    expect(queryContext(ui(), createDetailPane("d1", "item-1")).itemType).toBeUndefined();
  });

  it("has no type when the selection is not among the rendered items", () => {
    const pane = createRootPane();
    pane.renderedIds = ["t1"];
    pane.renderedTypes = { t1: Task };
    pane.selectedId = "gone";

    expect(queryContext(ui(), pane).itemType).toBeUndefined();
  });
});
