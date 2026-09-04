import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventToKey, useKeyMap } from "./useKeyMap";
import { useUiStore } from "../stores/ui";
import type { AppContext } from "../lib/types";
import { Done } from "../types/backend";
import { createRootPane } from "../lib/pane/factories";
import type { ListPane } from "../lib/pane/types";

function firstPane(): ListPane {
  return useUiStore.getState().panes[0] as ListPane;
}

function makeApp() {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  } as AppContext;
}

function press(key: string, init: KeyboardEventInit = {}) {
  return window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, ...init }));
}

function seedRoot(renderedIds: string[] = [], selectedId: string | null = null) {
  const pane = createRootPane();
  pane.renderedIds = renderedIds;
  pane.selectedId = selectedId;
  useUiStore.setState({ mode: "normal", panes: [pane], activePaneId: pane.id });
  return pane;
}

describe("eventToKey", () => {
  it("passes single characters through untouched", () => {
    expect(eventToKey(new KeyboardEvent("keydown", { key: "j" }))).toBe("j");
    expect(eventToKey(new KeyboardEvent("keydown", { key: "#" }))).toBe("#");
  });

  it("lowercases the named keys", () => {
    expect(eventToKey(new KeyboardEvent("keydown", { key: "ArrowDown" }))).toBe("arrowdown");
    expect(eventToKey(new KeyboardEvent("keydown", { key: "Escape" }))).toBe("escape");
  });

  it("prefixes the modifiers in a fixed order", () => {
    const event = new KeyboardEvent("keydown", {
      key: "d",
      ctrlKey: true,
      altKey: true,
      metaKey: true,
    });

    expect(eventToKey(event)).toBe("ctrl+alt+meta+d");
  });

  it("combines a modifier with a named key", () => {
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      ctrlKey: true,
    });

    expect(eventToKey(event)).toBe("ctrl+arrowdown");
  });

  it("names the space key instead of returning it raw, so it cannot pass for a separator", () => {
    expect(eventToKey(new KeyboardEvent("keydown", { key: " " }))).toBe("space");
    expect(eventToKey(new KeyboardEvent("keydown", { key: " ", ctrlKey: true }))).toBe("ctrl+space");
  });

  it("drops shift for single characters, since the key already carries it", () => {
    const event = new KeyboardEvent("keydown", { key: "A", shiftKey: true });

    expect(eventToKey(event)).toBe("A");
  });

  it("keeps shift for named keys", () => {
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      shiftKey: true,
    });

    expect(eventToKey(event)).toBe("shift+arrowdown");
  });
});

describe("useKeyMap", () => {
  beforeEach(() => {
    seedRoot();
  });

  it("runs the binding of the pressed key against the app context", () => {
    seedRoot(["item-1"], "item-1");
    const app = makeApp();

    renderHook(() => useKeyMap(app));
    press("3");

    expect(app.items.setField).toHaveBeenCalledWith("item-1", "status", Done);
  });

  it("moves the selection through the real store", () => {
    seedRoot(["a", "b"]);

    renderHook(() => useKeyMap(makeApp()));
    press("j");

    expect(firstPane().selectedId).toBe("a");

    press("j");

    expect(firstPane().selectedId).toBe("b");
  });

  it("reads the mode from the store, not from the app it was mounted with", () => {
    seedRoot(["a", "b"]);

    renderHook(() => useKeyMap(makeApp()));
    useUiStore.setState({ mode: "insert" });
    press("j");

    expect(firstPane().selectedId).toBeNull();
  });

  it("dispatches to the latest app after a rerender", () => {
    seedRoot(["item-1"], "item-1");
    const first = makeApp();
    const second = makeApp();

    const { rerender } = renderHook(({ app }) => useKeyMap(app), {
      initialProps: { app: first },
    });
    rerender({ app: second });
    press("3");

    expect(first.items.setField).not.toHaveBeenCalled();
    expect(second.items.setField).toHaveBeenCalledWith("item-1", "status", Done);
  });

  it("prevents the default of a handled key", () => {
    seedRoot(["a"]);

    renderHook(() => useKeyMap(makeApp()));

    expect(press("j")).toBe(false);
  });

  it("leaves an unbound key to the browser", () => {
    renderHook(() => useKeyMap(makeApp()));

    expect(press("z")).toBe(true);
  });

  it("stops listening once unmounted", () => {
    seedRoot(["a", "b"]);

    const { unmount } = renderHook(() => useKeyMap(makeApp()));
    unmount();
    press("j");

    expect(firstPane().selectedId).toBeNull();
  });

  it("does not swallow the next key after an unbound one", () => {
    seedRoot(["a", "b"]);

    renderHook(() => useKeyMap(makeApp()));
    press("d");
    press("j");

    expect(firstPane().selectedId).toBe("a");
  });

  it("restarts the sequence instead of losing the key that broke it", () => {
    seedRoot(["a", "b"]);

    renderHook(() => useKeyMap(makeApp()));
    press("g");
    press("j");

    expect(firstPane().selectedId).toBe("a");
  });

  it("handles double key key bindings", () => {
    seedRoot(["a", "b", "c"], "c");

    renderHook(() => useKeyMap(makeApp()));
    press("g");
    press("g");

    expect(firstPane().selectedId).toBe("a");

    press("G");

    expect(firstPane().selectedId).toBe("c");
  });
});
