import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Item from "./item";
import type { GetItemResponse } from "../../types/backend";

const makeItem = (
  overrides: Partial<GetItemResponse> = {},
): GetItemResponse => ({
  guid: "1",
  title: "Test item",
  description: "description",
  type: "TASK",
  status: "TODO",
  priority: "NORMAL",
  tags: [],
  ...overrides,
});

describe("Item", () => {
  it("renders title", () => {
    render(<Item item={makeItem()} paneId="root" />);

    expect(screen.getByText("Test item")).toBeInTheDocument();
  });

  it("renders PROG for IN_PROGRESS status", () => {
    render(
      <Item
        item={makeItem({
          status: "IN_PROGRESS",
        })}

        paneId="root"
      />,
    );

    expect(screen.getByText("PROG")).toBeInTheDocument();
  });

  it("does not render NORMAL priority", () => {
    render(
      <Item
        item={makeItem({
          priority: "NORMAL",
        })}

        paneId="root"
      />,
    );

    expect(screen.queryByText("NORMAL")).not.toBeInTheDocument();
  });

  it("renders priority when not NORMAL", () => {
    render(
      <Item
        item={makeItem({
          priority: "HIGH",
        })}

        paneId="root"
      />,
    );

    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders group icon for GROUP items", () => {
    render(
      <Item
        item={makeItem({
          type: "GROUP",
        })}

        paneId="root"
      />,
    );

    expect(screen.getByText("▸")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(
      <Item
        item={makeItem({
          tags: ["work", "urgent"],
        })}

        paneId="root"
      />,
    );

    expect(screen.getByText("#work")).toBeInTheDocument();
    expect(screen.getByText("#urgent")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(
      <Item
        item={makeItem({
          description: "Some description",
        })}

        paneId="root"
      />,
    );

    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("applies line-through for completed items", () => {
    render(
      <Item
        item={makeItem({
          status: "DONE",
        })}

        paneId="root"
      />,
    );

    expect(screen.getByText("Test item")).toHaveClass("line-through");
  });
});

describe("Item due date", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dueLabel = (overrides: Partial<GetItemResponse>) => {
    render(<Item item={makeItem(overrides)} paneId="root" />);
    return screen.queryByTitle(overrides.due_date ?? "none");
  };

  it("shows nothing when the item has no due date", () => {
    render(<Item item={makeItem()} paneId="root" />);
    expect(screen.queryByText("today")).not.toBeInTheDocument();
  });

  it("shows a short relative label", () => {
    expect(dueLabel({ due_date: "2026-11-19" })).toHaveTextContent("tomorrow");
  });

  it("highlights overdue items", () => {
    expect(dueLabel({ due_date: "2026-11-10" })).toHaveClass("text-urgent");
  });

  it("highlights items due today", () => {
    expect(dueLabel({ due_date: "2026-11-18" })).toHaveClass("text-high");
  });

  it("mutes the due date of finished items", () => {
    expect(dueLabel({ due_date: "2026-11-10", status: "DONE" })).toHaveClass("text-fg-muted");
  });
});
