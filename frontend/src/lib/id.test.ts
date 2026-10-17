import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./id";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newId", () => {
  it("returns a v4 uuid", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("returns a v4 uuid when randomUUID is unavailable, as on plain http", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });

    expect(newId()).toMatch(UUID_V4);
  });

  it("returns distinct ids without randomUUID", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });

    expect(new Set(Array.from({ length: 100 }, newId)).size).toBe(100);
  });
});
