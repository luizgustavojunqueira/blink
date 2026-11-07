import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { applyLanguage, getLocale, resolveLocale, t, useLocale } from ".";
import { pt } from "./pt";

afterEach(() => {
  applyLanguage("en");
  vi.unstubAllGlobals();
});

const stubLanguages = (languages: string[]) =>
  vi.stubGlobal("navigator", { ...navigator, languages, language: languages[0] });

describe("t()", () => {
  it("returns the english text as is", () => {
    expect(t("Filter items")).toBe("Filter items");
  });

  it("fills in the params", () => {
    expect(t("Unknown command: {name}", { name: "foo" })).toBe("Unknown command: foo");
  });

  it("leaves a placeholder without a param untouched", () => {
    expect(t("Unknown command: {name}")).toBe("Unknown command: {name}");
  });

  it("translates once the language is portuguese", () => {
    applyLanguage("pt");

    expect(t("Filter items")).toBe(pt["Filter items"]);
    expect(t("Unknown command: {name}", { name: "foo" })).toBe(pt["Unknown command: {name}"].replace("{name}", "foo"));
  });

  it("falls back to english for text without a translation", () => {
    applyLanguage("pt");

    expect(t("not a real message")).toBe("not a real message");
  });
});

describe("resolveLocale()", () => {
  it("uses the chosen language", () => {
    expect(resolveLocale("pt")).toBe("pt");
    expect(resolveLocale("en")).toBe("en");
  });

  it("follows the browser on auto", () => {
    stubLanguages(["pt-BR", "en-US"]);
    expect(resolveLocale("auto")).toBe("pt");

    stubLanguages(["de-DE", "pt-PT"]);
    expect(resolveLocale("auto")).toBe("pt");

    stubLanguages(["en-GB", "fr-FR"]);
    expect(resolveLocale("auto")).toBe("en");
  });
});

describe("useLocale()", () => {
  it("re-renders when the language changes", () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe("en");

    act(() => applyLanguage("pt"));

    expect(result.current).toBe("pt");
    expect(getLocale()).toBe("pt");
  });
});
