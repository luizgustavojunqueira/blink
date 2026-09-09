import { describe, expect, it, vi } from "vitest";
import { filterCommand, parseFilter } from "./filter";
import { useUiStore } from "../../../stores/ui";
import { createListPane, createRootPane } from "../../pane/factories";
import type { AppContext } from "../../types";

function fakeApp(): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: { findItem: vi.fn(), setField: vi.fn(), bulkSetField: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
}

describe("parseFilter()", () => {
  it("parses simple title", () => {
    expect(parseFilter("build blink")).toEqual({
      title: "build blink",
    });
  });

  it("parses title and description", () => {
    expect(parseFilter("title $ and description")).toEqual({
      title: "title",
      description: "and description",
    });
  });

  it("parses everything simple", () => {
    expect(parseFilter("title !high @todo #dev #golang $ this is the description")).toEqual({
      title: "title",
      description: "this is the description",
      priority: ["high"],
      status: ["todo"],
      tags: ["dev", "golang"],
    });
  });

  it("parses complex query", () => {
    expect(
      parseFilter(
        "title !high @done is @todo between #test multiple #dev #golang modifiers $ and #react the description !low too",
      ),
    ).toEqual({
      title: "title is between multiple modifiers",
      description: "and the description too",
      priority: ["high", "low"],
      status: ["done", "todo"],
      tags: ["test", "dev", "golang", "react"],
    });
  });

  it("returns empty object when no input", () => {
    expect(parseFilter("")).toEqual({});
  });

  it("drops invalid status values", () => {
    expect(parseFilter("title @banana @todo")).toEqual({
      title: "title",
      status: ["todo"],
    });
  });

  it("drops invalid priority values", () => {
    expect(parseFilter("title !custom !high")).toEqual({
      title: "title",
      priority: ["high"],
    });
  });

  it("omits status and priority when all values are invalid", () => {
    expect(parseFilter("title @banana !nope #dev")).toEqual({
      title: "title",
      tags: ["dev"],
    });
  });

  it("ignores bare delimiters without values", () => {
    expect(parseFilter("title @ ! #")).toEqual({
      title: "title @ ! #",
    });
  });
});

describe("parseFilter() type", () => {
  it("collects every type, since a filter can span both", () => {
    expect(parseFilter("=task =group").type).toEqual(["task", "group"]);
  });

  it("leaves the type out when no modifier is given", () => {
    expect(parseFilter("buy milk").type).toBeUndefined();
  });
});

describe("filterCommand", () => {
  it("has loose arg positioning, since its args are free filter text", () => {
    expect(filterCommand.strictArgPosition).toBe(false);
  });

  it("getOptions delegates to the matching modifier for the current token", () => {
    const options = filterCommand.getOptions!("buy milk @to");
    expect(options.map((o) => o.value)).toEqual(["TODO"]);
  });

  it("getOptions lists modifiers themselves via ?", () => {
    const options = filterCommand.getOptions!("buy milk ?");
    expect(options.map((o) => o.value)).toEqual(expect.arrayContaining(["@", "!", "#", "$"]));
  });

  it("getOptions returns nothing for plain title text", () => {
    expect(filterCommand.getOptions!("buy milk")).toEqual([]);
  });

  it("keeps the pane scoped to its group when filtering", () => {
    const child = createListPane("child", "group-1");
    useUiStore.setState({ panes: [createRootPane(), child], activePaneId: child.id });

    filterCommand.execute!({ rawArgs: "@todo", app: fakeApp() });

    const pane = useUiStore.getState().panes[1];
    expect(pane.type === "list" && pane.filter).toMatchObject({
      parent_id: "group-1",
      status: ["todo"],
    });
  });
});
