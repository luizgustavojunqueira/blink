import { afterEach, describe, expect, it } from "vitest";
import { getTheme, setTheme } from "./theme";

describe("theme", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("applies the theme class to the root element", () => {
    setTheme("catppuccin");

    expect(document.documentElement.className).toBe("theme-catppuccin");
  });

  it("replaces the previous theme class instead of stacking", () => {
    setTheme("catppuccin");
    setTheme("nord");

    expect(document.documentElement.className).toBe("theme-nord");
  });

  it("reads back what it wrote", () => {
    setTheme("nord");

    expect(getTheme()).toBe("nord");
  });

  it("stores under the blink-theme key", () => {
    setTheme("nord");

    expect(localStorage.getItem("blink-theme")).toBe("nord");
  });

  it("falls back to gruvbox when nothing is stored", () => {
    expect(getTheme()).toBe("gruvbox");
  });
});
