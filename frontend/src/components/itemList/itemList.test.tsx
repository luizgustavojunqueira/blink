import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ItemList } from "./itemList";
import { useItems } from "../../hooks/useItems";
import { useUiStore } from "../../stores/ui";
import { createRootPane } from "../../lib/pane/factories";

vi.mock("../../hooks/useItems", () => ({
  useItems: vi.fn(),
}));

vi.mock("../prompt/prompt", () => ({
  default: () => <div data-testid="prompt-mock" />,
}));

const mockedUseItems = vi.mocked(useItems);

const ROOT_ID = "root";

function renderComponent() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ItemList paneId={ROOT_ID} />
    </QueryClientProvider>,
  );
}

describe("ItemList", () => {
  beforeEach(() => {
    const pane = createRootPane();
    useUiStore.setState({
      mode: "insert",
      panes: [pane],
      activePaneId: pane.id,
    });
  });

  it("renders loading state", () => {
    mockedUseItems.mockReturnValue({
      data: [],
      isFetching: true,
      isError: false,
      error: null,
    } as any);

    renderComponent();

    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockedUseItems.mockReturnValue({
      data: [],
      isFetching: false,
      isError: true,
      error: new Error("failed"),
    } as any);

    renderComponent();

    expect(screen.getByText("could not load items")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    mockedUseItems.mockReturnValue({
      data: [],
      isFetching: false,
      isError: false,
      error: null,
    } as any);

    renderComponent();

    expect(screen.getByText("no items")).toBeInTheDocument();
  });

  it("renders items", () => {
    mockedUseItems.mockReturnValue({
      data: [
        {
          guid: "1",
          title: "First item",
          type: "TASK",
          status: "TODO",
          priority: "HIGH",
          tags: [],
        },
        {
          guid: "2",
          title: "Second item",
          type: "TASK",
          status: "DONE",
          priority: "NORMAL",
          tags: [],
        },
      ],
      isFetching: false,
      isError: false,
      error: null,
    } as any);

    renderComponent();

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });
});
