import { QueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkUpdateItem } from "../api/items";
import { createItemActions } from "../lib/appContext";
import { createRootPane } from "../lib/pane/factories";
import { useRowState } from "../hooks/useRowState";
import { useUiStore } from "../stores/ui";
import { Done, Normal, Task, ToDo, type GetItemResponse } from "../types/backend";

vi.mock("../api/items", () => ({
  getItems: vi.fn(() => Promise.resolve([])),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  bulkUpdateItem: vi.fn(),
  deleteItems: vi.fn(),
  restoreItems: vi.fn(),
}));

const state = () => useUiStore.getState();

const guidsOf = (n: number) => Array.from({ length: n }, (_, i) => `g${i}`);

const item = (guid: string): GetItemResponse => ({
  guid,
  title: `task ${guid}`,
  type: Task,
  status: ToDo,
  priority: Normal,
  tags: [],
});

const timed = async (run: () => unknown) => {
  const start = performance.now();
  await run();
  return performance.now() - start;
};

function showList(guids: string[]) {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
  state().setRendered(root.id, guids, Object.fromEntries(guids.map((g) => [g, Task])));
  state().select(root.id, guids[0]);
  return root.id;
}

beforeEach(() => {
  vi.mocked(bulkUpdateItem).mockReset();
});

describe("scale: bulk edit", () => {
  it("edits 50k marked items without work that grows with the square of the list", async () => {
    const guids = guidsOf(50_000);
    const client = new QueryClient();
    client.setQueryData(["items", {}], guids.map(item));
    vi.mocked(bulkUpdateItem).mockImplementation(async ({ guids: sent }) =>
      sent.map((g) => ({ ...item(g), status: Done })),
    );
    const actions = createItemActions(client);

    const ms = await timed(() => actions.bulkSetFields(guids, { status: Done }));

    expect(vi.mocked(bulkUpdateItem).mock.calls[0][0].guids).toHaveLength(50_000);
    expect(client.getQueryData<GetItemResponse[]>(["items", {}])?.every((i) => i.status === Done)).toBe(true);
    expect(ms).toBeLessThan(500);
  });
});

describe("scale: list navigation in the store", () => {
  it("selects and marks 50k rows in visual mode quickly", async () => {
    const guids = guidsOf(50_000);
    const paneId = showList(guids);

    const ms = await timed(() => {
      state().toggleVisual(guids[0]);
      state().moveDown(guids.length);
      state().escape();
    });

    const pane = state().panes.find((p) => p.id === paneId);
    expect(pane?.type === "list" && pane.markedGuids.size).toBe(50_000);
    expect(ms).toBeLessThan(500);
  });

  it("moves the cursor 1000 times over 50k rows quickly", async () => {
    const guids = guidsOf(50_000);
    showList(guids);

    const ms = await timed(() => {
      for (let i = 0; i < 1000; i++) state().moveDown(1);
    });

    expect(ms).toBeLessThan(500);
  });
});

describe("scale: row re-renders", () => {
  const ROWS = 2_000;

  function renderRows(paneId: string, guids: string[]) {
    const renders = new Map<string, number>();
    function Row({ guid }: { guid: string }) {
      renders.set(guid, (renders.get(guid) ?? 0) + 1);
      useRowState(paneId, guid);
      return null;
    }
    const view = render(
      <>
        {guids.map((g) => (
          <Row key={g} guid={g} />
        ))}
      </>,
    );
    return { renders, view };
  }

  it("re-renders two rows when the cursor moves, whatever the list size", () => {
    const guids = guidsOf(ROWS);
    const paneId = showList(guids);
    const { renders, view } = renderRows(paneId, guids);
    renders.clear();

    act(() => state().moveDown(1));

    expect([...renders.keys()].sort()).toEqual(["g0", "g1"]);
    view.unmount();
  });

  it("re-renders one row per step while extending a large visual range", () => {
    const guids = guidsOf(ROWS);
    const paneId = showList(guids);
    act(() => {
      state().toggleVisual(guids[0]);
      state().moveDown(ROWS / 2);
    });
    const { renders, view } = renderRows(paneId, guids);
    renders.clear();

    act(() => state().moveDown(1));

    expect([...renders.keys()].sort()).toEqual([`g${ROWS / 2}`, `g${ROWS / 2 + 1}`]);
    view.unmount();
  });

  it("re-renders only the toggled row when marking", () => {
    const guids = guidsOf(ROWS);
    const paneId = showList(guids);
    const { renders, view } = renderRows(paneId, guids);
    renders.clear();

    act(() => state().toggleMarked(paneId, "g10"));

    expect([...renders.keys()]).toEqual(["g10"]);
    view.unmount();
  });
});
