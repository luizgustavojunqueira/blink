import { describe, expect, it, vi, beforeEach } from "vitest";
import { paneNavigation } from "./panes";
import { useUiStore } from "../../../stores/ui";
import { createRootPane } from "../../pane/factories";
import type { AppContext } from "../../types";
import type { KeyContext } from "../types";

const byId = Object.fromEntries(paneNavigation.map((b) => [b.id, b]));

function app(): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: { setStatus: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
}

function ctx(overrides: Partial<KeyContext> = {}): KeyContext {
  return {
    app: app(),
    pane: { ...createRootPane(), selectedId: "item-1" },
    ...overrides,
  };
}

beforeEach(() => {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
});

describe("list:l", () => {
  it("pushes a new list pane parented to the selected item and activates it", () => {
    const c = ctx();
    byId["list:l"].run(c);

    const store = useUiStore.getState();
    expect(store.panes).toHaveLength(2);
    expect(store.panes[1]).toMatchObject({ type: "list", parentId: "item-1" });
    expect(store.activePaneId).toBe(store.panes[1].id);
  });

  it("does nothing when nothing is selected", () => {
    const c = ctx() as { app: KeyContext["app"]; pane: ReturnType<typeof createRootPane> };
    c.pane.selectedId = null;

    byId["list:l"].run(c);

    expect(useUiStore.getState().panes).toHaveLength(1);
  });

  it("does nothing on a detail pane", () => {
    const c = ctx();
    c.pane = { id: "d1", parentId: null, prompt: "", type: "detail", itemId: "item-1" };

    byId["list:l"].run(c);

    expect(useUiStore.getState().panes).toHaveLength(1);
  });
});

describe("list:h", () => {
  it("pops the top pane", () => {
    const root = createRootPane();
    useUiStore.setState({
      panes: [root, { ...createRootPane(), id: "child" }],
      activePaneId: "child",
    });

    byId["list:h"].run(ctx());

    const store = useUiStore.getState();
    expect(store.panes.map((p) => p.id)).toEqual(["root"]);
    expect(store.activePaneId).toBe("root");
  });
});

describe("list:ctrll / list:ctrlh", () => {
  it("moves the focus to the rightmost pane", () => {
    const root = createRootPane();
    const child = { ...createRootPane(), id: "child" };
    useUiStore.setState({ panes: [root, child], activePaneId: "root" });

    byId["list:ctrll"].run(ctx());

    expect(useUiStore.getState().activePaneId).toBe("child");
  });

  it("moves the focus back to the previous pane", () => {
    const root = createRootPane();
    const child = { ...createRootPane(), id: "child" };
    useUiStore.setState({ panes: [root, child], activePaneId: "child" });

    byId["list:ctrlh"].run(ctx());

    expect(useUiStore.getState().activePaneId).toBe("root");
  });
});
