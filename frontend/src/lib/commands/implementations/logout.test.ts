import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";
import { useAuthStore } from "../../auth/store";
import { logoutCommand } from "./logout";
import { getCommand } from "../registry";

function fakeApp() {
  return { ui: { setPrompt: vi.fn() } } as unknown as AppContext;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logoutCommand", () => {
  it("is registered as :logout", () => {
    expect(getCommand("logout")).toBe(logoutCommand);
  });

  it("clears the prompt and logs out", async () => {
    const app = fakeApp();
    const logout = vi.spyOn(useAuthStore.getState(), "logout").mockResolvedValue();

    await logoutCommand.execute!({ rawArgs: "", app });

    expect(app.ui.setPrompt).toHaveBeenCalledWith("");
    expect(logout).toHaveBeenCalledOnce();
  });
});

describe("history command", () => {
  it("is no longer registered", () => {
    expect(getCommand("history")).toBeUndefined();
  });
});
