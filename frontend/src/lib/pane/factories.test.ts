import { describe, expect, it } from "vitest";
import { createDetailPane, createListPane, createRootPane } from "./factories";

describe("createListPane", () => {
  it("builds a list pane with empty defaults", () => {
    const pane = createListPane("id", "parent");

    expect(pane).toMatchObject({
      id: "id",
      parentId: "parent",
      type: "list",
      prompt: "",
      filter: {},
      selectedId: null,
      renderedIds: [],
    });
  });
});

describe("createRootPane", () => {
  it("creates a list pane with the root id and no parent", () => {
    const pane = createRootPane();

    expect(pane.id).toBe("root");
    expect(pane.parentId).toBeNull();
    expect(pane.type).toBe("list");
  });
});

describe("createDetailPane", () => {
  it("builds a detail pane pointing at the given item", () => {
    const pane = createDetailPane("d1", "parent", "item-42");

    expect(pane).toMatchObject({
      id: "d1",
      parentId: "parent",
      type: "detail",
      itemId: "item-42",
    });
  });
});
