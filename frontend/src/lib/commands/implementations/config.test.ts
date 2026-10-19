import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../types";
import { configCommand } from "./config";
import { defaultConfig } from "../../config/store";

function fakeApp() {
  return {
    ui: { setPrompt: vi.fn(), openConfig: vi.fn() },
    config: { get: () => ({ ...defaultConfig(), theme: "nord" }) },
  } as unknown as AppContext;
}

describe("configCommand", () => {
  it("clears the prompt before opening, so the list does not keep the command text", async () => {
    const app = fakeApp();
    const order: string[] = [];
    vi.mocked(app.ui.setPrompt).mockImplementation(
      () => void order.push("clear"),
    );
    vi.mocked(app.ui.openConfig).mockImplementation(
      () => void order.push("open"),
    );

    await configCommand.execute!({ rawArgs: "", app });

    expect(app.ui.setPrompt).toHaveBeenCalledWith("");
    expect(order).toEqual(["clear", "open"]);
  });

  it("opens with the current theme selected", async () => {
    const app = fakeApp();

    await configCommand.execute!({ rawArgs: "", app });

    expect(app.ui.openConfig).toHaveBeenCalledWith("theme:nord");
  });
});
