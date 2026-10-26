import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPane from "./historyPane";
import { useUiStore } from "../../stores/ui";
import { useKeyMap } from "../../hooks/useKeyMap";
import { getAppContext } from "../../lib/appContext";
import { queryClient } from "../../lib/queryClient";
import { createHistoryPane, createRootPane } from "../../lib/pane/factories";
import type { HistoryPane as HistoryPaneState } from "../../lib/pane/types";
import { applyKeymap } from "../../lib/keymap/registry";
import type { ItemHistoryEntry } from "../../types/backend";

const getItemHistory = vi.fn();

vi.mock("../../api/items", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/items")>()),
  getItemHistory: (...args: unknown[]) => getItemHistory(...args),
}));

const selectedRow = () => (useUiStore.getState().panes[1] as HistoryPaneState).selectedRow;

const entries: ItemHistoryEntry[] = [
  { at: "2026-10-26T12:30:00Z", actor: "alice", field: "status", old_value: "TODO", new_value: "DONE" },
  { at: "2026-10-26T12:00:00Z", actor: null, field: "title", old_value: "a", new_value: "b" },
  { at: "2026-10-26T11:00:00Z", actor: "alice", field: "created", old_value: null, new_value: "first" },
];

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  });
}

function setup() {
  const pane = createHistoryPane("history", "item-1");
  useUiStore.setState({ mode: "normal", panes: [createRootPane(), pane], activePaneId: pane.id });

  renderHook(() => useKeyMap(getAppContext()));
  render(
    <QueryClientProvider client={queryClient}>
      <HistoryPane paneId="history" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  getItemHistory.mockReset().mockResolvedValue(entries);
});

afterEach(() => {
  applyKeymap({});
});

describe("HistoryPane", () => {
  it("lists who changed what", async () => {
    setup();

    expect(await screen.findByText("TODO → DONE")).toBeInTheDocument();
    expect(screen.getByText("a → b")).toBeInTheDocument();
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getAllByText("alice")).toHaveLength(2);
    expect(screen.getByText("removed user")).toBeInTheDocument();
    expect(getItemHistory).toHaveBeenCalledWith("item-1");
  });

  it("says so when there are no changes", async () => {
    getItemHistory.mockResolvedValue([]);
    setup();

    expect(await screen.findByText("no changes yet")).toBeInTheDocument();
  });

  it("moves through the entries with j and k", async () => {
    setup();
    await screen.findByText("TODO → DONE");

    press("j");
    await waitFor(() => expect(selectedRow()).toBe("0"));
    press("j");
    await waitFor(() => expect(selectedRow()).toBe("1"));
    press("k");
    await waitFor(() => expect(selectedRow()).toBe("0"));
  });
});
