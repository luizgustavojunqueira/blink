import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Hint from "./hint";
import { useUiStore } from "../../stores/ui";
import { createDetailPane, createRootPane } from "../../lib/pane/factories";
import type { DetailField } from "../../lib/pane/types";

function useMockApp() {
  return {
    ui: useUiStore(),
    setTheme: vi.fn(),
    items: { findItem: vi.fn(), setField: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
}

vi.mock("../../hooks/useAppContext", () => ({
  useAppContext: () => useMockApp(),
}));

function seedList() {
  const root = createRootPane();
  root.selectedId = "item-1";
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
}

function seedDetail(selectedField: DetailField) {
  const root = createRootPane();
  const detail = { ...createDetailPane("d1", root.id, "item-1"), selectedField };
  useUiStore.setState({ mode: "normal", panes: [root, detail], activePaneId: "d1" });
}

describe("Hint", () => {
  beforeEach(() => {
    seedList();
  });

  it("shows the group header for the available bindings", () => {
    render(<Hint />);
    expect(screen.getByText("nav")).toBeInTheDocument();
  });

  it("joins multiple keys with / and replaces arrow key names with symbols", () => {
    render(<Hint />);
    expect(screen.getByText("j/↓")).toBeInTheDocument();
  });

  it("shows the binding's description next to its keys", () => {
    render(<Hint />);
    expect(screen.getByText("Move down")).toBeInTheDocument();
  });

  it("falls back to misc for a binding with no hint group", () => {
    render(<Hint />);
    expect(screen.getByText("misc")).toBeInTheDocument();
    expect(screen.getByText("Escape")).toBeInTheDocument();
  });

  it("hides normal-mode-only bindings while in insert mode, but keeps global ones", () => {
    useUiStore.setState({ mode: "insert" });

    render(<Hint />);

    expect(screen.queryByText("Move down")).not.toBeInTheDocument();
    expect(screen.getByText("Escape")).toBeInTheDocument();
  });

  it("renders the empty shell without crashing when there is no active pane", () => {
    useUiStore.setState({ panes: [], activePaneId: "missing" });

    render(<Hint />);

    expect(screen.queryByText("nav")).not.toBeInTheDocument();
  });

  it("shows the detail pane's own hints instead of the list pane's, once it is active", () => {
    seedDetail("status");

    render(<Hint />);

    expect(screen.getByText("Next field")).toBeInTheDocument();
    expect(screen.queryByText("Move down")).not.toBeInTheDocument();
  });
});
