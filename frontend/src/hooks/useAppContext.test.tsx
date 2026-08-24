import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createItem, updateItem } from "../api/items";
import { useAppContext } from "./useAppContext";
import { Done, InProgress, Normal, Task, ToDo } from "../types/backend";
import type { GetItemResponse, ItemStatus } from "../types/backend";

vi.mock("../api/items", () => ({
  getItems: vi.fn(() => Promise.resolve([])),
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

function item(guid: string, status: ItemStatus): GetItemResponse {
  return {
    guid,
    title: "Build blink",
    type: Task,
    status,
    priority: Normal,
    tags: [],
  };
}

function renderAppContext(setFilter = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const view = renderHook(() => useAppContext(), { wrapper });

  return { ...view, client, setFilter, invalidate };
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

describe("useAppContext: setStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the request when the cached item already has that status", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", Done)]);

    await result.current.items.setStatus("item-1", Done);

    expect(updateItem).not.toHaveBeenCalled();
  });

  it("sends the update when the status differs", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", Done));

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", ToDo)]);

    await result.current.items.setStatus("item-1", Done);

    expect(updateItem).toHaveBeenCalledOnce();
    expect(vi.mocked(updateItem).mock.calls[0][0]).toEqual({ guid: "item-1", status: Done });
  });

  it("sends the update when the item is in no cached list", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", Done));

    const { result } = renderAppContext();

    await result.current.items.setStatus("item-1", Done);

    expect(updateItem).toHaveBeenCalledOnce();
    expect(vi.mocked(updateItem).mock.calls[0][0]).toEqual({ guid: "item-1", status: Done });
  });

  it("finds the item in a list cached under any filter", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(["items", { status: [ToDo] }], [item("item-1", ToDo)]);

    await result.current.items.setStatus("item-1", ToDo);

    expect(updateItem).not.toHaveBeenCalled();
  });
});

describe("useAppContext: update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces the item in every cached list instead of refetching", async () => {
    const updated = item("item-1", Done);
    vi.mocked(updateItem).mockResolvedValue(updated);

    const { result, client, invalidate } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", ToDo), item("item-2", InProgress)]);
    client.setQueryData(["items", { status: [ToDo] }], [item("item-1", ToDo)]);

    await result.current.items.update({ guid: "item-1", status: Done });

    expect(client.getQueryData(["items", {}])).toEqual([updated, item("item-2", InProgress)]);
    expect(client.getQueryData(["items", { status: [ToDo] }])).toEqual([updated]);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("leaves untouched lists alone", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", Done));

    const { result, client } = renderAppContext();
    const others = [item("item-2", ToDo)];
    client.setQueryData(["items", { status: [InProgress] }], others);

    await result.current.items.update({ guid: "item-1", status: Done });

    expect(client.getQueryData(["items", { status: [InProgress] }])).toEqual(others);
  });
});
