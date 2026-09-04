import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Hint from "./hint";
import { useUiStore } from "../../stores/ui";
import { createRootPane } from "../../lib/pane/factories";
import { availableKeys, type AvailableBinding } from "../../lib/keymap/registry";

vi.mock("../../lib/keymap/registry", () => ({
  availableKeys: vi.fn(() => []),
}));

vi.mock("../../hooks/useAppContext", () => ({
  useAppContext: () => ({
    ui: useUiStore(),
    setTheme: vi.fn(),
    items: { findItem: vi.fn(), setField: vi.fn(), create: vi.fn(), update: vi.fn() },
  }),
}));

const mockedAvailableKeys = vi.mocked(availableKeys);

function entry(id: string, keys: string[], group: string, description: string): AvailableBinding {
  return { binding: { id, description }, keys, group } as AvailableBinding;
}

function show(...entries: AvailableBinding[]) {
  mockedAvailableKeys.mockReturnValue(entries);
  return render(<Hint />);
}

describe("Hint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const pane = createRootPane();
    useUiStore.setState({ mode: "normal", panes: [pane], activePaneId: pane.id, showHint: true });
  });

  it("heads each group with its name", () => {
    show(entry("a", ["j"], "nav", "Move down"), entry("b", ["escape"], "misc", "Escape"));

    expect(screen.getByText("nav")).toBeInTheDocument();
    expect(screen.getByText("misc")).toBeInTheDocument();
  });

  it("shows the binding's description next to its keys", () => {
    show(entry("a", ["j"], "nav", "Move down"));

    expect(screen.getByText("j")).toBeInTheDocument();
    expect(screen.getByText("Move down")).toBeInTheDocument();
  });

  it("joins the alternative keys of one binding with a slash", () => {
    show(entry("a", ["j", "n"], "nav", "Move down"));

    expect(screen.getByText("j/n")).toBeInTheDocument();
  });

  it("renders arrow keys as symbols instead of their event names", () => {
    show(entry("a", ["arrowup", "arrowdown"], "nav", "Move"));
    expect(screen.getByText("↑/↓")).toBeInTheDocument();

    show(entry("b", ["arrowleft", "arrowright"], "nav", "Pane"));
    expect(screen.getByText("←/→")).toBeInTheDocument();
  });

  it("collapses a multi-key sequence into one label, apart from the alternatives", () => {
    show(entry("a", ["g g", "home"], "nav", "Move to top"));

    expect(screen.getByText("gg/home")).toBeInTheDocument();
  });

  it("keeps bindings of the same group together under a single header", () => {
    show(entry("a", ["j"], "nav", "Move down"), entry("b", ["k"], "nav", "Move up"));

    expect(screen.getAllByText("nav")).toHaveLength(1);
    expect(screen.getByText("Move down")).toBeInTheDocument();
    expect(screen.getByText("Move up")).toBeInTheDocument();
  });

  it("renders nothing while the hint is toggled off", () => {
    useUiStore.setState({ showHint: false });

    const { container } = show(entry("a", ["j"], "nav", "Move down"));

    expect(container.innerHTML).toBe("");
  });

  it("asks for no bindings at all when there is no active pane", () => {
    useUiStore.setState({ panes: [], activePaneId: "missing" });

    show(entry("a", ["j"], "nav", "Move down"));

    expect(mockedAvailableKeys).not.toHaveBeenCalled();
    expect(screen.queryByText("nav")).not.toBeInTheDocument();
  });
});
