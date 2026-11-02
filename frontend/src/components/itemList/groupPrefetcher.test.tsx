import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GroupPrefetcher, { PREFETCH_DELAY_MS } from "./groupPrefetcher";
import { getItems } from "../../api/items";
import { useUiStore } from "../../stores/ui";
import { createRootPane } from "../../lib/pane/factories";
import { Group, Task } from "../../types/backend";

vi.mock("../../api/items", () => ({ getItems: vi.fn(() => Promise.resolve([])) }));

const state = () => useUiStore.getState();
let client: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(getItems).mockClear();
  client = new QueryClient();
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
  state().setRendered(root.id, ["g1", "g2", "t1"], { g1: Group, g2: Group, t1: Task });
  render(
    <QueryClientProvider client={client}>
      <GroupPrefetcher paneId={root.id} />
    </QueryClientProvider>,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

const select = (guid: string) => act(() => state().select("root", guid));
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("GroupPrefetcher", () => {
  it("loads a group's items once the cursor rests on it", () => {
    select("g1");
    wait(PREFETCH_DELAY_MS);

    expect(getItems).toHaveBeenCalledExactlyOnceWith({ parent_id: "g1" });
  });

  it("uses the same query the group's pane will read", () => {
    select("g1");
    wait(PREFETCH_DELAY_MS);

    expect(client.getQueryState(["items", { parent_id: "g1" }])).toBeDefined();
  });

  it("skips groups the cursor only passes over", () => {
    select("g1");
    wait(PREFETCH_DELAY_MS / 2);
    select("g2");
    wait(PREFETCH_DELAY_MS);

    expect(getItems).toHaveBeenCalledExactlyOnceWith({ parent_id: "g2" });
  });

  it("does nothing for tasks", () => {
    select("t1");
    wait(PREFETCH_DELAY_MS * 2);

    expect(getItems).not.toHaveBeenCalled();
  });
});
