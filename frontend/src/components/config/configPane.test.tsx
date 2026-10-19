import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ConfigPane from "./configPane";
import { useUiStore } from "../../stores/ui";
import { useKeyMap } from "../../hooks/useKeyMap";
import { getAppContext } from "../../lib/appContext";
import { createConfigPane, createRootPane } from "../../lib/pane/factories";
import type { ConfigPane as ConfigPaneState } from "../../lib/pane/types";
import { defaultConfig, useConfigStore } from "../../lib/config/store";
import { applyKeymap } from "../../lib/keymap/registry";
import { configRows } from "../../lib/config/rows";
import { THEME_TOKENS, type ThemeColors } from "../../lib/theme";

const ui = () => useUiStore.getState();
const config = () => useConfigStore.getState();
const selectedRow = () =>
  (ui().panes[1] as ConfigPaneState | undefined)?.selectedRow;
const row = (id: string) =>
  document.querySelector(`[data-row-id="${id}"]`) as HTMLElement;
const input = () => document.querySelector("textarea") as HTMLTextAreaElement;

const colors = (value = "#111111") =>
  Object.fromEntries(THEME_TOKENS.map((t) => [t, value])) as ThemeColors;

function press(key: string) {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, cancelable: true }),
    );
  });
}

function type(value: string) {
  fireEvent.change(input(), { target: { value } });
  fireEvent.keyDown(input(), { key: "Enter" });
}

function setup(selected: string) {
  const root = createRootPane();
  const pane = createConfigPane("config", selected);
  useUiStore.setState({
    mode: "normal",
    panes: [root, pane],
    activePaneId: pane.id,
  });

  renderHook(() => useKeyMap(getAppContext()));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConfigPane paneId="config" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useConfigStore.setState(defaultConfig());
  localStorage.clear();
});

afterEach(() => {
  applyKeymap({});
  document.documentElement.className = "";
});

describe("ConfigPane", () => {
  it("lists the themes and the keys, without colors for a built-in theme", () => {
    setup("theme:gruvbox");

    expect(screen.getByText("theme")).toBeInTheDocument();
    expect(screen.getByText("keys")).toBeInTheDocument();
    expect(screen.queryByText(/^colors/)).not.toBeInTheDocument();
    expect(row("theme:nord")).toBeInTheDocument();
    expect(row("key:list:down")).toHaveTextContent("j, arrowdown");
    expect(row("theme:gruvbox")).toHaveAttribute("aria-selected", "true");
  });

  it("moves between rows with j, k and G", () => {
    setup("theme:gruvbox");

    press("j");
    expect(selectedRow()).toBe("theme:catppuccin-mocha");

    press("k");
    expect(selectedRow()).toBe("theme:gruvbox");

    press("G");
    expect(selectedRow()).toBe(configRows(config()).at(-1)?.id);
  });

  it("uses a theme on enter", () => {
    setup("theme:nord");

    press("Enter");

    expect(config().theme).toBe("nord");
    expect(document.documentElement.className).toBe("theme-nord");
  });

  it("copies a theme on y and edits its colors live", () => {
    setup("theme:nord");

    press("y");

    expect(selectedRow()).toBe("theme:nord-copy");
    expect(screen.getByText("colors · nord-copy")).toBeInTheDocument();

    act(() => ui().selectRow("config", "color:bg"));
    press("i");
    type("123456");

    expect(config().themes["nord-copy"].bg).toBe("#123456");
    expect(ui().mode).toBe("normal");
    expect(row("color:bg")).toHaveTextContent("#123456");
  });

  it("keeps editing and explains why when a key is already taken, escape restores it", () => {
    setup("key:list:down");

    press("i");
    type("k");

    expect(screen.getByText(/already used by "Move up"/)).toBeInTheDocument();
    expect(ui().mode).toBe("insert");
    expect(config().keymap).toEqual({});

    fireEvent.keyDown(input(), { key: "Escape" });

    expect(ui().mode).toBe("normal");
    expect(screen.queryByText(/already used/)).not.toBeInTheDocument();
    expect(row("key:list:down")).toHaveTextContent("j, arrowdown");
  });

  it("applies a remap right away and r puts the default back", () => {
    setup("key:list:down");

    press("i");
    type("n");

    expect(config().keymap).toEqual({ "list:down": ["n"] });
    expect(row("key:list:down")).toHaveTextContent("ncustom");

    press("r");

    expect(config().keymap).toEqual({});
    expect(row("key:list:down")).toHaveTextContent("j, arrowdown");
  });

  it("renames a custom theme on i and deletes it on d d", () => {
    useConfigStore.setState({ themes: { mine: colors() }, theme: "mine" });
    setup("theme:mine");

    press("i");
    type("night");

    expect(Object.keys(config().themes)).toEqual(["night"]);
    expect(selectedRow()).toBe("theme:night");

    press("d");
    press("d");

    expect(config().themes).toEqual({});
    expect(config().theme).toBe("gruvbox");
    expect(selectedRow()).toBe("theme:gruvbox");
  });

  it("does not offer rename or delete on built-in themes", () => {
    setup("theme:nord");

    press("i");
    press("d");
    press("d");

    expect(ui().mode).toBe("normal");
    expect(row("theme:nord")).toBeInTheDocument();
    expect(input()).toBeNull();
  });
});
