import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createItem } from "../api/items";
import { useAppContext } from "./useAppContext";

vi.mock("../api/items", () => ({
  getItems: vi.fn(() => Promise.resolve([])),
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

function renderAppContext(setFilter = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const view = renderHook(() => useAppContext(), { wrapper });

  return { ...view, setFilter, invalidate };
}

describe("useAppContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the theme setter", () => {
    const { result } = renderAppContext();

    result.current.setTheme("nord");

    expect(document.documentElement.className).toBe("theme-nord");
    document.documentElement.className = "";
  });

  it("posts to the API on create", async () => {
    const created = { guid: "a7b9", title: "buy milk" };
    vi.mocked(createItem).mockResolvedValue(created as never);

    const { result } = renderAppContext();
    const item = {
      title: "buy milk",
      type: "TASK",
      status: "TODO",
      priority: "NORMAL",
      tags: [],
    };

    await expect(result.current.items.create(item as never)).resolves.toEqual(created);
    expect(vi.mocked(createItem).mock.calls[0][0]).toEqual(item);
  });

  it("invalidates the items prefix after a create, so every cached filter refetches", async () => {
    vi.mocked(createItem).mockResolvedValue({} as never);

    const { result, invalidate } = renderAppContext();
    await result.current.items.create({} as never);

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["items"] });
    });
  });

  it("rejects when the API fails, so commands can surface the message", async () => {
    vi.mocked(createItem).mockRejectedValue(new Error("title is required"));

    const { result } = renderAppContext();

    await expect(result.current.items.create({} as never)).rejects.toThrow("title is required");
  });

  it("keeps a stable identity across renders", () => {
    const { result, rerender } = renderAppContext();
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
