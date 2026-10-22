import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "../../../stores/ui";
import { Archived, Done, Normal, Task, ToDo, type GetItemResponse } from "../../../types/backend";
import { createListPane } from "../../pane/factories";
import type { ListPane } from "../../pane/types";
import type { AppContext } from "../../types";
import { archiveCommand } from "./archive";

const item = (guid: string, status: string): GetItemResponse => ({
  guid,
  title: guid,
  type: Task,
  status,
  priority: Normal,
  tags: [],
});

const items = [item("a", Done), item("b", ToDo), item("c", Done)];

function fakeApp(bulkSetFields = vi.fn().mockResolvedValue(["a", "c"])): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    config: {} as AppContext["config"],
    items: {
      findItem: (guid: string) => items.find((i) => i.guid === guid),
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
    renderedGuids: ["a", "b", "c"],
    ...overrides,
  };
  useUiStore.setState({ panes: [pane], activePaneId: pane.id });
}

describe("archiveCommand", () => {
  beforeEach(() => setPane({}));

  it("archives every done item in the list", async () => {
    const bulkSetFields = vi.fn().mockResolvedValue(["a", "c"]);

    const res = await archiveCommand.execute!({ rawArgs: "", app: fakeApp(bulkSetFields) });

    expect(bulkSetFields).toHaveBeenCalledWith(["a", "c"], { status: Archived });
    expect(res).toEqual({ shouldClearPrompt: true });
  });

  it("only looks at the marked items when there are any", async () => {
    setPane({ markedGuids: new Set(["b", "c"]) });
    const bulkSetFields = vi.fn().mockResolvedValue(["c"]);

    await archiveCommand.execute!({ rawArgs: "", app: fakeApp(bulkSetFields) });

    expect(bulkSetFields).toHaveBeenCalledWith(["c"], { status: Archived });
  });

  it("says so when nothing is done", async () => {
    setPane({ renderedGuids: ["b"] });
    const bulkSetFields = vi.fn();

    const res = await archiveCommand.execute!({ rawArgs: "", app: fakeApp(bulkSetFields) });

    expect(res).toEqual({ message: "No done items to archive" });
    expect(bulkSetFields).not.toHaveBeenCalled();
  });

  it("keeps the prompt when the server refuses", async () => {
    const bulkSetFields = vi.fn().mockRejectedValue(new Error("boom"));

    const res = await archiveCommand.execute!({ rawArgs: "", app: fakeApp(bulkSetFields) });

    expect(res).toEqual({ message: "boom" });
  });
});
