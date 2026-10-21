import { describe, expect, it } from "vitest";
import { Group, Normal, ToDo, type GetItemResponse } from "../types/backend";
import { blockedGroups, groupPaths, resolveGroup } from "./moveTargets";

const group = (guid: string, title: string, parent_guid?: string): GetItemResponse => ({
  guid,
  title,
  type: Group,
  status: ToDo,
  priority: Normal,
  tags: [],
  parent_guid,
});

const groups = [
  group("work", "work"),
  group("api", "api", "work"),
  group("v2", "v2", "api"),
  group("home", "home"),
  group("api2", "api", "home"),
];

describe("groupPaths", () => {
  it("builds the full path of every group", () => {
    expect(groupPaths(groups).map((t) => t.path)).toEqual([
      "work",
      "work/api",
      "work/api/v2",
      "home",
      "home/api",
    ]);
  });

  it("survives a parent cycle", () => {
    const cyclic = [group("a", "a", "b"), group("b", "b", "a")];

    expect(groupPaths(cyclic)).toHaveLength(2);
  });
});

describe("blockedGroups", () => {
  it("blocks the moving groups and everything below them", () => {
    expect([...blockedGroups(groups, ["api"])].sort()).toEqual(["api", "v2"]);
  });

  it("blocks nothing when no group is moving", () => {
    expect(blockedGroups(groups, ["task-1"]).size).toBe(0);
  });
});

describe("resolveGroup", () => {
  it("resolves a full path", () => {
    expect(resolveGroup(groups, ["x"], "Work/API")).toEqual({ ok: true, guid: "api" });
  });

  it("resolves a unique title", () => {
    expect(resolveGroup(groups, ["x"], "v2")).toEqual({ ok: true, guid: "v2" });
  });

  it("asks for the full path when the title is ambiguous", () => {
    const res = resolveGroup(groups, ["x"], "api");

    expect(res.ok).toBe(false);
  });

  it("rejects an unknown group", () => {
    expect(resolveGroup(groups, ["x"], "nope")).toEqual({ ok: false, error: 'No group "nope"' });
  });

  it("rejects moving a group into itself", () => {
    expect(resolveGroup(groups, ["api"], "work/api")).toEqual({
      ok: false,
      error: "Can't move a group into itself",
    });
  });

  it("rejects moving a group into its own subtree", () => {
    expect(resolveGroup(groups, ["api"], "v2")).toEqual({
      ok: false,
      error: "Can't move a group into itself",
    });
  });
});
