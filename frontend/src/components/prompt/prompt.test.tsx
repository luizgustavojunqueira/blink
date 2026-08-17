import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Prompt from "./prompt";
import { parse } from "../../lib/parser";
import { execute } from "../../lib/executor";
import { parseFilter } from "../../lib/commands/implementations/filter";

vi.mock("../../lib/parser", () => ({
  parse: vi.fn(() => ({ id: "filter", rawArgs: "" })),
}));

vi.mock("../../lib/executor", () => ({
  execute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/commands/implementations/filter", () => ({
  parseFilter: vi.fn(() => ({})),
  filterCommand: { id: "filter", displayName: "/filter", description: "Filter items" },
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

    expect(parse).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(onFilter).toHaveBeenCalledTimes(1);
  });

  it("calls onFilter for the filter command", async () => {
    const filter = { priority: ["high"] };

    vi.mocked(parse).mockReturnValue({ id: "filter", rawArgs: "!high" });
    vi.mocked(parseFilter).mockReturnValue(filter);

    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, {
      target: { value: "!high" },
    });

    fireEvent.keyDown(input, {
      key: "Enter",
    });
    fireEvent.keyDown(input, {
      key: "Enter",
    });

    expect(parse).toHaveBeenCalledWith("!high");
    expect(parseFilter).toHaveBeenCalledWith("!high");
    expect(onFilter).toHaveBeenCalledWith(filter);
    expect(execute).toHaveBeenCalled();
  });

  it("does not call onFilter for a non-filter command", () => {
    vi.mocked(parse).mockReturnValue({ id: "theme", rawArgs: "dark" });

    render(<Prompt onFilter={onFilter} />);

    const input = screen.getByTestId("prompt");

    fireEvent.change(input, {
      target: { value: "/theme dark" },
    });

    fireEvent.keyDown(input, {
      key: "Enter",
    });

    expect(parse).toHaveBeenCalledWith("/theme dark");
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
