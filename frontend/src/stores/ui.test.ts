import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui";
import { createDetailPane, createListPane, createRootPane } from "../lib/pane/factories";
import type { DetailPane, ListPane } from "../lib/pane/types";

const state = () => useUiStore.getState();

function firstPane(): ListPane {
  return useUiStore.getState().panes[0] as ListPane;
}

function seedRoot(renderedIds: string[] = [], selectedId: string | null = null) {
  const pane = createRootPane();
  pane.renderedIds = renderedIds;
  pane.selectedId = selectedId;
  useUiStore.setState({ mode: "normal", panes: [pane], activePaneId: pane.id });
  return pane;
}

beforeEach(() => {
  seedRoot();
});

describe("ui store: setRenderedIds", () => {
  it("stores the rendered ids", () => {
    state().setRenderedIds("root", ["a", "b", "c"]);

    expect(firstPane().renderedIds).toEqual(["a", "b", "c"]);
  });

  it("keeps the previous array when the ids did not change", () => {
    state().setRenderedIds("root", ["a", "b"]);
    const previous = firstPane().renderedIds;

    state().setRenderedIds("root", ["a", "b"]);

    expect(firstPane().renderedIds).toBe(previous);
  });

  it("keeps the selection when it survives the new list", () => {
    seedRoot(["a", "b"], "b");

    state().setRenderedIds("root", ["b", "c"]);

    expect(firstPane().selectedId).toBe("b");
  });

  it("falls back to the first id when the selected item drops out", () => {
    seedRoot(["a", "b"], "a");

    state().setRenderedIds("root", ["b", "c"]);

    expect(firstPane().selectedId).toBe("b");
  });

  it("clears the selection when the list becomes empty", () => {
    seedRoot(["a"], "a");

    state().setRenderedIds("root", []);

    expect(firstPane().selectedId).toBeNull();
  });
});

describe("ui store: moveDown", () => {
  it("selects the first item when nothing is selected", () => {
    seedRoot(["a", "b", "c"]);

    state().moveDown(1);

    expect(firstPane().selectedId).toBe("a");
  });

  it("moves by the given number of steps", () => {
    seedRoot(["a", "b", "c", "d"], "a");

    state().moveDown(2);

    expect(firstPane().selectedId).toBe("c");
  });

  it("stops at the last item instead of wrapping around", () => {
    seedRoot(["a", "b", "c"], "b");

    state().moveDown(5);

    expect(firstPane().selectedId).toBe("c");
  });

  it("counts from the top when the selected id is no longer rendered", () => {
    seedRoot(["a", "b", "c"], "gone");

    state().moveDown(2);

    expect(firstPane().selectedId).toBe("b");
  });

  it("does nothing on an empty list", () => {
    state().moveDown(1);

    expect(firstPane().selectedId).toBeNull();
  });
});

describe("ui store: moveUp", () => {
  it("selects the last item when nothing is selected", () => {
    seedRoot(["a", "b", "c"]);

    state().moveUp(1);

    expect(firstPane().selectedId).toBe("c");
  });

  it("moves by the given number of steps", () => {
    seedRoot(["a", "b", "c", "d"], "d");

    state().moveUp(2);

    expect(firstPane().selectedId).toBe("b");
  });

  it("stops at the first item instead of wrapping around", () => {
    seedRoot(["a", "b", "c"], "b");

    state().moveUp(5);

    expect(firstPane().selectedId).toBe("a");
  });

  it("counts from the bottom when the selected id is no longer rendered", () => {
    seedRoot(["a", "b", "c"], "gone");

    state().moveUp(2);

    expect(firstPane().selectedId).toBe("b");
  });

  it("does nothing on an empty list", () => {
    state().moveUp(1);

    expect(firstPane().selectedId).toBeNull();
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
    pane.selectedId = "a";
    useUiStore.setState({ panes: [pane], activePaneId: pane.id });

    state().escape();

    expect(state().mode).toBe("normal");
    expect(firstPane().prompt).toBe("");
    expect(firstPane().filter).toEqual({});
    expect(firstPane().selectedId).toBe("a");
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

    expect(firstPane().selectedId).toBeNull();
  });

  it("pops the detail pane in normal mode, without leaving a stale copy behind", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({ mode: "normal", panes: [root, detail], activePaneId: "d1" });

    state().escape();

    expect(state().panes).toEqual([root]);
    expect(state().activePaneId).toBe(root.id);
  });

  it("only leaves insert mode on the first escape, without popping the detail pane yet", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({ mode: "insert", panes: [root, detail], activePaneId: "d1" });

    state().escape();

    expect(state().mode).toBe("normal");
    expect(state().panes).toHaveLength(2);
    expect(state().activePaneId).toBe("d1");
  });

  it("does nothing when the detail pane is the only pane left", () => {
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({ mode: "normal", panes: [detail], activePaneId: "d1" });

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
    expect(firstPane().selectedId).toBe("b");
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
    useUiStore.setState({ mode: "normal", panes: [root, detail], activePaneId: "d1" });

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

describe("ui store: openDetail", () => {
  it("opens a detail pane after the active one and activates it", () => {
    seedRoot(["a"], "a");

    state().openDetail("item-1");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({ type: "detail", itemId: "item-1" });
    expect(state().activePaneId).toBe(state().panes[1].id);
  });

  it("only moves the focus when the child detail already shows the item", () => {
    const root = createRootPane();
    root.selectedId = "item-1";
    const detail = createDetailPane("d1", "item-1");
    useUiStore.setState({ panes: [root, detail], activePaneId: root.id });
    const before = state().panes;

    state().openDetail("item-1");

    expect(state().panes).toBe(before);
    expect(state().activePaneId).toBe("d1");
  });

  it("retargets the child detail instead of stacking a new pane", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "old");
    useUiStore.setState({ panes: [root, detail], activePaneId: root.id });

    state().openDetail("item-1");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({ id: "d1", itemId: "item-1" });
    expect(state().activePaneId).toBe("d1");
  });

  it("updates the item id when the active pane is already a detail", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", "old");
    useUiStore.setState({ panes: [root, detail], activePaneId: "d1" });

    state().openDetail("new");

    expect(state().panes).toHaveLength(2);
    expect(state().panes[1]).toMatchObject({ type: "detail", itemId: "new" });
    expect(state().activePaneId).toBe("d1");
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
    useUiStore.setState({ mode: "normal", panes: [detail], activePaneId: "d1" });
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
    useUiStore.setState({ mode: "normal", panes: [root, detail], activePaneId: root.id });

    state().selectField("d1", "status");

    expect(state().activePaneId).toBe("d1");
    expect((state().panes[1] as DetailPane).selectedField).toBe("status");
  });

  it("does nothing when the field is already selected", () => {
    const detail = { ...createDetailPane("d1", "item-1"), selectedField: "status" as const };
    useUiStore.setState({ mode: "normal", panes: [detail], activePaneId: "root" });

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
    useUiStore.setState({ mode: "normal", panes: [root, detail], activePaneId: root.id });

    state().selectPane("d1", "insert");

    expect(state().activePaneId).toBe("d1");
    expect(state().mode).toBe("insert");
  });

  it("does nothing when the pane does not exist", () => {
    const root = seedRoot();
    useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });

    state().selectPane("missing", "insert");

    expect(state().activePaneId).toBe(root.id);
    expect(state().mode).toBe("normal");
  });
});
