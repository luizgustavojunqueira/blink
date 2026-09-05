import { describe, expect, it, vi, beforeEach } from "vitest";
import { paneNavigation } from "./panes";
import { useUiStore } from "../../../stores/ui";
import { createDetailPane, createRootPane } from "../../pane/factories";
import type { AppContext } from "../../types";
import type { KeyContext, KeyQueryContext } from "../types";
import { Group, Task } from "../../../types/backend";

const byId = Object.fromEntries(paneNavigation.map((b) => [b.id, b]));

function app(): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function ctx(overrides: Partial<KeyContext> = {}): KeyContext {
  return {
    app: app(),
    pane: { ...createRootPane(), selectedId: "item-1" },
    itemType: Task,
    ...overrides,
  };
}

beforeEach(() => {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
});

describe("list:l", () => {
  it("pushes a detail pane for the selected item and activates it", () => {
    const c = ctx();
    byId["list:l:detail"].run(c, "l");

    const store = useUiStore.getState();
    expect(store.panes).toHaveLength(2);
    expect(store.panes[1]).toMatchObject({
      type: "detail",
      itemId: "item-1",
    });
    expect(store.activePaneId).toBe(store.panes[1].id);
  });

  it("does nothing when nothing is selected", () => {
    const c = ctx() as {
      app: KeyContext["app"];
      pane: ReturnType<typeof createRootPane>;
    };
    c.pane.selectedId = null;

    byId["list:l:detail"].run(c, "l");

    expect(useUiStore.getState().panes).toHaveLength(1);
  });

  it("does nothing on a detail pane", () => {
    const c = ctx();
    c.pane = {
      id: "d1",
      type: "detail",
      itemId: "item-1",
      selectedField: "title",
    };

    byId["list:l:detail"].run(c, "l");

    expect(useUiStore.getState().panes).toHaveLength(1);
  });
});

describe("list:l on a group", () => {
  it("pushes a list pane instead of a detail one", () => {
    byId["list:l:group"].run(ctx({ itemType: Group }), "l");

    const store = useUiStore.getState();
    expect(store.panes).toHaveLength(2);
    expect(store.panes[1]).toMatchObject({ type: "list", parentId: "item-1" });
    expect(store.activePaneId).toBe(store.panes[1].id);
  });
});

describe("list:h", () => {
  it("pops the top pane", () => {
    const root = createRootPane();
    useUiStore.setState({
      panes: [root, { ...createRootPane(), id: "child" }],
      activePaneId: "child",
    });

    byId["list:h"].run(ctx(), "h");

    const store = useUiStore.getState();
    expect(store.panes.map((p) => p.id)).toEqual(["root"]);
    expect(store.activePaneId).toBe("root");
  });

  it("closes a detail pane just the same, since popping does not care about pane type", () => {
    const root = createRootPane();
    useUiStore.setState({
      panes: [root, createDetailPane("d1", "item-1")],
      activePaneId: "d1",
    });

    byId["list:h"].run(ctx(), "h");

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

    byId["list:ctrll"].run(ctx(), "ctrl+l");

    expect(useUiStore.getState().activePaneId).toBe("child");
  });

  it("moves the focus back to the previous pane", () => {
    const root = createRootPane();
    const child = { ...createRootPane(), id: "child" };
    useUiStore.setState({ panes: [root, child], activePaneId: "child" });

    byId["list:ctrlh"].run(ctx(), "ctrl+h");

    expect(useUiStore.getState().activePaneId).toBe("root");
  });

  it("offers each direction only where the focus can actually move", () => {
    const stack = (count: number, activeIdx: number) => {
      const panes = Array.from({ length: count }, (_, i) => ({
        ...createRootPane(),
        id: `pane-${i}`,
      }));
      return {
        ui: { ...useUiStore.getState(), panes, activePaneId: panes[activeIdx].id },
        pane: panes[activeIdx],
      } as KeyQueryContext;
    };

    const canMove = (id: string, ctx: KeyQueryContext) => byId[id].when?.(ctx) ?? true;

    expect(canMove("list:ctrll", stack(1, 0))).toBe(false);
    expect(canMove("list:ctrlh", stack(1, 0))).toBe(false);

    expect(canMove("list:ctrll", stack(2, 0))).toBe(true);
    expect(canMove("list:ctrlh", stack(2, 0))).toBe(false);
    expect(canMove("list:ctrll", stack(2, 1))).toBe(false);
    expect(canMove("list:ctrlh", stack(2, 1))).toBe(true);

    expect(canMove("list:ctrll", stack(3, 1))).toBe(true);
    expect(canMove("list:ctrlh", stack(3, 1))).toBe(false);
    expect(canMove("list:ctrll", stack(3, 2))).toBe(false);
    expect(canMove("list:ctrlh", stack(3, 2))).toBe(true);
  });
});
