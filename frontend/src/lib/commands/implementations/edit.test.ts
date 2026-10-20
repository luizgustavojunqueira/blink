import { describe, expect, it, vi } from "vitest";
import { useUiStore } from "../../../stores/ui";
import { Done, High } from "../../../types/backend";
import { createListPane, createRootPane } from "../../pane/factories";
import type { AppContext } from "../../types";
import { queryContext } from "../../keymap/context";
import { editCommand } from "./edit";

function fakeApp(bulkSetFields = vi.fn().mockResolvedValue(["item-1", "item-2"])): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    config: {} as AppContext["config"],
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      bulkSetFields,
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      undo: vi.fn(),
    },
  };
}

function markItems(...guids: string[]) {
  const pane = createListPane("p1", null);
  pane.markedGuids = new Set(guids);
  useUiStore.setState({ panes: [pane], activePaneId: pane.id });
  return pane;
}

describe("editCommand", () => {
  it("is only available with marked items or a selected item", () => {
    const root = createRootPane();
    const ctx = () => queryContext(useUiStore.getState(), useUiStore.getState().panes[0]);

    useUiStore.setState({ panes: [root], activePaneId: root.id });
    expect(editCommand.when!(ctx())).toBe(false);

    useUiStore.setState({ panes: [{ ...root, selectedGuid: "item-1" }] });
    expect(editCommand.when!(ctx())).toBe(true);

    markItems("item-1");
    expect(editCommand.when!(ctx())).toBe(true);
  });

  it("edits the selected item, title included, when nothing is marked", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue(["item-1"]);
    const root = { ...createRootPane(), selectedGuid: "item-1" };
    useUiStore.setState({ panes: [root], activePaneId: root.id });

    const result = await editCommand.execute!({
      rawArgs: "Buy milk @done",
      app: fakeApp(bulkSetFields),
    });

    expect(bulkSetFields).toHaveBeenCalledWith(
      ["item-1"],
      expect.objectContaining({ title: "Buy milk", status: Done }),
    );
    expect(result).toEqual({ shouldClearPrompt: true });
  });

  it("prefers marked items over the selected one", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue(["item-2"]);
    const pane = markItems("item-2");
    useUiStore.setState({ panes: [{ ...pane, selectedGuid: "item-1" }] });

    await editCommand.execute!({ rawArgs: "@done", app: fakeApp(bulkSetFields) });

    expect(bulkSetFields).toHaveBeenCalledWith(["item-2"], expect.anything());
  });

  it("rejects an attempt to change the type", async () => {
    const bulkSetFields = vi.fn();
    markItems("item-1");

    const result = await editCommand.execute!({ rawArgs: "=group", app: fakeApp(bulkSetFields) });

    expect(result).toEqual({ message: "Can't edit type" });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("rejects when nothing was given to change", async () => {
    const bulkSetFields = vi.fn();
    markItems("item-1");

    const result = await editCommand.execute!({ rawArgs: "", app: fakeApp(bulkSetFields) });

    expect(result).toEqual({ message: "Nothing to edit" });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("only sends the fields that were given", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue(["item-1", "item-2"]);
    markItems("item-1", "item-2");

    const result = await editCommand.execute!({
      rawArgs: "@done #home",
      app: fakeApp(bulkSetFields),
    });

    expect(bulkSetFields).toHaveBeenCalledWith(
      expect.arrayContaining(["item-1", "item-2"]),
      expect.objectContaining({ status: Done, tags: ["home"] }),
    );
    expect(result).toEqual({ shouldClearPrompt: true });
  });

  it("edits title and description when exactly one item is marked", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue(["item-1"]);
    markItems("item-1");

    await editCommand.execute!({
      rawArgs: "Buy oat milk !high $from the corner shop",
      app: fakeApp(bulkSetFields),
    });

    expect(bulkSetFields).toHaveBeenCalledWith(
      ["item-1"],
      expect.objectContaining({
        title: "Buy oat milk",
        description: "from the corner shop",
        priority: High,
      }),
    );
  });

  it("refuses to edit the title of several items at once", async () => {
    const bulkSetFields = vi.fn();
    markItems("item-1", "item-2");

    const result = await editCommand.execute!({
      rawArgs: "Buy oat milk",
      app: fakeApp(bulkSetFields),
    });

    expect(result).toEqual({ message: "Can't edit title of multiple items" });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("refuses to edit the description of several items at once", async () => {
    const bulkSetFields = vi.fn();
    markItems("item-1", "item-2");

    const result = await editCommand.execute!({
      rawArgs: "$from the corner shop",
      app: fakeApp(bulkSetFields),
    });

    expect(result).toEqual({ message: "Can't edit description of multiple items" });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("surfaces an invalid status instead of sending it", async () => {
    const bulkSetFields = vi.fn();
    markItems("item-1");

    const result = await editCommand.execute!({ rawArgs: "@nope", app: fakeApp(bulkSetFields) });

    expect(result).toMatchObject({ message: expect.stringMatching(/invalid status/i) });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("says so when every marked item already matched the patch", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue([]);
    markItems("item-1", "item-2");

    const result = await editCommand.execute!({ rawArgs: "@todo", app: fakeApp(bulkSetFields) });

    expect(bulkSetFields).toHaveBeenCalled();
    expect(result).toEqual({ message: "Nothing changed" });
  });
});
