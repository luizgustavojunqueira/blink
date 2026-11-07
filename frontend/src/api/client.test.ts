import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, setUnauthorizedHandler } from "./client";

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

  it("keeps the code and status of a JSON error", async () => {
    respond(JSON.stringify({ code: "title_required", message: "title is required" }), { status: 400 });

    const err = await api("/items").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "title_required", status: 400, message: "title is required" });
  });

  it("has no code for a plain-text error", async () => {
    respond("bad gateway", { status: 502 });

    await expect(api("/items")).rejects.toMatchObject({ code: null, status: 502, message: "bad gateway" });
  });

  it("tells the unauthorized handler about a 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond("unauthorized", { status: 401 });

    await expect(api("/items")).rejects.toThrow("unauthorized");
    expect(handler).toHaveBeenCalledTimes(1);

    setUnauthorizedHandler(null);
  });

  it("does not treat a failed login as an expired session", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond("invalid username or password", { status: 401 });

    await expect(api("/auth/login", { method: "POST" })).rejects.toThrow("invalid username or password");
    expect(handler).not.toHaveBeenCalled();

    setUnauthorizedHandler(null);
  });
});
