import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "../../../stores/ui";
import { Group, Normal, ToDo, type GetItemResponse } from "../../../types/backend";
import { createListPane } from "../../pane/factories";
import type { ListPane } from "../../pane/types";
import { queryClient } from "../../queryClient";
import type { AppContext } from "../../types";
import { moveCommand } from "./move";

const group = (guid: string, title: string, parent_guid?: string): GetItemResponse => ({
  guid,
  title,
  type: Group,
  status: ToDo,
  priority: Normal,
  tags: [],
  parent_guid,
});

const groups = [group("work", "work"), group("api", "api", "work"), group("home", "home")];

function fakeApp(bulkSetFields = vi.fn().mockResolvedValue(["a"])): AppContext {
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

function setPane(overrides: Partial<ListPane>) {
  const pane: ListPane = {
    ...createListPane("p1", null),
    renderedGuids: ["a", "b"],
    selectedGuid: "a",
    ...overrides,
  };
  useUiStore.setState({ panes: [pane], activePaneId: pane.id });
  return pane;
}

describe("moveCommand", () => {
  beforeEach(() => {
    queryClient.setQueryData(["groups"], groups);
    setPane({});
  });

  it("offers every group when moving a task", () => {
    const options = moveCommand.getOptions!("", { groups });

    expect(options.map((o) => o.value)).toEqual(["work", "work/api", "home"]);
  });

  it("filters the options by what was typed", () => {
    const options = moveCommand.getOptions!("ap", { groups });

    expect(options.map((o) => o.value)).toEqual(["work/api"]);
  });

  it("leaves out the moving group and its subtree", () => {
    setPane({ selectedGuid: "work", renderedGuids: ["work"] });

    const options = moveCommand.getOptions!("", { groups });

    expect(options.map((o) => o.value)).toEqual(["home"]);
  });

  it("moves the marked items into the group", async () => {
    setPane({ markedGuids: new Set(["a", "b"]) });
    const bulkSetFields = vi.fn().mockResolvedValue(["a", "b"]);

    const res = await moveCommand.execute!({ rawArgs: "work/api", app: fakeApp(bulkSetFields) });

    expect(bulkSetFields).toHaveBeenCalledWith(["a", "b"], { parent_guid: "api" });
    expect(res).toEqual({ shouldClearPrompt: true });
  });

  it("moves the selected item when nothing is marked", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue(["a"]);

    await moveCommand.execute!({ rawArgs: "home", app: fakeApp(bulkSetFields) });

    expect(bulkSetFields).toHaveBeenCalledWith(["a"], { parent_guid: "home" });
  });

  it("refuses to move a group into itself", async () => {
    setPane({ selectedGuid: "work", renderedGuids: ["work"] });
    const bulkSetFields = vi.fn();

    const res = await moveCommand.execute!({ rawArgs: "work/api", app: fakeApp(bulkSetFields) });

    expect(res).toEqual({ message: "Can't move a group into itself" });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("asks for a group when none was typed", async () => {
    const res = await moveCommand.execute!({ rawArgs: " ", app: fakeApp() });

    expect(res).toEqual({ message: "Type the group to move into" });
  });

  it("keeps the prompt when the server refuses", async () => {
    const bulkSetFields = vi.fn().mockRejectedValue(new Error("boom"));

    const res = await moveCommand.execute!({ rawArgs: "home", app: fakeApp(bulkSetFields) });

    expect(res).toEqual({ message: "boom" });
  });
});
