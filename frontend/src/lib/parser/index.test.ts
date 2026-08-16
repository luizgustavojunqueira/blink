import { describe, expect, it } from "vitest";
import { parse } from ".";

describe("parse()", () => {
  describe("FILTER", () => {
    it("parse simple title", () => {
      const result = parse("build blink");
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "build blink",
        },
      });
    });

    it("parse title and description", () => {
      const result = parse("title $ and description");
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title",
          description: "and description",
        },
      });
    });

    it("parse everything simple", () => {
      const result = parse(
        "title !high @todo #dev #golang $ this is the description",
      );
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title",
          description: "this is the description",
          priority: ["high"],
          status: ["todo"],
          tags: ["dev", "golang"],
        },
      });
    });

    it("parse complex query", () => {
      const result = parse(
        "title !high @done is @todo between #test multiple #dev #golang modifiers $ and #react the description !low too",
      );
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title is between multiple modifiers",
          description: "and the description too",
          priority: ["high", "low"],
          status: ["done", "todo"],
          tags: ["test", "dev", "golang", "react"],
        },
      });
    });

    it("returns empty when no input", () => {
      const result = parse("");
      expect(result).toEqual({ type: "FILTER", data: {} });
    });

    it("drops invalid status values", () => {
      const result = parse("title @banana @todo");
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title",
          status: ["todo"],
        },
      });
    });

    it("drops invalid priority values", () => {
      const result = parse("title !custom !high");
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title",
          priority: ["high"],
        },
      });
    });

    it("omits status and priority when all values are invalid", () => {
      const result = parse("title @banana !nope #dev");
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title",
          tags: ["dev"],
        },
      });
    });

    it("ignores bare delimiters without values", () => {
      const result = parse("title @ ! #");
      expect(result).toEqual({
        type: "FILTER",
        data: {
          title: "title @ ! #",
        },
      });
    });
  });
});
