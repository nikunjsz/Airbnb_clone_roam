import { apiFetch } from "./client";
import type { User } from "./types";

export function getCurrentUser(signal?: AbortSignal): Promise<User> {
  return apiFetch<User>("/auth/me", { signal, cache: "no-store" });
}

export function getDemoUsers(signal?: AbortSignal): Promise<User[]> {
  return apiFetch<User[]>("/demo/users", { signal, cache: "no-store" });
}

export function chooseDemoUser(userId: number): Promise<User> {
  return apiFetch<User>("/demo/session", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export function register(payload: { name: string; email: string; password: string }): Promise<User> {
  return apiFetch<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function login(payload: { email: string; password: string }): Promise<User> {
  return apiFetch<User>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}
