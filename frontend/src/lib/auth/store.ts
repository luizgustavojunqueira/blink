import { create } from "zustand";
import * as authApi from "../../api/auth";
import { setUnauthorizedHandler } from "../../api/client";
import type { UserResponse } from "../../types/backend";
import { reloadApp } from "./reload";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: UserResponse | null;
  boot: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,

  boot: async () => {
    setUnauthorizedHandler(() => {
      if (get().status === "authenticated") reloadApp();
    });

    try {
      const user = await authApi.getMe();
      set({ status: "authenticated", user });
    } catch {
      set({ status: "anonymous", user: null });
    }
  },

  login: async (username, password) => {
    await authApi.login({ username, password });
    reloadApp();
  },

  signup: async (username, password) => {
    await authApi.signup({ username, password });
    reloadApp();
  },

  logout: async () => {
    set({ status: "anonymous", user: null });
    try {
      await authApi.logout();
    } finally {
      reloadApp();
    }
  },

  changePassword: async (current, next) => {
    await authApi.changePassword({ current_password: current, new_password: next });
  },

  deleteAccount: async (password) => {
    await authApi.deleteAccount({ password });
    reloadApp();
  },
}));
