import { describe, expect, it } from "vitest";
import { tokenizePrompt } from "./promptTokenize";
import { ORDER_FIELD_CLASS, PRIORITY_CLASS, STATUS_CLASS, TYPE_CLASS } from "../../lib/validator";
import {
  DESCRIPTION_MODIFIER,
  ORDER_MODIFIER,
  PRIORITY_MODIFIER,
  STATUS_MODIFIER,
  TAG_MODIFIER,
  TYPE_MODIFIER,
} from "../../lib/modifiers/delimiters";

const INVALID = "text-danger";

function classOf(text: string, token = text) {
  return tokenizePrompt(text).find((t) => t.text === token)?.className;
}

const descending = (fields: string[]) => fields.map((f) => `-${f}`);

const KNOWN_VALUES: [string, string[]][] = [
  [PRIORITY_MODIFIER, Object.keys(PRIORITY_CLASS)],
  [STATUS_MODIFIER, Object.keys(STATUS_CLASS)],
  [ORDER_MODIFIER, Object.keys(ORDER_FIELD_CLASS)],
  [ORDER_MODIFIER, descending(Object.keys(ORDER_FIELD_CLASS))],
  [TYPE_MODIFIER, Object.keys(TYPE_CLASS)],
];

const DELIMITERS = [PRIORITY_MODIFIER, STATUS_MODIFIER, ORDER_MODIFIER, TYPE_MODIFIER];

describe("tokenizePrompt", () => {
  it("leaves modifiers the command doesn't accept as plain text", () => {
    expect(classOf(":edit @done =task", "@done")).toBe(STATUS_CLASS.done + " font-medium");
    expect(classOf(":edit @done =task", "=task")).toBe("");
    expect(classOf(":create buy %title", "%title")).toBe("");
    expect(classOf(":theme #nope", "#nope")).toBe("");
  });

  it("keeps plain text as a single token without highlight classes", () => {
    expect(tokenizePrompt("hello world")).toEqual([{ text: "hello world", className: "" }]);
  });

  describe("known values", () => {
    for (const [delimiter, values] of KNOWN_VALUES) {
      for (const value of values) {
        const token = `${delimiter}${value}`;

        it(`highlights ${token} instead of rejecting it`, () => {
          const className = classOf(token);

          expect(className).toBeTruthy();
          expect(className).not.toContain(INVALID);
          expect(className).toContain("font-medium");
        });
      }
    }
  });

  describe("unknown values", () => {
    for (const delimiter of DELIMITERS) {
      it(`marks ${delimiter}banana as invalid, with a strikethrough`, () => {
        const className = classOf(`${delimiter}banana`);

        expect(className).toContain(INVALID);
        expect(className).toContain("line-through");
      });
    }

    it("rejects a bare descending marker with no field after it", () => {
      expect(classOf(`${ORDER_MODIFIER}-`)).toContain(INVALID);
    });
  });

  describe("bare delimiters", () => {
    for (const delimiter of DELIMITERS) {
      it(`leaves ${delimiter} pending rather than invalid, since nothing was typed yet`, () => {
        const className = classOf(delimiter);

        expect(className).toContain("text-accent");
        expect(className).not.toContain("line-through");
      });
    }
  });

  it("highlights a tag without validating it, since any tag may be new", () => {
    expect(classOf(`${TAG_MODIFIER}anything-at-all`)).toContain("text-tag");
  });

  it("highlights the description delimiter, then dims the text after it", () => {
    const text = `title ${DESCRIPTION_MODIFIER} some description`;

    expect(classOf(text, DESCRIPTION_MODIFIER)).toContain("text-accent");
    expect(classOf(text, " some description")).toContain("text-fg-dim");
  });

  it("keeps modifiers after the description delimiter highlighted as modifiers", () => {
    const text = `title ${DESCRIPTION_MODIFIER} desc ${PRIORITY_MODIFIER}high ${TAG_MODIFIER}tag`;

    expect(classOf(text, `${PRIORITY_MODIFIER}high`)).not.toContain("text-fg-dim");
    expect(classOf(text, `${TAG_MODIFIER}tag`)).toContain("text-tag");
  });

  it("leaves the title untouched while highlighting the modifiers around it", () => {
    const tokens = tokenizePrompt("title !high @done #dev %priority");
    const title = tokens.find((t) => t.text.includes("title"));

    expect(title?.className).toBe("");
    for (const token of ["!high", "@done", "#dev", "%priority"]) {
      expect(classOf("title !high @done #dev %priority", token)).toBeTruthy();
    }
  });
});
