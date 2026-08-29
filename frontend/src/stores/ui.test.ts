import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui";
import { createDetailPane, createListPane, createRootPane } from "../lib/pane/factories";
import type { ListPane } from "../lib/pane/types";

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
});

describe("ui store: select", () => {
  it("sets the selection and makes the pane active", () => {
    seedRoot(["a", "b"], "a");

    state().select("root", "b");

    expect(state().activePaneId).toBe("root");
    expect(firstPane().selectedId).toBe("b");
  });

  it("does nothing when the selection is unchanged", () => {
    const pane = seedRoot(["a", "b"], "a");
    pane.renderedIds = ["a", "b"];

    state().select("root", "a");

    expect(firstPane().selectedId).toBe("a");
  });

  it("does nothing on a detail pane", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", root.id, "item-1");
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

  it("updates the item id when the active pane is already a detail", () => {
    const root = createRootPane();
    const detail = createDetailPane("d1", root.id, "old");
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
