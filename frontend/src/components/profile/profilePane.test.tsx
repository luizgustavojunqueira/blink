import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePane from "./profilePane";
import { useUiStore } from "../../stores/ui";
import { useKeyMap } from "../../hooks/useKeyMap";
import { getAppContext } from "../../lib/appContext";
import { createProfilePane, createRootPane } from "../../lib/pane/factories";
import type { ProfilePane as ProfilePaneState } from "../../lib/pane/types";
import { useAuthStore } from "../../lib/auth/store";
import { applyKeymap } from "../../lib/keymap/registry";

const ui = () => useUiStore.getState();
const selectedRow = () => (ui().panes[1] as ProfilePaneState).selectedRow;
const field = (id: string) => screen.getByTestId(id) as HTMLTextAreaElement;

const changePassword = vi.fn();
const deleteAccount = vi.fn();
const logout = vi.fn();

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  });
}

function setup(selected = "profile:account") {
  const pane = createProfilePane("profile", selected);
  useUiStore.setState({ mode: "normal", panes: [createRootPane(), pane], activePaneId: pane.id });

  renderHook(() => useKeyMap(getAppContext()));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfilePane paneId="profile" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  changePassword.mockReset().mockResolvedValue(undefined);
  deleteAccount.mockReset().mockResolvedValue(undefined);
  logout.mockReset().mockResolvedValue(undefined);
  useAuthStore.setState({
    status: "authenticated",
    user: { guid: "u1", username: "alice" },
    changePassword,
    deleteAccount,
    logout,
  });
});

afterEach(() => {
  applyKeymap({});
});

describe("ProfilePane", () => {
  it("shows the username and the actions", () => {
    setup();

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("change password")).toBeInTheDocument();
    expect(screen.getByText("log out")).toBeInTheDocument();
    expect(screen.getByText("delete account")).toBeInTheDocument();
  });

  it("moves between rows with j and k", () => {
    setup();

    press("j");
    expect(selectedRow()).toBe("profile:password");
    press("j");
    press("j");
    expect(selectedRow()).toBe("profile:delete");
    press("j");
    expect(selectedRow()).toBe("profile:delete");
    press("k");
    expect(selectedRow()).toBe("profile:logout");
  });

  it("logs out with enter on the logout row", () => {
    setup("profile:logout");

    press("Enter");

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("does nothing on enter over the username", () => {
    setup();

    press("Enter");

    expect(ui().mode).toBe("normal");
    expect(logout).not.toHaveBeenCalled();
  });

  it("changes the password through the form", async () => {
    setup("profile:password");

    press("Enter");
    expect(ui().mode).toBe("insert");

    fireEvent.change(field("profile-current"), { target: { value: "old-password" } });
    fireEvent.keyDown(field("profile-current"), { key: "Enter" });
    fireEvent.change(field("profile-new"), { target: { value: "new-password" } });
    fireEvent.keyDown(field("profile-new"), { key: "Enter" });
    fireEvent.change(field("profile-confirm"), { target: { value: "new-password" } });
    fireEvent.keyDown(field("profile-confirm"), { key: "Enter" });

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("old-password", "new-password"));
    await waitFor(() => expect(ui().mode).toBe("normal"));
    expect(screen.queryByTestId("profile-current")).not.toBeInTheDocument();
    expect(screen.getByText("changed")).toBeInTheDocument();
  });

  it("refuses a confirmation that does not match", () => {
    setup("profile:password");
    press("Enter");

    fireEvent.change(field("profile-current"), { target: { value: "old-password" } });
    fireEvent.change(field("profile-new"), { target: { value: "new-password" } });
    fireEvent.change(field("profile-confirm"), { target: { value: "different" } });
    fireEvent.keyDown(field("profile-confirm"), { key: "Tab", shiftKey: true });
    fireEvent.keyDown(field("profile-new"), { key: "Tab" });
    fireEvent.keyDown(field("profile-confirm"), { key: "Enter" });

    expect(screen.getByText(/do not match/)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
    expect(ui().mode).toBe("insert");
  });

  it("keeps the form open and shows the error when the current password is wrong", async () => {
    changePassword.mockRejectedValue(new Error("incorrect password"));
    setup("profile:password");
    press("Enter");

    fireEvent.change(field("profile-current"), { target: { value: "wrong" } });
    fireEvent.change(field("profile-new"), { target: { value: "new-password" } });
    fireEvent.change(field("profile-confirm"), { target: { value: "new-password" } });
    fireEvent.keyDown(field("profile-confirm"), { key: "Enter" });

    expect(await screen.findByText(/incorrect password/)).toBeInTheDocument();
    expect(ui().mode).toBe("insert");
  });

  it("masks what is typed in the form", () => {
    setup("profile:password");
    press("Enter");

    fireEvent.change(field("profile-current"), { target: { value: "hunter2hunter2" } });

    const overlays = Array.from(document.querySelectorAll("[aria-hidden='true']")).map((o) => o.textContent);
    expect(overlays.join("")).not.toContain("hunter2");
    expect(overlays.some((o) => o?.startsWith("•".repeat(14)))).toBe(true);
  });

  it("escape closes the form and discards what was typed", () => {
    setup("profile:password");
    press("Enter");
    fireEvent.change(field("profile-current"), { target: { value: "typed" } });

    press("Escape");

    expect(ui().mode).toBe("normal");
    expect(screen.queryByTestId("profile-current")).not.toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("deletes the account with the password", async () => {
    setup("profile:delete");
    press("Enter");

    expect(screen.getByText(/permanently deletes/)).toBeInTheDocument();
    fireEvent.change(field("profile-delete-password"), { target: { value: "password123" } });
    fireEvent.keyDown(field("profile-delete-password"), { key: "Enter" });

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith("password123"));
  });

  it("shows the error when deleting fails", async () => {
    deleteAccount.mockRejectedValue(new Error("incorrect password"));
    setup("profile:delete");
    press("Enter");

    fireEvent.change(field("profile-delete-password"), { target: { value: "wrong" } });
    fireEvent.keyDown(field("profile-delete-password"), { key: "Enter" });

    expect(await screen.findByText(/incorrect password/)).toBeInTheDocument();
  });
});
