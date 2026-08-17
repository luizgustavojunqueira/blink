import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Prompt from "./prompt";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import type { AppContext } from "../../lib/commands/types";

vi.mock("../../lib/parser", () => ({
  parse: vi.fn(() => ({ id: "filter", rawArgs: "" })),
}));

vi.mock("../../lib/executor", () => ({
  execute: vi.fn().mockResolvedValue(undefined),
}));

const app: AppContext = {
  setFilter: vi.fn(),
  setTheme: vi.fn(),
  items: { create: vi.fn() },
};

/**
 * Typing usually opens the autocomplete, which owns Enter (it confirms the
 * highlighted option instead of submitting). Escape closes it, so the next
 * Enter reaches the command dispatch.
 */
function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Escape" });
}

describe("Prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(execute).mockResolvedValue(undefined);
    vi.mocked(parse).mockReturnValue({ id: "filter", rawArgs: "" });
  });

  it("renders input", () => {
    render(<Prompt app={app} />);

    expect(screen.getByTestId("prompt")).toBeInTheDocument();
  });

  it("updates input value", () => {
    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, { target: { value: "!high" } });

    expect(input).toHaveValue("!high");
  });

  it("parses and dispatches on Enter, passing the app context through", () => {
    vi.mocked(parse).mockReturnValue({ id: "filter", rawArgs: "!high" });

    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    type(input, "!high");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(parse).toHaveBeenCalledWith("!high");
    expect(execute).toHaveBeenCalledWith({ id: "filter", rawArgs: "!high" }, app);
  });

  it("dispatches every command through the same path, with no special case for filter", () => {
    vi.mocked(parse).mockReturnValue({ id: "theme", rawArgs: "nord" });

    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    type(input, "/theme nord");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(execute).toHaveBeenCalledWith({ id: "theme", rawArgs: "nord" }, app);
  });

  it("does not filter from the component itself — the command owns that", () => {
    vi.mocked(parse).mockReturnValue({ id: "filter", rawArgs: "!high" });

    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    type(input, "!high");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(app.setFilter).not.toHaveBeenCalled();
  });

  it("lets the open autocomplete keep Enter, instead of dispatching", () => {
    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    fireEvent.change(input, { target: { value: "!hi" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(execute).not.toHaveBeenCalled();
  });

  it("still dispatches on Enter with empty input", () => {
    render(<Prompt app={app} />);

    fireEvent.keyDown(screen.getByTestId("prompt"), { key: "Enter" });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does nothing for keys other than Enter", () => {
    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    type(input, "!high");
    fireEvent.keyDown(input, { key: "a" });

    expect(execute).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("clears the prompt when the command asks for it", async () => {
    vi.mocked(execute).mockResolvedValue({ shouldClearPrompt: true });

    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    type(input, "/theme nord");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByTestId("prompt")).toHaveValue("");
  });

  it("keeps the typed text when the command does not ask to clear", async () => {
    vi.mocked(execute).mockResolvedValue({ message: "Invalid theme" });

    render(<Prompt app={app} />);

    const input = screen.getByTestId("prompt");
    type(input, "/theme banana");
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByText("Invalid theme");
    expect(input).toHaveValue("/theme banana");
  });

  it("shows a thrown error as a message instead of letting it escape", async () => {
    vi.mocked(execute).mockRejectedValue(new Error("network is down"));

    render(<Prompt app={app} />);

    fireEvent.keyDown(screen.getByTestId("prompt"), { key: "Enter" });

    expect(await screen.findByText("network is down")).toBeInTheDocument();
  });

  it("clears a stale message once a later command succeeds", async () => {
    vi.mocked(execute).mockResolvedValueOnce({ message: "Invalid theme" });

    render(<Prompt app={app} />);
    const input = screen.getByTestId("prompt");

    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("Invalid theme");

    vi.mocked(execute).mockResolvedValueOnce({ shouldClearPrompt: true });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.queryByText("Invalid theme")).not.toBeInTheDocument());
  });

  it("shows the message a command returns", async () => {
    vi.mocked(execute).mockResolvedValue({ message: "title is required" });

    render(<Prompt app={app} />);

    fireEvent.keyDown(screen.getByTestId("prompt"), { key: "Enter" });

    expect(await screen.findByText("title is required")).toBeInTheDocument();
  });
});
