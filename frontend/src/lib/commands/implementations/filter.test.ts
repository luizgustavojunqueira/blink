import { describe, expect, it } from "vitest";
import { filterCommand, parseFilter } from "./filter";

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
});
