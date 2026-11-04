import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getItems } from "../api/items";
import { useUiStore } from "../stores/ui";
import {
  Group,
  Task,
  type GetItemRequest,
  type GetItemResponse,
} from "../types/backend";
import {
  createConfigPane,
  createDetailPane,
  createListPane,
  createRootPane,
} from "./pane/factories";
import type { DetailPane, ListPane } from "./pane/types";
import {
  hasUrlState,
  hydrateFromUrl,
  serializePanes,
  startUrlSync,
} from "./urlState";

vi.mock("../api/items", () => ({
  getItems: vi.fn(),
  getTags: vi.fn(() => Promise.resolve({ tags: [] })),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  bulkUpdateItem: vi.fn(),
}));

function item(guid: string, type: string): GetItemResponse {
  return {
    guid,
    title: guid,
    type,
    status: "TODO",
    priority: "NORMAL",
    tags: [],
  };
}

const TREE: Record<string, GetItemResponse[]> = {
  root: [item("g1", Group), item("t1", Task)],
  g1: [item("c1", Task), item("c2", Group)],
  c2: [item("d1", Task)],
};

function serveTree() {
  vi.mocked(getItems).mockImplementation(async (filter?: GetItemRequest) => {
    return TREE[filter?.parent_id ?? "root"] ?? [];
  });
}

const setUrl = (state: unknown) =>
  window.history.replaceState(
    null,
    "",
    `/?s=${encodeURIComponent(JSON.stringify(state))}`,
  );

const clearUrl = () => window.history.replaceState(null, "", "/");

const state = () => useUiStore.getState();
const list = (i: number) => state().panes[i] as ListPane;

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function resetStore() {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
}

beforeEach(() => {
  vi.clearAllMocks();
  serveTree();
  clearUrl();
  resetStore();
});

afterEach(() => {
  clearUrl();
});

describe("serializePanes", () => {
  it("returns null for the default state, so the URL stays clean", () => {
    const root = createRootPane();

    expect(serializePanes([root], root.id)).toBeNull();
  });

  it("stores the selection of a list", () => {
    const root = { ...createRootPane(), selectedGuid: "g1" };

    expect(JSON.parse(serializePanes([root], root.id)!)).toEqual({
      a: 0,
      p: [{ t: "l", g: "g1" }],
    });
  });

  it("stores the user filter and prompt but not the parent filter", () => {
    const root = {
      ...createRootPane(),
      prompt: "milk",
      filter: { parent_id: undefined, title: "milk", status: ["TODO"] },
    };

    expect(JSON.parse(serializePanes([root], root.id)!).p).toEqual([
      { t: "l", g: null, f: { title: "milk", status: ["TODO"] }, q: "milk" },
    ]);
  });

  it("stores every pane of a deep stack and the active one", () => {
    const root = { ...createRootPane(), selectedGuid: "g1" };
    const child = { ...createListPane("child", "g1"), selectedGuid: "c2" };
    const grand = { ...createListPane("grand", "c2"), selectedGuid: "d1" };
    const detail: DetailPane = {
      ...createDetailPane("detail", "d1"),
      selectedField: "status",
    };

    const saved = JSON.parse(
      serializePanes([root, child, grand, detail], "grand")!,
    );

    expect(saved.a).toBe(2);
    expect(saved.p).toEqual([
      { t: "l", g: "g1" },
      { t: "l", g: "c2" },
      { t: "l", g: "d1" },
      { t: "d", k: "status" },
    ]);
  });

  it("stops at a config pane instead of saving it", () => {
    const root = { ...createRootPane(), selectedGuid: "g1" };
    const config = createConfigPane("config", "theme:nord");

    expect(JSON.parse(serializePanes([root, config], "config")!)).toEqual({
      a: 0,
      p: [{ t: "l", g: "g1" }],
    });
  });

  it("drops panes whose parent has no selection", () => {
    const root = createRootPane();
    const orphan = createDetailPane("detail", "");

    expect(serializePanes([root, orphan], "detail")).toBeNull();
  });
});

describe("hasUrlState", () => {
  it("is false without the param", () => {
    expect(hasUrlState()).toBe(false);
  });

  it("is false when the param is malformed", () => {
    window.history.replaceState(null, "", "/?s=not-json");

    expect(hasUrlState()).toBe(false);
  });

  it("is false when the stack does not start with a list", () => {
    setUrl({ a: 0, p: [{ t: "d", k: "title" }] });

    expect(hasUrlState()).toBe(false);
  });

  it("is true for a valid state", () => {
    setUrl({ a: 0, p: [{ t: "l", g: "g1" }] });

    expect(hasUrlState()).toBe(true);
  });
});

describe("hydrateFromUrl", () => {
  it("rebuilds a nested stack of lists and a detail", async () => {
    setUrl({
      a: 3,
      p: [
        { t: "l", g: "g1" },
        { t: "l", g: "c2" },
        { t: "l", g: "d1" },
        { t: "d", k: "status" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().panes.map((p) => p.type)).toEqual([
      "list",
      "list",
      "list",
      "detail",
    ]);
    expect(state().panes[0].id).toBe("root");
    expect(list(0).selectedGuid).toBe("g1");
    expect(list(1).parentGuid).toBe("g1");
    expect(list(1).selectedGuid).toBe("c2");
    expect(list(2).parentGuid).toBe("c2");
    expect(list(2).selectedGuid).toBe("d1");
    expect(state().panes[3]).toMatchObject({
      itemGuid: "d1",
      selectedField: "status",
    });
    expect(state().activePaneId).toBe(state().panes[3].id);
    expect(state().mode).toBe("normal");
  });

  it("fills rendered ids and types for panes that are not visible", async () => {
    setUrl({
      a: 1,
      p: [
        { t: "l", g: "g1" },
        { t: "l", g: "c2" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(list(0).renderedGuids).toEqual(["g1", "t1"]);
    expect(list(0).renderedTypes).toEqual({ g1: Group, t1: Task });
  });

  it("restores the active pane", async () => {
    setUrl({
      a: 0,
      p: [
        { t: "l", g: "g1" },
        { t: "l", g: null },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().activePaneId).toBe("root");
  });

  it("clamps an out-of-range active pane", async () => {
    setUrl({ a: 9, p: [{ t: "l", g: "g1" }] });

    await hydrateFromUrl(newClient());

    expect(state().activePaneId).toBe("root");
  });

  it("restores the filter and prompt of a list", async () => {
    setUrl({
      a: 0,
      p: [
        { t: "l", g: null, f: { title: "milk", status: ["TODO"] }, q: "milk" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(list(0).prompt).toBe("milk");
    expect(list(0).filter).toEqual({
      title: "milk",
      status: ["TODO"],
      parent_id: undefined,
    });
    expect(vi.mocked(getItems)).toHaveBeenCalledWith({
      title: "milk",
      status: ["TODO"],
      parent_id: undefined,
    });
  });

  it("restores a due date view with its tags and order", async () => {
    const view = {
      due_to: "2026-11-22",
      recursive: true,
      status: ["TODO", "IN_PROGRESS"],
      order: ["due", "priority"],
      tags: ["work"],
    };
    setUrl({ a: 0, p: [{ t: "l", g: null, f: { ...view, due_from: 5, recursive: "yes" } }] });

    await hydrateFromUrl(newClient());

    expect(list(0).filter).toEqual({ ...view, recursive: undefined, parent_id: undefined });

    setUrl({ a: 0, p: [{ t: "l", g: null, f: view }] });
    resetStore();
    await hydrateFromUrl(newClient());

    expect(list(0).filter).toEqual({ ...view, parent_id: undefined });
  });

  it("drops a pane and everything after it when its item no longer exists", async () => {
    setUrl({
      a: 2,
      p: [
        { t: "l", g: "g1" },
        { t: "l", g: "gone" },
        { t: "d", k: "title" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().panes.map((p) => p.type)).toEqual(["list", "list"]);
    expect(list(1).selectedGuid).toBeNull();
    expect(state().activePaneId).toBe(state().panes[1].id);
  });

  it("drops a detail whose item no longer exists", async () => {
    setUrl({
      a: 1,
      p: [
        { t: "l", g: "gone" },
        { t: "d", k: "title" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().panes.map((p) => p.type)).toEqual(["list"]);
    expect(list(0).selectedGuid).toBeNull();
  });

  it("drops a child list under an item that is not a group", async () => {
    setUrl({
      a: 1,
      p: [
        { t: "l", g: "t1" },
        { t: "l", g: null },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().panes).toHaveLength(1);
    expect(list(0).selectedGuid).toBe("t1");
  });

  it("opens a detail for a task selected in the previous list", async () => {
    setUrl({
      a: 1,
      p: [
        { t: "l", g: "t1" },
        { t: "d", k: "description" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().panes[1]).toMatchObject({
      type: "detail",
      itemGuid: "t1",
      selectedField: "description",
    });
  });

  it("keeps the panes it could build when a request fails", async () => {
    vi.mocked(getItems).mockImplementation(async (filter?: GetItemRequest) => {
      if (filter?.parent_id === "g1") throw new Error("boom");
      return TREE.root;
    });
    setUrl({
      a: 1,
      p: [
        { t: "l", g: "g1" },
        { t: "l", g: "c1" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(state().panes).toHaveLength(1);
    expect(list(0).selectedGuid).toBe("g1");
  });

  it("leaves the default state when the first request fails", async () => {
    vi.mocked(getItems).mockRejectedValue(new Error("boom"));
    setUrl({ a: 0, p: [{ t: "l", g: "g1" }] });

    await hydrateFromUrl(newClient());

    expect(state().panes).toHaveLength(1);
    expect(list(0).selectedGuid).toBeNull();
  });

  it("ignores a malformed param", async () => {
    window.history.replaceState(null, "", "/?s=%7Bnope");

    await hydrateFromUrl(newClient());

    expect(getItems).not.toHaveBeenCalled();
    expect(state().panes).toHaveLength(1);
  });

  it("ignores unknown filter keys and invalid detail fields", async () => {
    setUrl({
      a: 1,
      p: [
        { t: "l", g: "t1", f: { title: "x", status: "TODO", nope: 1 } },
        { t: "d", k: "bogus" },
      ],
    });

    await hydrateFromUrl(newClient());

    expect(list(0).filter).toEqual({ title: "x", parent_id: undefined });
    expect(state().panes[1]).toMatchObject({
      type: "detail",
      selectedField: null,
    });
  });
});

describe("startUrlSync", () => {
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stop?.();
    vi.useRealTimers();
  });

  it("writes the state to the URL after a pause", () => {
    stop = startUrlSync();

    useUiStore.setState({
      panes: [{ ...createRootPane(), selectedGuid: "g1" }],
    });

    expect(window.location.search).toBe("");

    vi.advanceTimersByTime(250);

    const saved = JSON.parse(
      new URLSearchParams(window.location.search).get("s")!,
    );
    expect(saved).toEqual({ a: 0, p: [{ t: "l", g: "g1" }] });
  });

  it("writes once for a burst of changes", () => {
    const replace = vi.spyOn(window.history, "replaceState");
    stop = startUrlSync();
    replace.mockClear();

    for (const id of ["g1", "t1", "g1", "t1"]) {
      useUiStore.setState({
        panes: [{ ...createRootPane(), selectedGuid: id }],
      });
    }
    vi.advanceTimersByTime(250);

    expect(replace).toHaveBeenCalledTimes(1);
    replace.mockRestore();
  });

  it("removes the param when the state goes back to the default", () => {
    setUrl({ a: 0, p: [{ t: "l", g: "g1" }] });
    stop = startUrlSync();

    expect(window.location.search).toBe("");
  });

  it("keeps other query params and the hash", () => {
    window.history.replaceState(null, "", "/?theme=dark#top");
    stop = startUrlSync();

    useUiStore.setState({
      panes: [{ ...createRootPane(), selectedGuid: "g1" }],
    });
    vi.advanceTimersByTime(250);

    const url = new URL(window.location.href);
    expect(url.searchParams.get("theme")).toBe("dark");
    expect(url.searchParams.get("s")).not.toBeNull();
    expect(url.hash).toBe("#top");
  });

  it("flushes pending changes on pagehide", () => {
    stop = startUrlSync();

    useUiStore.setState({
      panes: [{ ...createRootPane(), selectedGuid: "t1" }],
    });
    window.dispatchEvent(new Event("pagehide"));

    const saved = JSON.parse(
      new URLSearchParams(window.location.search).get("s")!,
    );
    expect(saved.p[0].g).toBe("t1");
  });
});

describe("bootUrlState", () => {
  it("hydrates once and then keeps the URL in sync", async () => {
    vi.resetModules();
    const { getItems: freshGetItems } = await import("../api/items");
    vi.mocked(freshGetItems).mockImplementation(
      async (filter?: GetItemRequest) => {
        return TREE[filter?.parent_id ?? "root"] ?? [];
      },
    );
    const urlState = await import("./urlState");
    const { useUiStore: freshStore } = await import("../stores/ui");

    setUrl({ a: 0, p: [{ t: "l", g: "g1" }] });

    const client = newClient();
    const first = urlState.bootUrlState(client);
    const second = urlState.bootUrlState(client);
    await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(freshGetItems).toHaveBeenCalledTimes(1);
    expect((freshStore.getState().panes[0] as ListPane).selectedGuid).toBe(
      "g1",
    );
    expect(new URLSearchParams(window.location.search).get("s")).not.toBeNull();
  });
});
