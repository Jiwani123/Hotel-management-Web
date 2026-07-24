/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAccessToken } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const idleMs = 10 * 60 * 1000;

  useEffect(() => {
    let active = true;
    async function boot() {
      try {
        const res = await api.post("/auth/refresh");
        const data = res.data?.data;
        if (!active) return;
        setUser(data?.user ?? null);
        setAccessToken(data?.accessToken ?? null);
      } catch {
        if (!active) return;
        setUser(null);
        setAccessToken(null);
      } finally {
        if (active) setReady(true);
      }
    }
    boot();
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthed: !!user,
    ready,
    async logoutLocal() {
      setUser(null);
      setAccessToken(null);
    },
    async login(email, password) {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data?.data;
      setUser(data?.user ?? null);
      setAccessToken(data?.accessToken ?? null);
      return data;
    },
    async logout() {
      try {
        if (navigator.onLine) {
          await api.post("/auth/logout");
        }
      } catch {
        // Ignore network errors on logout.
      } finally {
        setUser(null);
        setAccessToken(null);
      }
    },
  }), [user, ready]);

  useEffect(() => {
    if (!user) return undefined;

    let lastActive = Date.now();

    const touch = () => {
      lastActive = Date.now();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        touch();
      }
    };

    const interval = setInterval(() => {
      if (Date.now() - lastActive >= idleMs) {
        value.logout();
      }
    }, 30 * 1000);

    window.addEventListener("mousemove", touch);
    window.addEventListener("keydown", touch);
    window.addEventListener("click", touch);
    window.addEventListener("scroll", touch);
    window.addEventListener("touchstart", touch);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("click", touch);
      window.removeEventListener("scroll", touch);
      window.removeEventListener("touchstart", touch);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, idleMs, value]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
