import { describe, expect, it, vi } from "vitest";
import { useUiStore } from "../../../stores/ui";
import { createListPane, createRootPane } from "../../pane/factories";
import type { AppContext } from "../../types";
import { groupCommand } from "./group";

function fakeApp(
  create = vi.fn().mockResolvedValue({ guid: "new-group-id" }),
  bulkSetField = vi.fn().mockResolvedValue(undefined),
): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      bulkSetField,
      create,
      update: vi.fn(),
    },
  };
}

describe("groupCommand", () => {
  it("rejects when no items are marked", async () => {
    const create = vi.fn();
    const bulkSetField = vi.fn();
    const root = createRootPane();
    useUiStore.setState({ panes: [root], activePaneId: root.id });

    const result = await groupCommand.execute!({
      rawArgs: "My Group",
      app: fakeApp(create, bulkSetField),
    });

    expect(result).toEqual({ message: "Mark at least one item" });
    expect(create).not.toHaveBeenCalled();
    expect(bulkSetField).not.toHaveBeenCalled();
  });

  it("rejects when title is missing", async () => {
    const create = vi.fn();
    const pane = createListPane("p1", null);
    pane.markedIds = new Set(["item-1"]);
    useUiStore.setState({ panes: [pane], activePaneId: pane.id });

    const result = await groupCommand.execute!({
      rawArgs: "",
      app: fakeApp(create),
    });

    expect(result).toMatchObject({ message: expect.stringMatching(/title is required/i) });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a group and bulk-reparents marked items", async () => {
    const createdGroup = { guid: "group-123", title: "Squad" };
    const create = vi.fn().mockResolvedValue(createdGroup);
    const bulkSetField = vi.fn().mockResolvedValue(undefined);

    const pane = createListPane("p1", "parent-folder");
    pane.markedIds = new Set(["item-1", "item-2"]);
    useUiStore.setState({ panes: [pane], activePaneId: pane.id });

    const result = await groupCommand.execute!({
      rawArgs: "Squad",
      app: fakeApp(create, bulkSetField),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Squad",
        type: "GROUP",
        parent_guid: "parent-folder",
      }),
    );

    expect(bulkSetField).toHaveBeenCalledWith(
      expect.arrayContaining(["item-1", "item-2"]),
      "parent_guid",
      "group-123",
    );

    const updatedPane = useUiStore.getState().panes.find((p) => p.id === "p1");
    expect(updatedPane?.markedIds.size).toBe(0);
    expect(updatedPane?.selectedId).toBe("group-123");

    expect(result).toEqual({ shouldClearPrompt: true });
  });
});
