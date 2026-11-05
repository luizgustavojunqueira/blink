import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useItems } from "./useItems";
import { getItems } from "../api/items";
import type { GetItemRequest, GetItemResponse } from "../types/backend";

vi.mock("../api/items", () => ({ getItems: vi.fn() }));

const item = (guid: string) => ({ guid }) as GetItemResponse;

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

const mount = (filter: GetItemRequest) =>
  renderHook(({ filter }) => useItems(filter), { wrapper, initialProps: { filter } });

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(getItems).mockReset();
});

describe("useItems", () => {
  it("aborts the request of a filter that was replaced", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(getItems).mockImplementation((_, signal) => {
      signals.push(signal!);
      return new Promise(() => {});
    });

    const hook = mount({ title: "m" });
    await waitFor(() => expect(signals).toHaveLength(1));

    hook.rerender({ filter: { title: "mi" } });
    await waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("keeps showing the previous items while a new filter in the same group loads", async () => {
    vi.mocked(getItems).mockResolvedValueOnce([item("a"), item("b")]);
    const hook = mount({ parent_id: "g1" });
    await waitFor(() => expect(hook.result.current.data).toHaveLength(2));

    vi.mocked(getItems).mockReturnValue(new Promise(() => {}));
    hook.rerender({ filter: { parent_id: "g1", title: "a" } });

    expect(hook.result.current.data).toEqual([item("a"), item("b")]);
  });

  it("does not show another group's items while a group loads", async () => {
    vi.mocked(getItems).mockResolvedValueOnce([item("a")]);
    const hook = mount({ parent_id: "g1" });
    await waitFor(() => expect(hook.result.current.data).toHaveLength(1));

    vi.mocked(getItems).mockReturnValue(new Promise(() => {}));
    hook.rerender({ filter: { parent_id: "g2" } });

    expect(hook.result.current.data).toBeUndefined();
  });
});
