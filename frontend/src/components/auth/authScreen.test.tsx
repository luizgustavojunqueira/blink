import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthScreen from "./authScreen";
import { useAuthStore } from "../../lib/auth/store";

const login = vi.fn();
const signup = vi.fn();

const username = () => screen.getByTestId("auth-username") as HTMLTextAreaElement;
const password = () => screen.getByTestId("auth-password") as HTMLTextAreaElement;

function fill(user: string, pass: string) {
  fireEvent.change(username(), { target: { value: user } });
  fireEvent.keyDown(username(), { key: "Enter" });
  fireEvent.change(password(), { target: { value: pass } });
}

beforeEach(() => {
  login.mockReset().mockResolvedValue(undefined);
  signup.mockReset().mockResolvedValue(undefined);
  useAuthStore.setState({ status: "anonymous", user: null, login, signup });
});

describe("AuthScreen", () => {
  it("starts on the log in form with the username focused", () => {
    render(<AuthScreen />);

    expect(screen.getByText("log in")).toBeInTheDocument();
    expect(document.activeElement).toBe(username());
  });

  it("moves to the password with enter and logs in with enter", async () => {
    render(<AuthScreen />);

    fill("alice", "password123");
    expect(document.activeElement).toBe(password());
    fireEvent.keyDown(password(), { key: "Enter" });

    await waitFor(() => expect(login).toHaveBeenCalledWith("alice", "password123"));
    expect(signup).not.toHaveBeenCalled();
  });

  it("masks the password on screen", () => {
    const { container } = render(<AuthScreen />);

    fill("alice", "password123");

    const overlays = Array.from(container.querySelectorAll("[aria-hidden='true']")).map((o) => o.textContent);
    expect(overlays.join("")).not.toContain("password123");
    expect(overlays.some((o) => o?.startsWith("•".repeat(11)))).toBe(true);
  });

  it("cycles the fields with tab and the arrows", () => {
    render(<AuthScreen />);

    fireEvent.keyDown(username(), { key: "Tab" });
    expect(document.activeElement).toBe(password());

    fireEvent.keyDown(password(), { key: "ArrowUp" });
    expect(document.activeElement).toBe(username());

    fireEvent.keyDown(username(), { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button")).toHaveFocus();
  });

  it("switches to creating an account and signs up", async () => {
    render(<AuthScreen />);

    fireEvent.keyDown(username(), { key: "Tab", shiftKey: true });
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(screen.getByText("create account")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("button"), { key: "Tab" });
    fill("alice", "password123");
    fireEvent.keyDown(password(), { key: "Enter" });

    await waitFor(() => expect(signup).toHaveBeenCalledWith("alice", "password123"));
    expect(login).not.toHaveBeenCalled();
  });

  it("shows the server's error and lets the user try again", async () => {
    login.mockRejectedValueOnce(new Error("invalid username or password"));
    render(<AuthScreen />);

    fill("alice", "wrong-password");
    fireEvent.keyDown(password(), { key: "Enter" });

    expect(await screen.findByText(/invalid username or password/)).toBeInTheDocument();

    fireEvent.keyDown(password(), { key: "Enter" });
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
  });

  it("does not call the server with empty fields", () => {
    render(<AuthScreen />);

    fireEvent.keyDown(username(), { key: "Tab" });
    fireEvent.keyDown(password(), { key: "Enter" });

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText(/required/)).toBeInTheDocument();
  });
});
