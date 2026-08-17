import { describe, expect, it, vi } from "vitest";
import { execute } from "./index";
import * as registry from "../commands/registry";
import type { AppContext, CommandDefinition } from "../commands/types";

const app: AppContext = {
  setFilter: vi.fn(),
  setTheme: vi.fn(),
  items: { create: vi.fn() },
};

function stubCommand(def: Partial<CommandDefinition>): CommandDefinition {
  return { id: "stub", displayName: "/stub", description: "stub", ...def };
}

describe("execute()", () => {
  it("reports unknown commands instead of throwing", async () => {
    vi.spyOn(registry, "getCommand").mockReturnValue(undefined);

    await expect(execute({ id: "banana", rawArgs: "" }, app)).resolves.toEqual({
      message: "Unknown command: banana",
    });
  });

  it("returns nothing for a command with no execute", async () => {
    vi.spyOn(registry, "getCommand").mockReturnValue(stubCommand({}));

    await expect(execute({ id: "stub", rawArgs: "x" }, app)).resolves.toBeUndefined();
  });

  it("forwards rawArgs and the app context to the command", async () => {
    const run = vi.fn();
    vi.spyOn(registry, "getCommand").mockReturnValue(stubCommand({ execute: run }));

    await execute({ id: "stub", rawArgs: "!high #dev" }, app);

    expect(run).toHaveBeenCalledWith({ rawArgs: "!high #dev", app });
  });

  it("returns the command's result", async () => {
    vi.spyOn(registry, "getCommand").mockReturnValue(
      stubCommand({ execute: () => ({ shouldClearPrompt: true }) }),
    );

    await expect(execute({ id: "stub", rawArgs: "" }, app)).resolves.toEqual({
      shouldClearPrompt: true,
    });
  });

  it("awaits async commands", async () => {
    vi.spyOn(registry, "getCommand").mockReturnValue(
      stubCommand({ execute: async () => ({ message: "done" }) }),
    );

    await expect(execute({ id: "stub", rawArgs: "" }, app)).resolves.toEqual({ message: "done" });
  });
});
