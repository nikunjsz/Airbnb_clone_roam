"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "./toast";
import {
  chooseDemoUser,
  getCurrentUser,
  getDemoUsers,
  login,
  logout,
  register,
  type User,
} from "@/lib/api";

type Mode = "menu" | "login" | "register" | "demo";
type ThemeMode = "light" | "dark" | "system";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [user, setUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("roam-theme") as ThemeMode) || "system";
    }
    return "system";
  });
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    getCurrentUser(controller.signal).then(setUser).catch(() => setUser(null));
    return () => controller.abort();
  }, []);

  const changeTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("roam-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (newTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  };

  async function openDemoUsers() {
    setError("");
    setMode("demo");
    try {
      setDemoUsers(await getDemoUsers());
    } catch {
      setError("Could not load demo profiles.");
      toast.error("Could not load demo profiles.");
    }
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const authenticated = mode === "register"
        ? await register({
            name: String(data.get("name")),
            email: String(data.get("email")),
            password: String(data.get("password")),
          })
        : await login({
            email: String(data.get("email")),
            password: String(data.get("password")),
          });
      setUser(authenticated);
      setMode("menu");
      setOpen(false);
      toast.success(`Welcome, ${authenticated.name}!`, mode === "register" ? "Account Created" : "Signed In");
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Authentication failed.";
      setError(msg);
      toast.error(msg);
    }
  }

  async function selectDemoUser(selected: User) {
    try {
      const switched = await chooseDemoUser(selected.id);
      setUser(switched);
      setMode("menu");
      setOpen(false);
      toast.info(`Switched active profile to ${switched.name}`, "Profile Switch");
    } catch {
      setError("Could not switch profile.");
      toast.error("Could not switch profile.");
    }
  }

  async function signOut() {
    await logout();
    setUser(null);
    setOpen(false);
    toast.info("You have signed out.", "Logged Out");
  }

  return (
    <div className="account-menu-wrap">
      <button
        className="account-btn"
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setMode("menu");
          setError("");
        }}
      >
        <span>☰</span>
        <span className="avatar">{user?.name.slice(0, 1).toUpperCase() ?? "●"}</span>
      </button>

      {open && (
        <section className="account-popover" aria-label="Account menu">
          {mode === "menu" && (
            <>
              {user ? (
                <>
                  <div className="account-user"><strong>{user.name}</strong><small>{user.email}</small></div>
                  <Link href="/trips">Trips</Link>
                  <Link href="/wishlists">Wishlists</Link>
                  {user.can_host && <Link href="/host">Manage listings</Link>}
                  <button type="button" onClick={openDemoUsers}>Switch demo profile</button>
                  <button type="button" onClick={signOut}>Log out</button>
                </>
              ) : (
                <>
                  <button className="strong" type="button" onClick={() => setMode("register")}>Sign up</button>
                  <button type="button" onClick={() => setMode("login")}>Log in</button>
                  <button type="button" onClick={openDemoUsers}>Use a demo profile</button>
                </>
              )}
              <hr className="menu-divider" />
              <div className="theme-toggle-row">
                <span>Theme</span>
                <div className="theme-buttons">
                  <button
                    type="button"
                    className={theme === "light" ? "active" : ""}
                    onClick={() => changeTheme("light")}
                    title="Light theme"
                  >
                    ☀️ Light
                  </button>
                  <button
                    type="button"
                    className={theme === "dark" ? "active" : ""}
                    onClick={() => changeTheme("dark")}
                    title="Dark theme"
                  >
                    🌙 Dark
                  </button>
                  <button
                    type="button"
                    className={theme === "system" ? "active" : ""}
                    onClick={() => changeTheme("system")}
                    title="System default theme"
                  >
                    💻 Auto
                  </button>
                </div>
              </div>
            </>
          )}

          {(mode === "login" || mode === "register") && (
            <form className="account-form" onSubmit={submitCredentials}>
              <button className="back" type="button" onClick={() => setMode("menu")}>← Back</button>
              <h2>{mode === "register" ? "Create your account" : "Welcome back"}</h2>
              {mode === "register" && <input name="name" placeholder="Name" required minLength={2} />}
              <input name="email" type="email" placeholder="Email" required />
              <input name="password" type="password" placeholder="Password" required minLength={8} />
              {error && <p className="form-error">{error}</p>}
              <button className="auth-submit" type="submit">{mode === "register" ? "Sign up" : "Log in"}</button>
            </form>
          )}

          {mode === "demo" && (
            <div className="demo-users">
              <button className="back" type="button" onClick={() => setMode("menu")}>← Back</button>
              <h2>Choose a demo profile</h2>
              {error && <p className="form-error">{error}</p>}
              {demoUsers.map((profile) => (
                <button type="button" key={profile.id} onClick={() => selectDemoUser(profile)}>
                  <span className="demo-avatar">{profile.name.slice(0, 1)}</span>
                  <span><strong>{profile.name}</strong><small>{profile.can_host ? "Guest and host" : "Guest"}</small></span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

