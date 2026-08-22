import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ItemList } from "./itemList";
import { useItems } from "../../hooks/useItems";
import { useUiStore } from "../../stores/ui";

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

  // Mock enxuto do app contendo o ui store e as funções essenciais
  const mockApp = {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: {
      create: vi.fn(),
    },
  };

  return render(
    <QueryClientProvider client={client}>
      <ItemList app={mockApp as any} />
    </QueryClientProvider>,
  );
}

describe("ItemList", () => {
  beforeEach(() => {
    // Reseta o estado da store entre os testes se necessário
    useUiStore.setState({
      prompt: "",
      filter: {},
      mode: "insert",
      selectedId: null,
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
