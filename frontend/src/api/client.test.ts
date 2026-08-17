import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

function respond(body: string, init: ResponseInit) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body || null, init)));
}

describe("api()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed body on success", async () => {
    respond(JSON.stringify({ guid: "a7b9" }), { status: 200 });

    await expect(api("/items")).resolves.toEqual({ guid: "a7b9" });
  });

  it("returns undefined for 204", async () => {
    respond("", { status: 204 });

    await expect(api("/items")).resolves.toBeUndefined();
  });

  it("throws the backend's plain-text error, which is how http.Error replies", async () => {
    respond("title is required", { status: 400 });

    await expect(api("/items")).rejects.toThrow("title is required");
  });

  it("falls back to the status when the body is empty", async () => {
    respond("", { status: 500 });

    await expect(api("/items")).rejects.toThrow("HTTP 500");
  });

  it("still reads a JSON error body rather than crashing on it", async () => {
    respond(JSON.stringify({ message: "nope" }), { status: 422 });

    await expect(api("/items")).rejects.toThrow(/nope/);
  });
});
