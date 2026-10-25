import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./store";
import * as authApi from "../../api/auth";
import { setUnauthorizedHandler } from "../../api/client";
import { reloadApp } from "./reload";

vi.mock("../../api/auth");
vi.mock("./reload", () => ({ reloadApp: vi.fn() }));

const user = { guid: "u1", username: "alice" };

beforeEach(() => {
  useAuthStore.setState({ status: "loading", user: null });
  vi.mocked(reloadApp).mockClear();
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.resetAllMocks();
});

describe("auth store", () => {
  it("boots as authenticated when the session is valid", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue(user);

    await useAuthStore.getState().boot();

    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", user });
  });

  it("boots as anonymous when there is no session", async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(new Error("unauthorized"));

    await useAuthStore.getState().boot();

    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", user: null });
  });

  it("reloads the app after logging in or signing up", async () => {
    vi.mocked(authApi.login).mockResolvedValue(user);
    vi.mocked(authApi.signup).mockResolvedValue(user);

    await useAuthStore.getState().login("alice", "password123");
    await useAuthStore.getState().signup("alice", "password123");

    expect(authApi.login).toHaveBeenCalledWith({ username: "alice", password: "password123" });
    expect(authApi.signup).toHaveBeenCalledWith({ username: "alice", password: "password123" });
    expect(reloadApp).toHaveBeenCalledTimes(2);
  });

  it("does not reload when the credentials are refused", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("invalid username or password"));

    await expect(useAuthStore.getState().login("alice", "nope")).rejects.toThrow("invalid");

    expect(reloadApp).not.toHaveBeenCalled();
  });

  it("logs out, then reloads even if the request fails", async () => {
    useAuthStore.setState({ status: "authenticated", user });
    vi.mocked(authApi.logout).mockRejectedValue(new Error("offline"));

    await expect(useAuthStore.getState().logout()).rejects.toThrow("offline");

    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(reloadApp).toHaveBeenCalledTimes(1);
  });

  it("sends the password change with the backend field names", async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue(undefined);

    await useAuthStore.getState().changePassword("old-password", "new-password");

    expect(authApi.changePassword).toHaveBeenCalledWith({
      current_password: "old-password",
      new_password: "new-password",
    });
    expect(reloadApp).not.toHaveBeenCalled();
  });

  it("reloads after deleting the account", async () => {
    vi.mocked(authApi.deleteAccount).mockResolvedValue(undefined);

    await useAuthStore.getState().deleteAccount("password123");

    expect(authApi.deleteAccount).toHaveBeenCalledWith({ password: "password123" });
    expect(reloadApp).toHaveBeenCalledTimes(1);
  });

  it("reloads on a 401 only while authenticated", async () => {
    vi.mocked(authApi.getMe).mockResolvedValue(user);
    await useAuthStore.getState().boot();

    const { api } = await import("../../api/client");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })));

    await expect(api("/items")).rejects.toThrow();
    expect(reloadApp).toHaveBeenCalledTimes(1);

    useAuthStore.setState({ status: "anonymous", user: null });
    await expect(api("/items")).rejects.toThrow();
    expect(reloadApp).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
