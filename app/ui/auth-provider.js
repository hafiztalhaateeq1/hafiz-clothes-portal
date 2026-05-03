"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "hafiz-auth-session";
const SESSION_STORAGE_KEY = "hafiz-auth-session-temporary";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const savedSession =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!savedSession) {
      return null;
    }

    try {
      return JSON.parse(savedSession);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  });

  async function login(credentials) {
    const rememberMe = Boolean(credentials?.rememberMe);
    const payload = { ...credentials, rememberMe };

    if (typeof window !== "undefined") {
      console.log("AuthProvider.login payload:", {
        ...payload,
        password: payload.password ? "***" : "",
      });
    }

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (typeof window !== "undefined") {
      console.log("AuthProvider.login response:", { ok: response.ok, status: response.status, result });
    }

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to sign in.");
    }

    setSession(result.session);

    if (typeof window !== "undefined") {
      // Persist session based on user preference:
      // - Remember Me: survive browser restarts (localStorage)
      // - Otherwise: survive refreshes but clear on browser close (sessionStorage)
      if (rememberMe) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.session));
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(result.session)
        );
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    return result.session;
  }

  function logout() {
    setSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    // Best-effort: clear server-side auth cookie so middleware can stop treating the user as signed in.
    fetch("/api/logout", { method: "POST" }).catch(() => {});
  }

  const value = useMemo(
    () => ({
      hasMounted: true,
      isAuthenticated: Boolean(session),
      login,
      logout,
      session,
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
