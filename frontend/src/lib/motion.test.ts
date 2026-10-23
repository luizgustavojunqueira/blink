import { afterEach, describe, expect, it, vi } from "vitest";
import { applyMotion, motionEnabled } from "./motion";

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", () => ({
    matches: reduce,
    addEventListener: vi.fn(),
  }));

afterEach(() => vi.unstubAllGlobals());

describe("motionEnabled", () => {
  it("on and off ignore the system setting", () => {
    reducedMotion(true);
    expect(motionEnabled("on")).toBe(true);

    reducedMotion(false);
    expect(motionEnabled("off")).toBe(false);
  });

  it("auto follows the system's reduced motion setting", () => {
    reducedMotion(true);
    expect(motionEnabled("auto")).toBe(false);

    reducedMotion(false);
    expect(motionEnabled("auto")).toBe(true);
  });
});

describe("applyMotion", () => {
  it("writes the result on the root element", () => {
    reducedMotion(true);
    applyMotion("auto");
    expect(document.documentElement.dataset.motion).toBe("off");

    applyMotion("on");
    expect(document.documentElement.dataset.motion).toBe("on");
  });
});
