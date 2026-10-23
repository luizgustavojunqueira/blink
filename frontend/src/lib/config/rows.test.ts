import { describe, expect, it } from "vitest";
import { defaultConfig } from "./store";
import { configRows, sectionOf } from "./rows";

describe("configRows agents", () => {
  const agents = [
    { guid: "a1", name: "claude", created_at: "x" },
    { guid: "a2", name: "cursor", created_at: "x" },
  ];

  it("ends with the new-agent row followed by every agent", () => {
    const tail = configRows(defaultConfig(), agents).slice(-3);

    expect(tail.map((r) => r.id)).toEqual(["agent:new", "agent:a1", "agent:a2"]);
  });

  it("still offers the new-agent row when there are no agents", () => {
    const rows = configRows(defaultConfig());

    expect(rows[rows.length - 1].id).toBe("agent:new");
  });

  it("groups the new-agent row and the agents in one section", () => {
    const [newRow, agent] = configRows(defaultConfig(), agents).slice(-3);

    expect(sectionOf(newRow)).toBe(sectionOf(agent));
  });
});
