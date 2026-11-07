import { describe, expect, it } from "vitest";
import { AGENT_NEW_ROW_ID, ANIMATIONS_ROW_ID, LANGUAGE_ROW_ID, agentRowId, parseRowId } from "./rowId";

describe("agent row ids", () => {
  it("round-trips an agent guid", () => {
    expect(parseRowId(agentRowId("4f73-aa"))).toEqual({ kind: "agent", guid: "4f73-aa" });
  });

  it("tells the new-agent row from an agent", () => {
    expect(parseRowId(AGENT_NEW_ROW_ID)).toEqual({ kind: "agentNew" });
  });
});

describe("animations row id", () => {
  it("parses to the animations row", () => {
    expect(parseRowId(ANIMATIONS_ROW_ID)).toEqual({ kind: "animations" });
  });
});

describe("language row id", () => {
  it("parses to the language row", () => {
    expect(parseRowId(LANGUAGE_ROW_ID)).toEqual({ kind: "language" });
  });
});
