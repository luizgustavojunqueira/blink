import { describe, expect, it, vi, beforeEach } from "vitest";
import { prefixKeyBindings } from "./insertMode";
import { useUiStore } from "../../../stores/ui";
import { createRootPane } from "../../pane/factories";
import type { AppContext } from "../../types";
import type { KeyContext } from "../types";

const byId = Object.fromEntries(prefixKeyBindings.map((b) => [b.id, b]));

function ctx(): KeyContext {
  const app: AppContext = {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: { findItem: vi.fn(), setStatus: vi.fn(), setPriority: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return { app, pane: app.ui.panes[0] };
}

beforeEach(() => {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
});

describe("insertPrefix", () => {
  it("seeds the prompt with the key that fired it", () => {
    byId["insertPrefix"].run(ctx(), "@");

    const store = useUiStore.getState();
    expect(store.mode).toBe("insert");
    expect(store.panes[0].prompt).toBe("@");
  });

  it("appends the prefix to what is already typed", () => {
    useUiStore.setState((s) => ({ panes: [{ ...s.panes[0], prompt: "buy " }] }));

    byId["insertPrefix"].run(ctx(), "#");

    expect(useUiStore.getState().panes[0].prompt).toBe("buy #");
  });
});

describe("insertMode", () => {
  it("enters insert without seeding anything", () => {
    useUiStore.setState((s) => ({ panes: [{ ...s.panes[0], prompt: "buy" }] }));

    byId["insertMode"].run(ctx(), "i");

    const store = useUiStore.getState();
    expect(store.mode).toBe("insert");
    expect(store.panes[0].prompt).toBe("buy");
  });
});
