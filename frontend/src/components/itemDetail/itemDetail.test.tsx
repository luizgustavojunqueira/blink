import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import ItemDetail from "./itemDetail";
import { useUiStore } from "../../stores/ui";
import { createDetailPane, createRootPane } from "../../lib/pane/factories";
import type { DetailField } from "../../lib/pane/types";
import type { GetItemResponse } from "../../types/backend";

const mockItems = vi.hoisted(() => ({
  findItem: vi.fn(),
  setField: vi.fn(),
}));

vi.mock("../../hooks/useItems", () => ({
  useTags: () => ({ data: [] }),
  useItem: (guid: string) => mockItems.findItem(guid),
}));

vi.mock("../../lib/appContext", () => ({
  getItemActions: () => ({
    findItem: mockItems.findItem,
    setField: mockItems.setField,
    create: vi.fn(),
    update: vi.fn(),
  }),
}));

const DETAIL_ID = "d1";

function makeItem(overrides: Partial<GetItemResponse> = {}): GetItemResponse {
  return {
    guid: "item-1",
    title: "Buy milk",
    description: "2% please",
    type: "TASK",
    status: "TODO",
    priority: "NORMAL",
    tags: ["home", "urgent"],
    ...overrides,
  };
}

function seed(
  selectedField: DetailField,
  mode: "insert" | "normal" = "normal",
  item: GetItemResponse = makeItem(),
) {
  const root = createRootPane();
  const detail = { ...createDetailPane(DETAIL_ID, item.guid), selectedField };
  useUiStore.setState({ mode, panes: [root, detail], activePaneId: DETAIL_ID });
  mockItems.findItem.mockReturnValue(item);
  return item;
}

describe("ItemDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed("title");
  });

  it("renders nothing when the item is not found", () => {
    mockItems.findItem.mockReturnValue(undefined);

    const { container } = render(<ItemDetail paneId={DETAIL_ID} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders the item's type, title, description and tags", () => {
    render(<ItemDetail paneId={DETAIL_ID} />);

    expect(screen.getByText("TASK")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Buy milk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2% please")).toBeInTheDocument();
    expect(screen.getByDisplayValue("#home #urgent")).toBeInTheDocument();
  });

  it("highlights the row of the currently selected field", () => {
    seed("description");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const descRow = screen.getByDisplayValue("2% please").closest("div[class*='flex-row']");
    expect(descRow).toHaveClass("bg-bg-soft");

    const titleRow = screen.getByDisplayValue("Buy milk").closest("div[class*='flex-row']");
    expect(titleRow).not.toHaveClass("bg-bg-soft");
  });

  it("sets the status via a pill click", () => {
    const item = seed("status");
    render(<ItemDetail paneId={DETAIL_ID} />);

    fireEvent.click(screen.getByText("PROG"));

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "status", "IN_PROGRESS");
  });

  it("sets the priority via a pill click", () => {
    const item = seed("priority");
    render(<ItemDetail paneId={DETAIL_ID} />);

    fireEvent.click(screen.getByText("HIGH"));

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "priority", "HIGH");
  });

  it("enters insert mode on the clicked field, seeded from the item", () => {
    render(<ItemDetail paneId={DETAIL_ID} />);

    fireEvent.click(screen.getByDisplayValue("2% please"));

    const store = useUiStore.getState();
    expect(store.mode).toBe("insert");
    expect((store.panes[1] as { selectedField: DetailField }).selectedField).toBe("description");
  });

  it("commits the title on Enter", () => {
    const item = seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "title", "Buy oat milk");
  });

  it("does not commit when the title is unchanged", () => {
    seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    fireEvent.keyDown(screen.getByDisplayValue("Buy milk"), { key: "Enter" });

    expect(mockItems.setField).not.toHaveBeenCalled();
  });

  it("reverts to the saved title on Escape, instead of saving", () => {
    seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    fireEvent.change(input, { target: { value: "something else" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByDisplayValue("Buy milk")).toBeInTheDocument();
    expect(mockItems.setField).not.toHaveBeenCalled();
  });

  it("refuses to save an empty title, reverting instead", () => {
    const item = seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue(item.title);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems.setField).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue(item.title)).toBeInTheDocument();
  });

  it("commits the title on blur", () => {
    const item = seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.blur(input);

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "title", "Buy oat milk");
  });

  it("does nothing on blur when nothing changed", () => {
    seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    fireEvent.blur(screen.getByDisplayValue("Buy milk"));

    expect(mockItems.setField).not.toHaveBeenCalled();
  });

  it("normalizes and filters tags on commit: strips stray text, collapses repeated #", () => {
    const item = seed("tags", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("#home #urgent");
    fireEvent.change(input, { target: { value: "#home ###urgent stray text" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "tags", ["home", "urgent"]);
  });

  it("inserts a literal newline in the description on Ctrl+Enter, instead of committing", () => {
    seed("description", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("2% please") as HTMLTextAreaElement;
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    expect(mockItems.setField).not.toHaveBeenCalled();
    expect(input.value).toBe("2% please\n");
  });

  it("inserts a literal newline in the description on Alt+Enter too", () => {
    seed("description", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("2% please") as HTMLTextAreaElement;
    fireEvent.keyDown(input, { key: "Enter", altKey: true });

    expect(mockItems.setField).not.toHaveBeenCalled();
    expect(input.value).toBe("2% please\n");
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Alt", { altKey: true }],
    ["Meta", { metaKey: true }],
  ])("commits the singleLine title on %s+Enter, never splicing a raw newline into it", (_, mod) => {
    const item = seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.keyDown(input, { key: "Enter", ...mod });

    expect(input.value).not.toContain("\n");
    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "title", "Buy oat milk");
  });
});

describe("ItemDetail: save state", () => {
  const valueRow = (label: string) => screen.getByText(label).parentElement!.nextElementSibling;

  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ fieldStates: {} });
  });

  it("sends the same draft only once when Enter is followed by a blur", () => {
    seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    expect(mockItems.setField).toHaveBeenCalledTimes(1);
  });

  it("sends again when the draft changes after a save", () => {
    const item = seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: "Buy soy milk" } });
    fireEvent.blur(input);

    expect(mockItems.setField).toHaveBeenCalledTimes(2);
    expect(mockItems.setField).toHaveBeenLastCalledWith(item.guid, "title", "Buy soy milk");
  });

  it("lets the same draft be sent again after re-entering the field", () => {
    seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems.setField).toHaveBeenCalledTimes(2);
  });

  it("labels a field as unsaved while its draft differs from the saved value", () => {
    seed("title", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("Buy milk");
    expect(screen.queryByText("● unsaved")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Buy oat milk" } });

    expect(screen.getByText("● unsaved")).toBeInTheDocument();
    expect(valueRow("● unsaved")).toHaveClass("outline-accent");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByText("● unsaved")).not.toBeInTheDocument();
  });

  it("labels a field as saving and glows its border while the request is in flight", () => {
    useUiStore.setState({ fieldStates: { "item-1:status": { status: "saving" } } });
    render(<ItemDetail paneId={DETAIL_ID} />);

    expect(screen.getAllByText("● saving")).toHaveLength(1);
    expect(valueRow("● saving")).toHaveClass("outline-accent", "shadow-[0_0_8px_var(--accent)]");
  });

  it("shows the error message and a danger border when the save failed", () => {
    useUiStore.setState({
      fieldStates: { "item-1:priority": { status: "error", message: "boom" } },
    });
    render(<ItemDetail paneId={DETAIL_ID} />);

    expect(screen.getByText("● failed: boom")).toBeInTheDocument();
    expect(valueRow("● failed: boom")).toHaveClass("outline-danger");
    expect(screen.queryByText("● saving")).not.toBeInTheDocument();
  });
});

describe("ItemDetail due date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the saved date with how far away it is", () => {
    seed("title", "normal", makeItem({ due_date: "2026-11-20" }));
    render(<ItemDetail paneId={DETAIL_ID} />);

    expect(screen.getByText("due")).toBeInTheDocument();
    expect(screen.getByText("fri 20 nov 2026 · in 2 days")).toBeInTheDocument();
  });

  it("saves a relative date as YYYY-MM-DD", () => {
    const item = seed("due_date", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByPlaceholderText("today, fri, +3, 26/11");
    fireEvent.change(input, { target: { value: "tomorrow" } });
    expect(screen.getByText("thu 19 nov 2026 · tomorrow")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "due_date", "2026-11-19");
  });

  it("clears the date when emptied", () => {
    const item = seed("due_date", "insert", makeItem({ due_date: "2026-11-20" }));
    render(<ItemDetail paneId={DETAIL_ID} />);

    const input = screen.getByDisplayValue("2026-11-20");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockItems.setField).toHaveBeenCalledWith(item.guid, "due_date", "");
  });

  it("warns about a date it can't read", () => {
    seed("due_date", "insert");
    render(<ItemDetail paneId={DETAIL_ID} />);

    fireEvent.change(screen.getByPlaceholderText("today, fri, +3, 26/11"), { target: { value: "soon" } });

    expect(screen.getByText(/unrecognized date/)).toBeInTheDocument();
  });
});
