import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Prompt from "./prompt";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import { COMMAND_PREFIX } from "../../lib/commands/registry";
import { useUiStore } from "../../stores/ui";
import { createRootPane } from "../../lib/pane/factories";

vi.mock("../../lib/parser", () => ({
  parse: vi.fn(() => ({ id: "filter", rawArgs: "" })),
}));

vi.mock("../../lib/executor", () => ({
  execute: vi.fn().mockResolvedValue(undefined),
}));

const mockApp = vi.hoisted(() => ({
  value: undefined as unknown,
}));

vi.mock("../../hooks/useAppContext", () => ({
  useAppContext: () => mockApp.value,
}));

const mockHelper = vi.hoisted(() => ({ isOpen: false }));

vi.mock("../../hooks/promptHelper/usePromptHelper", () => ({
  usePromptHelper: () => ({
    options: [],
    selectedIndex: 0,
    isOpen: mockHelper.isOpen,
    update: vi.fn(),
    onKeyDown: () => mockHelper.isOpen,
    onSelect: vi.fn(),
    setSelectedIndex: vi.fn(),
  }),
}));

const ROOT_ID = "root";

function seedRoot(mode: "insert" | "normal" = "insert") {
  const pane = createRootPane();
  useUiStore.setState({ mode, panes: [pane], activePaneId: pane.id });
  mockApp.value = {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: { setField: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return pane;
}

function type(value: string) {
  fireEvent.change(screen.getByTestId("prompt"), { target: { value } });
}

describe("Prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHelper.isOpen = false;
    seedRoot();
    vi.mocked(execute).mockResolvedValue(undefined);
    vi.mocked(parse).mockReturnValue({ id: "filter", rawArgs: "" });
  });

  it("renders input", () => {
    render(<Prompt paneId={ROOT_ID} />);

    expect(screen.getByTestId("prompt")).toBeInTheDocument();
  });

  it("updates input value", () => {
    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, { target: { value: "!high" } });

    expect(input).toHaveValue("!high");
  });

  it("parses and dispatches on Enter, passing the app context through", async () => {
    vi.mocked(parse).mockReturnValue({ id: "filter", rawArgs: "!high" });

    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");
    type("!high");
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(parse).toHaveBeenCalledWith("!high");
    expect(execute).toHaveBeenCalledWith({ id: "filter", rawArgs: "!high" }, expect.any(Object));
  });

  it("dispatches every command through the same path, with no special case for filter", async () => {
    vi.mocked(parse).mockReturnValue({ id: "theme", rawArgs: "nord" });

    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");
    type(`${COMMAND_PREFIX}theme nord`);
    await act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(execute).toHaveBeenCalledWith({ id: "theme", rawArgs: "nord" }, expect.any(Object));
  });

  it("lets the open autocomplete keep Enter, instead of dispatching", () => {
    mockHelper.isOpen = true;

    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");
    fireEvent.change(input, { target: { value: "!hi" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(execute).not.toHaveBeenCalled();
  });

  it("still dispatches on Enter with empty input", () => {
    render(<Prompt paneId={ROOT_ID} />);

    fireEvent.keyDown(screen.getByTestId("prompt"), { key: "Enter" });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does nothing for keys other than Enter", () => {
    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");
    type("!high");
    fireEvent.keyDown(input, { key: "a" });

    expect(execute).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(0);
  });

  it("clears the prompt when the command asks for it", async () => {
    vi.mocked(execute).mockResolvedValue({ shouldClearPrompt: true });

    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");
    type(`${COMMAND_PREFIX}theme nord`);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByTestId("prompt")).toHaveValue("");
  });

  it("keeps the typed text when the command does not ask to clear", async () => {
    vi.mocked(execute).mockResolvedValue({ message: "Invalid theme" });

    render(<Prompt paneId={ROOT_ID} />);

    const input = screen.getByTestId("prompt");
    type(`${COMMAND_PREFIX}theme banana`);
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByText("Invalid theme");
    expect(input).toHaveValue(`${COMMAND_PREFIX}theme banana`);
  });

  it("shows a thrown error as a message instead of letting it escape", async () => {
    vi.mocked(execute).mockRejectedValue(new Error("network is down"));

    render(<Prompt paneId={ROOT_ID} />);

    fireEvent.keyDown(screen.getByTestId("prompt"), { key: "Enter" });

    expect(await screen.findByText("network is down")).toBeInTheDocument();
  });

  it("clears a stale message once a later command succeeds", async () => {
    vi.mocked(execute).mockResolvedValueOnce({ message: "Invalid theme" });

    render(<Prompt paneId={ROOT_ID} />);
    const input = screen.getByTestId("prompt");

    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("Invalid theme");

    vi.mocked(execute).mockResolvedValueOnce({ shouldClearPrompt: true });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.queryByText("Invalid theme")).not.toBeInTheDocument());
  });

  it("shows the message a command returns", async () => {
    vi.mocked(execute).mockResolvedValue({ message: "title is required" });

    render(<Prompt paneId={ROOT_ID} />);

    fireEvent.keyDown(screen.getByTestId("prompt"), { key: "Enter" });

    expect(await screen.findByText("title is required")).toBeInTheDocument();
  });
});
