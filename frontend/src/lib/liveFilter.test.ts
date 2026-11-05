import { beforeEach, describe, expect, it } from "vitest";
import { applyLiveFilter, liveFilterArgs } from "./liveFilter";
import { useUiStore } from "../stores/ui";
import { createListPane, createRootPane } from "./pane/factories";
import type { ListPane } from "./pane/types";

const state = () => useUiStore.getState();
const listPane = (id: string) => state().panes.find((p) => p.id === id) as ListPane;

describe("liveFilterArgs()", () => {
  it("uses plain text as the filter", () => {
    expect(liveFilterArgs("milk !high", 4)).toBe("milk !high");
  });

  it("reads the arguments of an explicit :filter", () => {
    expect(liveFilterArgs(":filter milk", 12)).toBe("milk");
    expect(liveFilterArgs(":FILTER", 7)).toBe("");
  });

  it("ignores other commands and half-typed command names", () => {
    expect(liveFilterArgs(":edit @done", 11)).toBeNull();
    expect(liveFilterArgs(":", 1)).toBeNull();
    expect(liveFilterArgs(":fil", 4)).toBeNull();
    expect(liveFilterArgs(":week #work", 11)).toBeNull();
  });

  it("drops the modifier being typed at the cursor", () => {
    expect(liveFilterArgs("milk #wo", 8)).toBe("milk");
    expect(liveFilterArgs("milk ^to", 8)).toBe("milk");
    expect(liveFilterArgs("#wo milk", 2)).toBe("milk");
  });

  it("keeps a modifier once the cursor has moved past it", () => {
    expect(liveFilterArgs("milk #work ", 11)).toBe("milk #work");
    expect(liveFilterArgs("#work milk", 10)).toBe("#work milk");
  });

  it("keeps the word being typed when it is plain text", () => {
    expect(liveFilterArgs("#work mi", 8)).toBe("#work mi");
  });

  it("keeps every token when no cursor is given", () => {
    expect(liveFilterArgs("milk #work")).toBe("milk #work");
  });

  it("treats line breaks as spaces", () => {
    expect(liveFilterArgs("milk\n#work", 10)).toBe("milk");
  });
});

describe("applyLiveFilter()", () => {
  beforeEach(() => {
    const root = createRootPane();
    const group = createListPane("group", "g1");
    useUiStore.setState({ mode: "insert", panes: [root, group], activePaneId: root.id });
  });

  it("sets the active pane's filter from the prompt", () => {
    applyLiveFilter("root", "milk !high ", 11);

    expect(listPane("root").filter).toEqual({ title: "milk", priority: ["high"], parent_id: undefined });
  });

  it("keeps the pane's group", () => {
    state().selectPane("group", "insert");
    applyLiveFilter("group", "milk", 4);

    expect(listPane("group").filter).toEqual({ title: "milk", parent_id: "g1" });
  });

  it("leaves the filter alone for other commands", () => {
    const before = listPane("root").filter;
    applyLiveFilter("root", ":edit @done", 11);

    expect(listPane("root").filter).toBe(before);
  });

  it("does not replace an equal filter", () => {
    applyLiveFilter("root", "milk", 4);
    const before = listPane("root").filter;
    applyLiveFilter("root", "milk ", 5);

    expect(listPane("root").filter).toBe(before);
  });

  it("ignores panes that are no longer active", () => {
    const before = listPane("group").filter;
    applyLiveFilter("group", "milk", 4);

    expect(listPane("group").filter).toBe(before);
  });

  it("clears the filter when the prompt is emptied", () => {
    applyLiveFilter("root", "milk", 4);
    applyLiveFilter("root", "", 0);

    expect(listPane("root").filter).toEqual({ parent_id: undefined });
  });
});
