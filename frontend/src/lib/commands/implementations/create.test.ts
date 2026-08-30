import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";
import { createCommand, parseCreate } from "./create";
import { useUiStore } from "../../../stores/ui";

function fakeApp(create = vi.fn().mockResolvedValue({})): AppContext {
  return {
    ui: useUiStore.getState(),
    setTheme: vi.fn(),
    items: {
      findItem: vi.fn(),
      setField: vi.fn(),
      create,
      update: vi.fn(),
    },
  };
}

function req(raw: string) {
  const result = parseCreate(raw);
  if (!result.ok) throw new Error(`expected a request, got: ${result.error}`);
  return result.req;
}

function error(raw: string) {
  const result = parseCreate(raw);
  if (result.ok) throw new Error("expected an error, got a request");
  return result.error;
}

describe("parseCreate()", () => {
  it("takes the leftover text as the title", () => {
    expect(req("buy milk").title).toBe("buy milk");
  });

  it("defaults type, status and priority, which the backend requires", () => {
    expect(req("buy milk")).toMatchObject({
      type: "TASK",
      status: "TODO",
      priority: "NORMAL",
    });
  });

  it("uppercases status and priority, since POST does no normalizing of its own", () => {
    expect(req("buy milk @in_progress !high")).toMatchObject({
      status: "IN_PROGRESS",
      priority: "HIGH",
    });
  });

  it("collects tags, keeping them lowercase", () => {
    expect(req("buy milk #Dev #golang").tags).toEqual(["dev", "golang"]);
  });

  it("takes everything after $ as the description, preserving case", () => {
    expect(req("buy milk $ From the Corner Store").description).toBe("From the Corner Store");
  });

  it("leaves description undefined when $ is absent", () => {
    expect(req("buy milk").description).toBeUndefined();
  });

  it("accepts modifiers in any position", () => {
    expect(req("buy @todo milk !high today")).toMatchObject({
      title: "buy milk today",
      status: "TODO",
      priority: "HIGH",
    });
  });

  it("rejects an empty title", () => {
    expect(error("")).toMatch(/title is required/i);
  });

  it("rejects a title made only of modifiers", () => {
    expect(error("@todo !high #dev")).toMatch(/title is required/i);
  });

  it("names the offending value instead of claiming the field is missing", () => {
    expect(error("buy milk @banana")).toMatch(/invalid status "banana"/i);
    expect(error("buy milk !nope")).toMatch(/invalid priority "nope"/i);
  });

  it("rejects more than one status or priority", () => {
    expect(error("buy milk @todo @done")).toMatch(/one status/i);
    expect(error("buy milk !high !low")).toMatch(/one priority/i);
  });
});

describe("createCommand", () => {
  it("has loose arg positioning, since modifiers can appear anywhere", () => {
    expect(createCommand.strictArgPosition).toBe(false);
  });

  it("autocompletes through the modifier registry", () => {
    expect(createCommand.getOptions!("buy milk @to").map((o) => o.value)).toEqual(["TODO"]);
  });

  it("sends the parsed request and clears the prompt", async () => {
    const create = vi.fn().mockResolvedValue({});
    const app = fakeApp(create);

    const result = await createCommand.execute!({
      rawArgs: "buy milk !high",
      app,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "buy milk", priority: "HIGH" }),
    );
    expect(result).toEqual({ shouldClearPrompt: true });
  });

  it("reports a parse error without calling the API", async () => {
    const create = vi.fn();
    const result = await createCommand.execute!({
      rawArgs: "@todo",
      app: fakeApp(create),
    });

    expect(create).not.toHaveBeenCalled();
    expect(result?.message).toMatch(/title is required/i);
    expect(result?.shouldClearPrompt).toBeFalsy();
  });

  it("surfaces an API failure as a message instead of rejecting", async () => {
    const create = vi.fn().mockRejectedValue(new Error("title is required"));

    const result = await createCommand.execute!({
      rawArgs: "buy milk",
      app: fakeApp(create),
    });

    expect(result).toEqual({ message: "title is required" });
  });

  it("keeps the typed text when the API fails, so nothing is lost", async () => {
    const create = vi.fn().mockRejectedValue(new Error("boom"));

    const result = await createCommand.execute!({
      rawArgs: "buy milk",
      app: fakeApp(create),
    });

    expect(result?.shouldClearPrompt).toBeFalsy();
  });
});
