import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ItemList } from "./itemList";

import { useItems } from "../../hooks/useItems";

vi.mock("../../hooks/useItems", () => ({
  useItems: vi.fn(),
}));

const mockedUseItems = vi.mocked(useItems);

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
      <ItemList />
    </QueryClientProvider>,
  );
}

describe("ItemList", () => {
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

    expect(screen.getByText("erro: failed")).toBeInTheDocument();
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
