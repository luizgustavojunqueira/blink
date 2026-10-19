import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui";
import {
  createConfigPane,
  createDetailPane,
  createListPane,
  createRootPane,
} from "../lib/pane/factories";
import type { ConfigPane, DetailPane, ListPane } from "../lib/pane/types";
import { Group, Task, type ItemType } from "../types/backend";

const state = () => useUiStore.getState();

function firstPane(): ListPane {
  return useUiStore.getState().panes[0] as ListPane;
}

const allTasks = (ids: string[]): Record<string, ItemType> =>
  Object.fromEntries(ids.map((id) => [id, Task]));

function seedRoot(
  renderedGuids: string[] = [],
  selectedGuid: string | null = null,
  renderedTypes: Record<string, ItemType> = allTasks(renderedGuids),
) {
  const pane = createRootPane();
  pane.renderedGuids = renderedGuids;
  pane.renderedTypes = renderedTypes;
  pane.selectedGuid = selectedGuid;
  useUiStore.setState({ mode: "normal", panes: [pane], activePaneId: pane.id });
  return pane;
}

beforeEach(() => {
  seedRoot();
});

describe("ui store: setRendered", () => {
  it("stores the rendered ids", () => {
    state().setRendered("root", ["a", "b", "c"], allTasks(["a", "b", "c"]));

    expect(firstPane().renderedGuids).toEqual(["a", "b", "c"]);
  });

  it("stores the type of each rendered item", () => {
    state().setRendered("root", ["a", "b"], { a: Task, b: Group });

    expect(firstPane().renderedTypes).toEqual({ a: Task, b: Group });
  });

  it("updates the pane when only a type changed", () => {
    state().setRendered("root", ["a"], { a: Task });
    const previous = firstPane();

    state().setRendered("root", ["a"], { a: Group });

    expect(firstPane()).not.toBe(previous);
    expect(firstPane().renderedTypes).toEqual({ a: Group });
  });

  it("keeps the previous array when the ids did not change", () => {
    state().setRendered("root", ["a", "b"], allTasks(["a", "b"]));
    const previous = firstPane().renderedGuids;

    state().setRendered("root", ["a", "b"], allTasks(["a", "b"]));

    expect(firstPane().renderedGuids).toBe(previous);
  });

  it("keeps the selection when it survives the new list", () => {
    seedRoot(["a", "b"], "b");

    state().setRendered("root", ["b", "c"], allTasks(["b", "c"]));

    expect(firstPane().selectedGuid).toBe("b");
  });

  it("falls back to the first id when the selected item drops out", () => {
    seedRoot(["a", "b"], "a");

    state().setRendered("root", ["b", "c"], allTasks(["b", "c"]));

    expect(firstPane().selectedGuid).toBe("b");
  });

  it("clears the selection when the list becomes empty", () => {
    seedRoot(["a"], "a");

    state().setRendered("root", [], allTasks([]));

    expect(firstPane().selectedGuid).toBeNull();
  });
});

describe("ui store: child pane sync", () => {
  const seedWithChild = (child: ListPane | DetailPane, selectedGuid: string, activeId?: string) => {
    const root = createRootPane();
    root.renderedGuids = ["t1", "g1", "g2"];
    root.renderedTypes = { t1: Task, g1: Group, g2: Group };
    root.selectedGuid = selectedGuid;
    useUiStore.setState({
      mode: "normal",
      panes: [root, child],
      activePaneId: activeId ?? root.id,
    });
  };

  it("turns the child into a list when the selection moves onto a group", () => {
    seedWithChild(createDetailPane("child", "t1"), "t1");

    state().select("root", "g1");

    expect(state().panes[1]).toMatchObject({ id: "child", type: "list", parentGuid: "g1" });
  });

  it("turns the child into a detail when the selection leaves a group", () => {
    seedWithChild(createListPane("child", "g1"), "g1");

    state().select("root", "t1");

    expect(state().panes[1]).toMatchObject({ id: "child", type: "detail", itemGuid: "t1" });
  });

  it("retargets without rebuilding the child when the type stays the same", () => {
    seedWithChild(createListPane("child", "g1"), "g1");

    state().select("root", "g2");

    expect(state().panes[1]).toMatchObject({ id: "child", type: "list", parentGuid: "g2" });
  });

  it("drops the panes below the child when its type changes", () => {
    seedWithChild(createListPane("child", "g1"), "g1");
    useUiStore.setState({
      panes: [...state().panes, createDetailPane("grandchild", "inner")],
    });

    state().select("root", "t1");

    expect(state().panes.map((p) => p.id)).toEqual(["root", "child"]);
  });

  it("falls back to the last pane when the dropped one had the focus", () => {
    const root = createRootPane();
    root.renderedGuids = ["t1", "g1"];
    root.renderedTypes = { t1: Task, g1: Group };
    root.selectedGuid = "g1";
    useUiStore.setState({
      mode: "normal",
      panes: [root, createListPane("child", "g1"), createDetailPane("grandchild", "inner")],
      activePaneId: "grandchild",
    });

    state().setRendered("root", ["t1"], { t1: Task });

    expect(state().panes.map((p) => p.id)).toEqual(["root", "child"]);
    expect(state().activePaneId).toBe("child");
  });
});

describe("ui store: moveDown", () => {
  it("selects the first item when nothing is selected", () => {
    seedRoot(["a", "b", "c"]);

    state().moveDown(1);

    expect(firstPane().selectedGuid).toBe("a");
  });

  it("moves by the given number of steps", () => {
    seedRoot(["a", "b", "c", "d"], "a");

    state().moveDown(2);

    expect(firstPane().selectedGuid).toBe("c");
  });

  it("stops at the last item instead of wrapping around", () => {
    seedRoot(["a", "b", "c"], "b");

    state().moveDown(5);

    expect(firstPane().selectedGuid).toBe("c");
  });

  it("counts from the top when the selected id is no longer rendered", () => {
    seedRoot(["a", "b", "c"], "gone");

    state().moveDown(2);

    expect(firstPane().selectedGuid).toBe("b");
  });

  it("does nothing on an empty list", () => {
    state().moveDown(1);

    expect(firstPane().selectedGuid).toBeNull();
  });
});

describe("ui store: moveUp", () => {
  it("selects the last item when nothing is selected", () => {
    seedRoot(["a", "b", "c"]);

    state().moveUp(1);

    expect(firstPane().selectedGuid).toBe("c");
  });

  it("moves by the given number of steps", () => {
    seedRoot(["a", "b", "c", "d"], "d");

    state().moveUp(2);

    expect(firstPane().selectedGuid).toBe("b");
  });

  it("stops at the first item instead of wrapping around", () => {
    seedRoot(["a", "b", "c"], "b");

    state().moveUp(5);

    expect(firstPane().selectedGuid).toBe("a");
  });

  it("counts from the bottom when the selected id is no longer rendered", () => {
    seedRoot(["a", "b", "c"], "gone");

    state().moveUp(2);

    expect(firstPane().selectedGuid).toBe("b");
  });

  it("does nothing on an empty list", () => {
    state().moveUp(1);

    expect(firstPane().selectedGuid).toBeNull();
  });
});

describe("ui store: enterInsert", () => {
  it("switches to insert mode without touching the prompt", () => {
    seedRoot();
    useUiStore.setState((s) => ({
      panes: s.panes.map((p) => (p.id === s.activePaneId ? { ...p, prompt: "already typed" } : p)),
    }));

    state().enterInsert();

    expect(state().mode).toBe("insert");
    expect(firstPane().prompt).toBe("already typed");
  });

  it("appends the seed key to the prompt", () => {
    seedRoot();
    useUiStore.setState((s) => ({
      panes: s.panes.map((p) => (p.id === s.activePaneId ? { ...p, prompt: "todo " } : p)),
    }));

    state().enterInsert("#");

    expect(state().mode).toBe("insert");
    expect(firstPane().prompt).toBe("todo #");
  });
});

describe("ui store: escape", () => {
  it("leaves insert mode first, keeping prompt and filter", () => {
    const pane = seedRoot();
    pane.prompt = "typed";
    pane.filter = { title: "x" };
    useUiStore.setState({
      mode: "insert",
      panes: [pane],
      activePaneId: pane.id,
    });

    state().escape();

    expect(state().mode).toBe("normal");
    expect(firstPane().prompt).toBe("typed");
    expect(firstPane().filter).toEqual({ title: "x" });
  });

  it("clears the prompt and the filter in normal mode", () => {
    const pane = seedRoot();
    pane.prompt = "typed";
    pane.filter = { title: "x" };
    pane.selectedGuid = "a";
    useUiStore.setState({ panes: [pane], activePaneId: pane.id });

    state().escape();

    expect(state().mode).toBe("normal");
    expect(firstPane().prompt).toBe("");
    expect(firstPane().filter).toEqual({});
    expect(firstPane().selectedGuid).toBe("a");
  });

  it("clears a filter with an empty prompt", () => {
    const pane = seedRoot();
    pane.filter = { status: ["TODO"] };
    useUiStore.setState({ panes: [pane], activePaneId: pane.id });

    state().escape();

    expect(firstPane().filter).toEqual({});
  });

  it("deselects once there is nothing left to clear", () => {
    seedRoot([], "a");

    state().escape();

    expect(firstPane().selectedGuid).toBeNull();
  });

  it("deselects on a group pane too, since its parent scope is not a filter", () => {
    const child = createListPane("child", "g1");
    child.selectedGuid = "a";
    useUiStore.setState({ mode: "normal", panes: [createRootPane(), child], activePaneId: "child" });

    state().escape();

    const pane = state().panes[1] as ListPane;
    expect(pane.selectedGuid).toBeNull();
    expect(pane.filter).toMatchObject({ parent_id: "g1" });
  });

  it("pops the detail pane in normal mode, without leaving a stale copy behind", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({
      mode: "normal",
      panes: [root, detail],
      activePaneId: "d1",
    });

    state().escape();

    expect(state().panes).toEqual([root]);
    expect(state().activePaneId).toBe(root.id);
  });

  it("only leaves insert mode on the first escape, without popping the detail pane yet", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({
      mode: "insert",
      panes: [root, detail],
      activePaneId: "d1",
    });

    state().escape();

    expect(state().mode).toBe("normal");
    expect(state().panes).toHaveLength(2);
    expect(state().activePaneId).toBe("d1");
  });

  it("does nothing when the detail pane is the only pane left", () => {
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({
      mode: "normal",
      panes: [detail],
      activePaneId: "d1",
    });

    state().escape();

    expect(state().panes).toEqual([detail]);
    expect(state().activePaneId).toBe("d1");
  });
});

describe("ui store: select", () => {
  it("sets the selection and makes the pane active", () => {
    seedRoot(["a", "b"], "a");

    useUiStore.setState({ mode: "insert" });

    state().select("root", "b");

    expect(state().activePaneId).toBe("root");
    expect(state().mode).toBe("normal");
    expect(firstPane().selectedGuid).toBe("b");
  });

  it("does nothing when the selection is unchanged, leaving mode and pane untouched", () => {
    seedRoot(["a", "b"], "a");
    useUiStore.setState({ mode: "insert", activePaneId: "other" });
    const previous = firstPane();

    state().select("root", "a");

    expect(firstPane()).toBe(previous);
    expect(state().mode).toBe("insert");
    expect(state().activePaneId).toBe("other");
  });

  it("does nothing on a detail pane", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({
      mode: "normal",
      panes: [root, detail],
      activePaneId: "d1",
    });

    state().select("d1", "x");

    expect(state().panes[1].type).toBe("detail");
  });
});

describe("ui store: setMode", () => {
  it("switches between insert and normal", () => {
    state().setMode("insert");
    expect(state().mode).toBe("insert");

    state().setMode("normal");
    expect(state().mode).toBe("normal");
  });
});

describe("ui store: setFilter", () => {
  it("stores the filter on the active pane", () => {
    state().setFilter({ status: ["TODO"] });

    expect(firstPane().filter).toEqual({ status: ["TODO"] });
  });
});

describe("ui store: pushPane", () => {
  it("inserts the pane right after the active one and activates it", () => {
    const root = createRootPane();
    const a = createListPane("a", root.id);
    const b = createListPane("b", root.id);
    useUiStore.setState({ panes: [root, a, b], activePaneId: "a" });

    const pushed = createListPane("new", "a");
    state().pushPane(pushed);

    expect(state().panes.map((p) => p.id)).toEqual(["root", "a", "new"]);
    expect(state().activePaneId).toBe("new");
  });
});

describe("ui store: popPane", () => {
  it("removes the last pane and activates the one before it", () => {
    const root = createRootPane();
    const a = createListPane("a", root.id);
    useUiStore.setState({ panes: [root, a], activePaneId: "a" });

    state().popPane();

    expect(state().panes.map((p) => p.id)).toEqual(["root"]);
    expect(state().activePaneId).toBe("root");
  });

  it("does nothing when only one pane is left", () => {
    seedRoot();

    state().popPane();

    expect(state().panes).toHaveLength(1);
    expect(state().activePaneId).toBe("root");
  });
});

describe("ui store: openChildPane", () => {
  it("opens a detail pane after the active one and activates it", () => {
    seedRoot(["a"], "a");

    state().openChildPane("item-1", "detail");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({
      type: "detail",
      itemGuid: "item-1",
    });
    expect(state().activePaneId).toBe(state().panes[1].id);
  });

  it("only moves the focus when the child detail already shows the item", () => {
    const root = createRootPane();
    root.selectedGuid = "item-1";
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({ panes: [root, detail], activePaneId: root.id });
    const before = state().panes;

    state().openChildPane("item-1", "detail");

    expect(state().panes).toBe(before);
    expect(state().activePaneId).toBe("d1");
  });

  it("retargets the child detail instead of stacking a new pane", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "old");
    useUiStore.setState({ panes: [root, detail], activePaneId: root.id });

    state().openChildPane("item-1", "detail");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({ id: "d1", itemGuid: "item-1" });
    expect(state().activePaneId).toBe("d1");
  });

  it("opens a list pane scoped to the group and activates it", () => {
    seedRoot(["g1"], "g1", { g1: Group });

    state().openChildPane("g1", "list");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({
      type: "list",
      parentGuid: "g1",
      filter: { parent_id: "g1" },
    });
    expect(state().activePaneId).toBe(state().panes[1].id);
  });

  it("replaces the child detail when the same slot opens a group", () => {
    const root = createRootPane();
    root.renderedGuids = ["g1"];
    root.renderedTypes = { g1: Group };
    root.selectedGuid = "g1";
    useUiStore.setState({
      panes: [root, createDetailPane("d1", "old")],
      activePaneId: root.id,
    });

    state().openChildPane("g1", "list");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({ type: "list", parentGuid: "g1" });
  });
});

describe("ui store: moveRight", () => {
  it("activates the next pane among the trailing two", () => {
    const root = createRootPane();
    const a = createListPane("a", root.id);
    const b = createListPane("b", root.id);
    useUiStore.setState({ panes: [root, a, b], activePaneId: "a" });

    state().moveRight();

    expect(state().activePaneId).toBe("b");
  });

  it("does nothing when already on the rightmost pane", () => {
    const root = createRootPane();
    const a = createListPane("a", root.id);
    useUiStore.setState({ panes: [root, a], activePaneId: "a" });

    state().moveRight();

    expect(state().activePaneId).toBe("a");
    expect(state().panes).toHaveLength(2);
  });
});

describe("ui store: moveLeft", () => {
  it("activates the previous pane among the trailing two", () => {
    const root = createRootPane();
    const a = createListPane("a", root.id);
    const b = createListPane("b", root.id);
    useUiStore.setState({ panes: [root, a, b], activePaneId: "b" });

    state().moveLeft();

    expect(state().activePaneId).toBe("a");
  });

  it("does nothing when already on the earliest pane", () => {
    const root = createRootPane();
    const a = createListPane("a", root.id);
    useUiStore.setState({ panes: [root, a], activePaneId: "root" });

    state().moveLeft();

    expect(state().activePaneId).toBe("root");
    expect(state().panes).toHaveLength(2);
  });
});

describe("ui store: moveField", () => {
  function seedDetail(selectedField: DetailPane["selectedField"] = "title") {
    const detail = { ...createDetailPane("d1", "item-1"), selectedField };
    useUiStore.setState({
      mode: "normal",
      panes: [detail],
      activePaneId: "d1",
    });
    return () => useUiStore.getState().panes[0] as DetailPane;
  }

  it("moves to the next field", () => {
    const pane = seedDetail("title");

    state().moveField(1);

    expect(pane().selectedField).toBe("description");
  });

  it("moves to the previous field", () => {
    const pane = seedDetail("description");

    state().moveField(-1);

    expect(pane().selectedField).toBe("title");
  });

  it("stops at the last field instead of wrapping around", () => {
    const pane = seedDetail("priority");

    state().moveField(1);

    expect(pane().selectedField).toBe("priority");
  });

  it("stops at the first field instead of wrapping around", () => {
    const pane = seedDetail("title");

    state().moveField(-1);

    expect(pane().selectedField).toBe("title");
  });

  it("selects the first field when nothing is selected yet", () => {
    const pane = seedDetail(null);

    state().moveField(1);

    expect(pane().selectedField).toBe("title");
  });

  it("does nothing on a list pane", () => {
    seedRoot();

    state().moveField(1);

    expect(firstPane().type).toBe("list");
  });
});

describe("ui store: selectField", () => {
  it("selects the field and activates the pane", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({
      mode: "normal",
      panes: [root, detail],
      activePaneId: root.id,
    });

    state().selectField("d1", "status");

    expect(state().activePaneId).toBe("d1");
    expect((state().panes[1] as DetailPane).selectedField).toBe("status");
  });

  it("does nothing when the field is already selected", () => {
    const detail = {
      ...createDetailPane("d1", "item-1"),
      selectedField: "status" as const,
    };
    useUiStore.setState({
      mode: "normal",
      panes: [detail],
      activePaneId: "root",
    });

    state().selectField("d1", "status");

    expect(state().activePaneId).toBe("root");
  });

  it("does nothing on a list pane", () => {
    const root = seedRoot();
    useUiStore.setState({ panes: [root], activePaneId: root.id });

    state().selectField(root.id, "status");

    expect(firstPane().type).toBe("list");
  });
});

describe("ui store: selectPane", () => {
  it("activates the pane and sets the given mode", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({
      mode: "normal",
      panes: [root, detail],
      activePaneId: root.id,
    });

    state().selectPane("d1", "insert");

    expect(state().activePaneId).toBe("d1");
    expect(state().mode).toBe("insert");
  });

  it("does nothing when the pane does not exist", () => {
    const root = seedRoot();
    useUiStore.setState({
      mode: "normal",
      panes: [root],
      activePaneId: root.id,
    });

    state().selectPane("missing", "insert");

    expect(state().activePaneId).toBe(root.id);
    expect(state().mode).toBe("normal");
  });
});

describe("ui store: toggleMarked", () => {
  it("marks the given item", () => {
    seedRoot(["a", "b"], "a");

    state().toggleMarked("root", "a");

    expect([...firstPane().markedGuids]).toEqual(["a"]);
  });

  it("unmarks the item on the second toggle", () => {
    seedRoot(["a", "b"], "a");

    state().toggleMarked("root", "a");
    state().toggleMarked("root", "a");

    expect(firstPane().markedGuids.size).toBe(0);
  });

  it("keeps the other marks when toggling one off", () => {
    seedRoot(["a", "b"], "a");

    state().toggleMarked("root", "a");
    state().toggleMarked("root", "b");
    state().toggleMarked("root", "a");

    expect([...firstPane().markedGuids]).toEqual(["b"]);
  });

  it("replaces the set instead of mutating the one already published", () => {
    seedRoot(["a", "b"], "a");
    state().toggleMarked("root", "a");
    const before = firstPane().markedGuids;

    state().toggleMarked("root", "b");

    expect(firstPane().markedGuids).not.toBe(before);
    expect([...before]).toEqual(["a"]);
  });

  it("stays in normal mode, so every other binding keeps resolving", () => {
    seedRoot(["a"], "a");

    state().toggleMarked("root", "a");

    expect(state().mode).toBe("normal");
  });

  it("does nothing on a detail pane", () => {
    const detail = createDetailPane("detail-1", "a");
    useUiStore.setState({ panes: [detail], activePaneId: detail.id });
    const panes = state().panes;

    state().toggleMarked("detail-1", "a");

    expect(state().panes).toBe(panes);
  });
});

describe("ui store: marks on focus change", () => {
  const seedMarked = () => {
    const root = createRootPane();
    root.markedGuids = new Set(["a"]);
    const child = createListPane("child", "g1");
    useUiStore.setState({ mode: "normal", panes: [root, child], activePaneId: root.id });
  };

  it("clears the marks of the pane that lost the focus", () => {
    seedMarked();

    state().moveRight();

    expect(state().activePaneId).toBe("child");
    expect(firstPane().markedGuids.size).toBe(0);
  });

  it("keeps the marks of the pane that gained the focus", () => {
    seedMarked();

    state().toggleMarked("child", "x");

    expect(firstPane().markedGuids.size).toBe(0);
    expect([...(state().panes[1] as ListPane).markedGuids]).toEqual(["x"]);
  });
});

describe("ui store: visual mode", () => {
  it("enters and navigates via keyboard or mouse without altering markedGuids", () => {
    seedRoot(["a", "b", "c", "d"], "a");

    state().toggleVisual("a");
    expect(state().mode).toBe("visual");
    expect(firstPane().anchorGuid).toBe("a");

    state().moveDown();
    state().select("root", "c");
    expect(state().mode).toBe("visual");
    expect(firstPane().selectedGuid).toBe("c");
    expect(firstPane().markedGuids.size).toBe(0);
  });

  it("commits union into markedGuids on toggleVisual or escape", () => {
    seedRoot(["a", "b", "c", "d"], "b");
    firstPane().markedGuids = new Set(["d"]);

    // Forward toggleVisual exit
    state().toggleVisual("b");
    state().moveDown();
    state().toggleVisual("c");
    expect(state().mode).toBe("normal");
    expect(firstPane().anchorGuid).toBeNull();
    expect([...firstPane().markedGuids].sort()).toEqual(["b", "c", "d"]);

    // Backward escape exit
    state().moveDown(); // to d
    state().toggleVisual("d");
    state().moveUp(2); // to b
    state().escape();
    expect(state().mode).toBe("normal");
    expect(firstPane().anchorGuid).toBeNull();
    expect([...firstPane().markedGuids].sort()).toEqual(["b", "c", "d"]);
  });
});

describe("ui store: setFieldState", () => {
  beforeEach(() => {
    useUiStore.setState({ fieldStates: {} });
  });

  it("records a saving state for a field", () => {
    state().setFieldState("item-1:status", { status: "saving" });

    expect(state().fieldStates["item-1:status"]).toEqual({ status: "saving" });
  });

  it("replaces the state with an error", () => {
    state().setFieldState("item-1:status", { status: "saving" });
    state().setFieldState("item-1:status", { status: "error", message: "boom" });

    expect(state().fieldStates["item-1:status"]).toEqual({ status: "error", message: "boom" });
  });

  it("keeps other fields when one is set or cleared", () => {
    state().setFieldState("item-1:status", { status: "saving" });
    state().setFieldState("item-1:title", { status: "saving" });
    state().setFieldState("item-1:status", null);

    expect(Object.keys(state().fieldStates)).toEqual(["item-1:title"]);
  });

  it("leaves the state untouched when clearing a field that is not set", () => {
    const before = state().fieldStates;

    state().setFieldState("item-1:status", null);

    expect(state().fieldStates).toBe(before);
  });
});

describe("ui store: config pane", () => {
  const config = () => state().panes.find((p) => p.type === "config") as ConfigPane | undefined;

  it("opens next to the active pane with the given row selected", () => {
    seedRoot(["a"], "a");

    state().openConfig("theme:nord");

    expect(state().panes.map((p) => p.type)).toEqual(["list", "config"]);
    expect(state().activePaneId).toBe(config()?.id);
    expect(config()?.selectedRow).toBe("theme:nord");
  });

  it("replaces whatever was open after the active pane", () => {
    seedRoot(["a"], "a");
    state().openChildPane("a", "detail");
    state().selectPane("root", "normal");

    state().openConfig();

    expect(state().panes.map((p) => p.type)).toEqual(["list", "config"]);
  });

  it("focuses the open config pane instead of opening another", () => {
    state().openConfig("theme:nord");
    const id = config()?.id;
    state().selectPane("root", "normal");

    state().openConfig("theme:gruvbox");

    expect(state().panes.filter((p) => p.type === "config")).toHaveLength(1);
    expect(state().activePaneId).toBe(id);
    expect(config()?.selectedRow).toBe("theme:nord");
  });

  it("stays open when the selection of the list behind it moves", () => {
    seedRoot(["a", "b"], "a");
    state().openConfig();
    state().selectPane("root", "normal");

    state().moveDown(1);

    expect(state().panes.map((p) => p.type)).toEqual(["list", "config"]);
  });

  it("selects a row and focuses the pane", () => {
    const pane = createConfigPane("config");
    useUiStore.setState({ panes: [firstPane(), pane], activePaneId: "root" });

    state().selectRow("config", "key:list:down");

    expect(config()?.selectedRow).toBe("key:list:down");
    expect(state().activePaneId).toBe("config");
  });

  it("closes on escape from normal mode, after leaving insert first", () => {
    state().openConfig();
    state().enterInsert();

    state().escape();
    expect(state().mode).toBe("normal");
    expect(config()).toBeDefined();

    state().escape();
    expect(config()).toBeUndefined();
    expect(state().activePaneId).toBe("root");
  });
});
