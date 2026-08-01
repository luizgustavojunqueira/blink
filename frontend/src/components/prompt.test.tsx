import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Prompt from "./prompt";
import { parse } from "../lib/parser";
import { execute } from "../lib/executor";

vi.mock("../lib/parser", () => ({
  parse: vi.fn(() => ({ type: "FILTER", data: {} })),
}));

vi.mock("../lib/executor", () => ({
  execute: vi.fn().mockResolvedValue(undefined),
}));

describe("Prompt", () => {
  const onFilter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input", () => {
    render(<Prompt onFilter={onFilter} />);

    expect(screen.getByTestId("prompt")).toBeInTheDocument();
  });

  it("updates input value", () => {
    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, {
      target: { value: "!high" },
    });

    expect(input).toHaveValue("!high");
  });

  it("does nothing when pressing Enter with empty input", () => {
    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.keyDown(input, {
      key: "Enter",
    });

    expect(parse).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(onFilter).not.toHaveBeenCalled();
  });

  it("calls onFilter for FILTER command", async () => {
    const filter = { priority: ["HIGH"] };

    vi.mocked(parse).mockReturnValue({
      type: "FILTER",
      data: filter,
    } as any);

    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, {
      target: { value: "!high" },
    });

    fireEvent.keyDown(input, {
      key: "Enter",
    });

    expect(parse).toHaveBeenCalledWith("!high");
    expect(onFilter).toHaveBeenCalledWith(filter);
    expect(execute).toHaveBeenCalled();
  });

  it("does not call onFilter for non-filter command", () => {
    vi.mocked(parse).mockReturnValue({
      type: "HELP",
    } as any);

    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, {
      target: { value: "help" },
    });

    fireEvent.keyDown(input, {
      key: "Enter",
    });

    expect(parse).toHaveBeenCalledWith("help");
    expect(onFilter).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
  });

  it("does nothing for keys other than Enter", () => {
    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, {
      target: { value: "!high" },
    });

    fireEvent.keyDown(input, {
      key: "a",
    });

    expect(execute).not.toHaveBeenCalled();
    expect(onFilter).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
