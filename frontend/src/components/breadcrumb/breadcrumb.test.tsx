import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Breadcrumb from "./breadcrumb";
import { useUiStore } from "../../stores/ui";
import { createDetailPane, createListPane, createRootPane } from "../../lib/pane/factories";
import type { GetItemResponse } from "../../types/backend";

const mockItems = vi.hoisted(() => ({
  findItem: vi.fn(),
}));

vi.mock("../../hooks/useItems", () => ({
  useItem: (guid: string) => mockItems.findItem(guid),
}));

function makeItem(overrides: Partial<GetItemResponse> = {}): GetItemResponse {
  return {
    guid: "item-1",
    title: "Groceries",
    type: "GROUP",
    status: "TODO",
    priority: "NORMAL",
    tags: [],
    ...overrides,
  };
}

const root = createRootPane();
const group = createListPane("group-1", "group-guid");
const detail = createDetailPane("detail-1", "task-guid");

function itemsByGuid(items: GetItemResponse[]) {
  mockItems.findItem.mockImplementation((guid: string) => items.find((i) => i.guid === guid));
}

describe("Breadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({
      panes: [root, group, detail],
      activePaneId: root.id,
    });
  });

  it("shows only Home for the root pane", () => {
    render(<Breadcrumb paneId={root.id} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("shows Home and the group's title for a nested list pane", () => {
    itemsByGuid([makeItem({ guid: "group-guid", title: "Groceries" })]);

    render(<Breadcrumb paneId={group.id} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("shows the full trail down to the item for a detail pane", () => {
    itemsByGuid([
      makeItem({ guid: "group-guid", title: "Groceries" }),
      makeItem({ guid: "task-guid", title: "Buy milk", type: "TASK" }),
    ]);

    render(<Breadcrumb paneId={detail.id} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getAllByText("/")).toHaveLength(2);
  });

  it("highlights only the last segment as the current pane", () => {
    itemsByGuid([makeItem({ guid: "group-guid", title: "Groceries" })]);

    render(<Breadcrumb paneId={group.id} />);

    expect(screen.getByText("Home")).not.toHaveClass("text-fg");
    expect(screen.getByText("Groceries")).toHaveClass("text-fg");
  });

  it("renders nothing beyond the pane's own position in the stack", () => {
    itemsByGuid([makeItem({ guid: "group-guid", title: "Groceries" })]);

    render(<Breadcrumb paneId={group.id} />);

    expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
  });

  it("does not re-render when typing in the prompt or moving the selection", () => {
    itemsByGuid([makeItem({ guid: "group-guid", title: "Groceries" })]);

    render(<Breadcrumb paneId={group.id} />);
    const calls = mockItems.findItem.mock.calls.length;

    act(() => {
      useUiStore.setState((s) => ({
        panes: s.panes.map((p) =>
          p.id === root.id
            ? { ...root, prompt: "milk" }
            : p.id === group.id
              ? { ...group, prompt: "milk", selectedGuid: "other" }
              : p,
        ),
      }));
    });

    expect(mockItems.findItem).toHaveBeenCalledTimes(calls);
  });
});
