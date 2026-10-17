import { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bulkUpdateItem, createItem, updateItem } from "../api/items";
import { createAppContext, getAppContext, getItemActions } from "./appContext";
import { useUiStore } from "../stores/ui";
import { Done, High, InProgress, Normal, Task, ToDo } from "../types/backend";
import type { GetItemResponse } from "../types/backend";

vi.mock("../api/items", () => ({
  getItems: vi.fn(() => Promise.resolve([])),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  bulkUpdateItem: vi.fn(),
}));

function item(guid: string, overrides: Partial<GetItemResponse> = {}): GetItemResponse {
  return {
    guid,
    title: "Build blink",
    type: Task,
    status: ToDo,
    priority: Normal,
    tags: [],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const fieldState = (key: string) => useUiStore.getState().fieldStates[key];

function renderAppContext(setFilter = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");

  return { result: { current: createAppContext(client) }, client, setFilter, invalidate };
}

describe("appContext", () => {
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
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tags"] });
    });
  });

  it("rejects when the API fails, so commands can surface the message", async () => {
    vi.mocked(createItem).mockRejectedValue(new Error("title is required"));

    const { result } = renderAppContext();

    await expect(result.current.items.create({} as never)).rejects.toThrow("title is required");
  });

  it("hands out one stable instance for the whole app", () => {
    expect(getAppContext()).toBe(getAppContext());
    expect(getItemActions()).toBe(getAppContext().items);
  });
});

describe("appContext: setField with status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the request when the cached item already has that status", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: Done })]);

    result.current.items.setField("item-1", "status", Done);

    expect(updateItem).not.toHaveBeenCalled();
  });

  it("sends the update when the status differs", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { status: Done }));

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", Done);

    await waitFor(() => expect(updateItem).toHaveBeenCalledOnce());
    expect(vi.mocked(updateItem).mock.calls[0][0]).toEqual({
      guid: "item-1",
      status: Done,
    });
  });

  it("sends the update when the item is in no cached list", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { status: Done }));

    const { result } = renderAppContext();

    result.current.items.setField("item-1", "status", Done);

    await waitFor(() => expect(updateItem).toHaveBeenCalledOnce());
    expect(vi.mocked(updateItem).mock.calls[0][0]).toEqual({
      guid: "item-1",
      status: Done,
    });
  });

  it("finds the item in a list cached under any filter", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(["items", { status: [ToDo] }], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", ToDo);

    expect(updateItem).not.toHaveBeenCalled();
  });

  it("compares tags by content, not by reference", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { tags: ["home", "urgent"] })]);

    result.current.items.setField("item-1", "tags", ["urgent", "home"]);

    expect(updateItem).not.toHaveBeenCalled();
  });

  it("sends the update when the tag list actually changed", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { tags: ["home"] }));

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { tags: ["home", "urgent"] })]);

    result.current.items.setField("item-1", "tags", ["home"]);

    await waitFor(() => expect(updateItem).toHaveBeenCalledOnce());
  });
});

describe("appContext: bulkSetFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bulkUpdateItem).mockResolvedValue([]);
  });

  it("skips the request when every marked item already matches", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(
      ["items", {}],
      [item("item-1", { status: Done }), item("item-2", { status: Done })],
    );

    await result.current.items.bulkSetFields(["item-1", "item-2"], {
      status: Done,
    });

    expect(bulkUpdateItem).not.toHaveBeenCalled();
  });

  it("sends only the guids that differ", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(
      ["items", {}],
      [item("item-1", { status: Done }), item("item-2", { status: ToDo })],
    );

    await result.current.items.bulkSetFields(["item-1", "item-2"], {
      status: Done,
    });

    expect(bulkUpdateItem).toHaveBeenCalledWith({
      guids: ["item-2"],
      status: Done,
    });
  });

  it("includes an item when any field of the patch differs", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(
      ["items", {}],
      [item("item-1", { status: Done, priority: Normal }), item("item-2", { status: Done })],
    );

    await result.current.items.bulkSetFields(["item-1", "item-2"], {
      status: Done,
      priority: High,
    });

    expect(bulkUpdateItem).toHaveBeenCalledWith({
      guids: ["item-1", "item-2"],
      status: Done,
      priority: High,
    });
  });

  it("compares tags by content, not by reference", async () => {
    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { tags: ["home", "urgent"] })]);

    await result.current.items.bulkSetFields(["item-1"], {
      tags: ["urgent", "home"],
    });

    expect(bulkUpdateItem).not.toHaveBeenCalled();
  });

  it("skips the request when the patch has no defined fields", async () => {
    const { result } = renderAppContext();

    await result.current.items.bulkSetFields(["item-1"], { status: undefined });

    expect(bulkUpdateItem).not.toHaveBeenCalled();
  });

  it("patches every cached list and refreshes the tag list", async () => {
    const updated = item("item-1", { status: Done, tags: ["home"] });
    vi.mocked(bulkUpdateItem).mockResolvedValue([updated]);

    const { result, client, invalidate } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1"), item("item-2", { status: InProgress })]);
    client.setQueryData(["items", { status: [ToDo] }], [item("item-1")]);

    await result.current.items.bulkSetFields(["item-1"], {
      status: Done,
      tags: ["home"],
    });

    expect(client.getQueryData(["items", {}])).toEqual([
      updated,
      item("item-2", { status: InProgress }),
    ]);
    expect(client.getQueryData(["items", { status: [ToDo] }])).toEqual([updated]);
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["items"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tags"] });
  });
});

describe("appContext: update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces the item in every cached list instead of refetching", async () => {
    const updated = item("item-1", { status: Done });
    vi.mocked(updateItem).mockResolvedValue(updated);

    const { result, client, invalidate } = renderAppContext();
    client.setQueryData(
      ["items", {}],
      [item("item-1", { status: ToDo }), item("item-2", { status: InProgress })],
    );
    client.setQueryData(["items", { status: [ToDo] }], [item("item-1", { status: ToDo })]);

    await result.current.items.update({ guid: "item-1", status: Done });

    expect(client.getQueryData(["items", {}])).toEqual([
      updated,
      item("item-2", { status: InProgress }),
    ]);
    expect(client.getQueryData(["items", { status: [ToDo] }])).toEqual([updated]);
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["items"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["tags"] });
  });

  it("leaves untouched lists alone", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { status: Done }));

    const { result, client } = renderAppContext();
    const others = [item("item-2", { status: ToDo })];
    client.setQueryData(["items", { status: [InProgress] }], others);

    await result.current.items.update({ guid: "item-1", status: Done });

    expect(client.getQueryData(["items", { status: [InProgress] }])).toEqual(others);
  });

  it("writes back only the fields the request sent", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { status: Done, priority: High }));

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo, priority: Normal })]);

    await result.current.items.update({ guid: "item-1", status: Done });

    expect(client.getQueryData(["items", {}])).toEqual([
      item("item-1", { status: Done, priority: Normal }),
    ]);
  });

  it("invalidates tags only when the request changes them", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { tags: ["home"] }));

    const { result, invalidate } = renderAppContext();

    await result.current.items.update({ guid: "item-1", tags: ["home"] });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tags"] });
  });

  it("hands the abort signal to the API", async () => {
    vi.mocked(updateItem).mockResolvedValue(item("item-1", { status: Done }));

    const { result } = renderAppContext();
    const controller = new AbortController();

    await result.current.items.update({ guid: "item-1", status: Done }, controller.signal);

    expect(vi.mocked(updateItem).mock.calls[0][1]).toBe(controller.signal);
  });
});

describe("appContext: setField optimistic", () => {
  const cachedStatus = (client: QueryClient) =>
    client.getQueryData<GetItemResponse[]>(["items", {}])?.[0].status;

  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ fieldStates: {} });
  });

  it("shows the new value in the cache while the request is in flight", async () => {
    const request = deferred<GetItemResponse>();
    vi.mocked(updateItem).mockReturnValue(request.promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", Done);

    expect(cachedStatus(client)).toBe(Done);

    request.resolve(item("item-1", { status: Done }));
    await waitFor(() => expect(fieldState("item-1:status")).toBeUndefined());
    expect(cachedStatus(client)).toBe(Done);
  });

  it("marks the field as saving until the request settles", async () => {
    const request = deferred<GetItemResponse>();
    vi.mocked(updateItem).mockReturnValue(request.promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", Done);

    expect(fieldState("item-1:status")).toEqual({ status: "saving" });

    request.resolve(item("item-1", { status: Done }));
    await waitFor(() => expect(fieldState("item-1:status")).toBeUndefined());
  });

  it("restores the previous value and records the error when the request fails", async () => {
    const request = deferred<GetItemResponse>();
    vi.mocked(updateItem).mockReturnValue(request.promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", Done);
    request.reject(new Error("boom"));

    await waitFor(() =>
      expect(fieldState("item-1:status")).toEqual({ status: "error", message: "boom" }),
    );
    expect(cachedStatus(client)).toBe(ToDo);
  });

  it("aborts the previous request for the same field", () => {
    vi.mocked(updateItem).mockReturnValue(deferred<GetItemResponse>().promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", InProgress);
    result.current.items.setField("item-1", "status", Done);

    const [first, second] = vi.mocked(updateItem).mock.calls.map((call) => call[1]);
    expect(first?.aborted).toBe(true);
    expect(second?.aborted).toBe(false);
  });

  it("does not abort requests for other fields or items", () => {
    vi.mocked(updateItem).mockReturnValue(deferred<GetItemResponse>().promise);

    const { result, client } = renderAppContext();
    client.setQueryData(
      ["items", {}],
      [item("item-1", { status: ToDo }), item("item-2", { status: ToDo })],
    );

    result.current.items.setField("item-1", "status", Done);
    result.current.items.setField("item-1", "priority", High);
    result.current.items.setField("item-2", "status", Done);

    for (const [, signal] of vi.mocked(updateItem).mock.calls) {
      expect(signal?.aborted).toBe(false);
    }
  });

  it("ignores the result of an aborted request", async () => {
    const first = deferred<GetItemResponse>();
    const second = deferred<GetItemResponse>();
    vi.mocked(updateItem).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", InProgress);
    result.current.items.setField("item-1", "status", Done);

    first.reject(new DOMException("aborted", "AbortError"));
    await Promise.resolve();
    await Promise.resolve();

    expect(fieldState("item-1:status")).toEqual({ status: "saving" });
    expect(cachedStatus(client)).toBe(Done);

    second.resolve(item("item-1", { status: Done }));
    await waitFor(() => expect(fieldState("item-1:status")).toBeUndefined());
    expect(cachedStatus(client)).toBe(Done);
  });

  it("falls back to the value from before the first click when the last request fails", async () => {
    const first = deferred<GetItemResponse>();
    const second = deferred<GetItemResponse>();
    vi.mocked(updateItem).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", InProgress);
    result.current.items.setField("item-1", "status", Done);

    first.reject(new DOMException("aborted", "AbortError"));
    second.reject(new Error("boom"));

    await waitFor(() => expect(fieldState("item-1:status")?.status).toBe("error"));
    expect(cachedStatus(client)).toBe(ToDo);
  });

  it("clears a previous error when the field is saved again", async () => {
    const failing = deferred<GetItemResponse>();
    const retry = deferred<GetItemResponse>();
    vi.mocked(updateItem).mockReturnValueOnce(failing.promise).mockReturnValueOnce(retry.promise);

    const { result, client } = renderAppContext();
    client.setQueryData(["items", {}], [item("item-1", { status: ToDo })]);

    result.current.items.setField("item-1", "status", Done);
    failing.reject(new Error("boom"));
    await waitFor(() => expect(fieldState("item-1:status")?.status).toBe("error"));

    result.current.items.setField("item-1", "status", Done);

    expect(fieldState("item-1:status")).toEqual({ status: "saving" });

    retry.resolve(item("item-1", { status: Done }));
    await waitFor(() => expect(fieldState("item-1:status")).toBeUndefined());
  });
});
