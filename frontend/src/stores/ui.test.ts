import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui";

const state = () => useUiStore.getState();

beforeEach(() => {
  useUiStore.setState({
    mode: "normal",
    prompt: "",
    filter: {},
    selectedId: null,
    renderedIds: [],
  });
});

describe("ui store: setRenderedIds", () => {
  it("stores the rendered ids", () => {
    state().setRenderedIds(["a", "b", "c"]);

    expect(state().renderedIds).toEqual(["a", "b", "c"]);
  });

  it("keeps the previous array when the ids did not change", () => {
    state().setRenderedIds(["a", "b"]);
    const previous = state().renderedIds;

    state().setRenderedIds(["a", "b"]);

    expect(state().renderedIds).toBe(previous);
  });

  it("keeps the selection when it survives the new list", () => {
    useUiStore.setState({ renderedIds: ["a", "b"], selectedId: "b" });

    state().setRenderedIds(["b", "c"]);

    expect(state().selectedId).toBe("b");
  });

  it("falls back to the first id when the selected item drops out", () => {
    useUiStore.setState({ renderedIds: ["a", "b"], selectedId: "a" });

    state().setRenderedIds(["b", "c"]);

    expect(state().selectedId).toBe("b");
  });

  it("clears the selection when the list becomes empty", () => {
    useUiStore.setState({ renderedIds: ["a"], selectedId: "a" });

    state().setRenderedIds([]);

    expect(state().selectedId).toBeNull();
  });
});

describe("ui store: moveDown", () => {
  it("selects the first item when nothing is selected", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c"] });

    state().moveDown(1);

    expect(state().selectedId).toBe("a");
  });

  it("moves by the given number of steps", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c", "d"], selectedId: "a" });

    state().moveDown(2);

    expect(state().selectedId).toBe("c");
  });

  it("stops at the last item instead of wrapping around", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c"], selectedId: "b" });

    state().moveDown(5);

    expect(state().selectedId).toBe("c");
  });

  it("counts from the top when the selected id is no longer rendered", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c"], selectedId: "gone" });

    state().moveDown(2);

    expect(state().selectedId).toBe("b");
  });

  it("does nothing on an empty list", () => {
    state().moveDown(1);

    expect(state().selectedId).toBeNull();
  });
});

describe("ui store: moveUp", () => {
  it("selects the last item when nothing is selected", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c"] });

    state().moveUp(1);

    expect(state().selectedId).toBe("c");
  });

  it("moves by the given number of steps", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c", "d"], selectedId: "d" });

    state().moveUp(2);

    expect(state().selectedId).toBe("b");
  });

  it("stops at the first item instead of wrapping around", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c"], selectedId: "b" });

    state().moveUp(5);

    expect(state().selectedId).toBe("a");
  });

  it("counts from the bottom when the selected id is no longer rendered", () => {
    useUiStore.setState({ renderedIds: ["a", "b", "c"], selectedId: "gone" });

    state().moveUp(2);

    expect(state().selectedId).toBe("b");
  });

  it("does nothing on an empty list", () => {
    state().moveUp(1);

    expect(state().selectedId).toBeNull();
  });
});

describe("ui store: enterInsert", () => {
  it("switches to insert mode without touching the prompt", () => {
    useUiStore.setState({ prompt: "already typed" });

    state().enterInsert();

    expect(state().mode).toBe("insert");
    expect(state().prompt).toBe("already typed");
  });

  it("appends the seed key to the prompt", () => {
    useUiStore.setState({ prompt: "todo " });

    state().enterInsert("#");

    expect(state().mode).toBe("insert");
    expect(state().prompt).toBe("todo #");
  });
});

describe("ui store: escape", () => {
  it("leaves insert mode first, keeping prompt and filter", () => {
    useUiStore.setState({ mode: "insert", prompt: "typed", filter: { title: "x" } });

    state().escape();

    expect(state().mode).toBe("normal");
    expect(state().prompt).toBe("typed");
    expect(state().filter).toEqual({ title: "x" });
  });

  it("clears the prompt and the filter in normal mode", () => {
    useUiStore.setState({ prompt: "typed", filter: { title: "x" }, selectedId: "a" });

    state().escape();

    expect(state().prompt).toBe("");
    expect(state().filter).toEqual({});
    expect(state().selectedId).toBe("a");
  });

  it("clears a filter with an empty prompt", () => {
    useUiStore.setState({ prompt: "", filter: { status: ["TODO"] } });

    state().escape();

    expect(state().filter).toEqual({});
  });

  it("deselects once there is nothing left to clear", () => {
    useUiStore.setState({ selectedId: "a" });

    state().escape();

    expect(state().selectedId).toBeNull();
  });
});
