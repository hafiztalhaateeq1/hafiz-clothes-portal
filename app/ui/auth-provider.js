"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "hafiz-auth-session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const savedSession = window.localStorage.getItem(STORAGE_KEY);

    if (!savedSession) {
      return null;
    }

    try {
      return JSON.parse(savedSession);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  async function login(credentials) {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to sign in.");
    }

    setSession(result.session);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.session));
    }

    return result.session;
  }

  function logout() {
    setSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
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
