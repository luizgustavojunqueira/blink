import type {
  ChangePasswordRequest,
  Credentials,
  DeleteAccountRequest,
  UserResponse,
} from "../types/backend";
import { api } from "./client";

export function getMe() {
  return api<UserResponse>("/me");
}

export function login(credentials: Credentials) {
  return api<UserResponse>("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function signup(credentials: Credentials) {
  return api<UserResponse>("/auth/signup", { method: "POST", body: JSON.stringify(credentials) });
}

export function logout() {
  return api<void>("/auth/logout", { method: "POST" });
}

export function changePassword(req: ChangePasswordRequest) {
  return api<void>("/me/password", { method: "POST", body: JSON.stringify(req) });
}

export function deleteAccount(req: DeleteAccountRequest) {
  return api<void>("/me", { method: "DELETE", body: JSON.stringify(req) });
}
