import { describe, expect, it } from "vitest";
import { createRootPane } from "./factories";

describe("createRootPane", () => {
  it("uses the root id the rest of the app looks the first pane up by", () => {
    const pane = createRootPane();

    expect(pane.id).toBe("root");
    expect(pane.parentGuid).toBeNull();
  });
});
