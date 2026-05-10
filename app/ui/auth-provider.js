"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "hafiz-auth-session";
const SESSION_STORAGE_KEY = "hafiz-auth-session-temporary";
const AUTH_TIMEOUT_MS = 5000;
const PUBLIC_PATHS = new Set(["/login", "/signup", "/register", "/pending", "/error"]);

const AuthContext = createContext(null);

function normalizeSession(sessionLike) {
  if (!sessionLike) {
    return null;
  }

  const normalizedRole = String(sessionLike.role ?? "").toLowerCase().trim();

  return {
    ...sessionLike,
    displayName: String(sessionLike.displayName ?? "").trim() || "User",
    role: normalizedRole || "retail",
  };
}

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
      return normalizeSession(JSON.parse(savedSession));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  });
  const [authResolved, setAuthResolved] = useState(false);

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

    const normalizedSession = normalizeSession(result.session);
    setSession(normalizedSession);

    if (typeof window !== "undefined") {
      // Persist session based on user preference:
      // - Remember Me: survive browser restarts (localStorage)
      // - Otherwise: survive refreshes but clear on browser close (sessionStorage)
      if (rememberMe) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSession));
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(normalizedSession)
        );
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    return normalizedSession;
  }

  function redirectIfNeeded(nextPath) {
    if (typeof window === "undefined") {
      return;
    }

    const currentPath = window.location.pathname;
    if (currentPath === nextPath) {
      return;
    }

    window.location.href = nextPath;
  }

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      console.warn("Auth bootstrap timed out. Falling back to resolved state.");
      setSession((currentSession) =>
        currentSession ? normalizeSession(currentSession) : null
      );
      setAuthResolved(true);

      if (typeof window !== "undefined" && !PUBLIC_PATHS.has(window.location.pathname)) {
        redirectIfNeeded("/login");
      }
    }, AUTH_TIMEOUT_MS);

    async function bootstrapAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth bootstrap error:", error);
        }

        if (!isActive) {
          return;
        }

        if (data?.session) {
          setSession((currentSession) => {
            if (currentSession) {
              return normalizeSession(currentSession);
            }

            return normalizeSession({
              displayName: "User",
              role: "guest",
            });
          });

          if (!session && typeof window !== "undefined" && window.location.pathname !== "/pending") {
            redirectIfNeeded("/pending");
          }
        } else {
          setSession((currentSession) =>
            currentSession ? normalizeSession(currentSession) : null
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (isActive) {
          setAuthResolved(true);
        }
      }
    }

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" || !nextSession) {
        setSession(null);
        setAuthResolved(true);

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
          redirectIfNeeded("/login");
        }
        return;
      }

      if (nextSession && typeof window !== "undefined") {
        const savedSession =
          window.localStorage.getItem(STORAGE_KEY) ??
          window.sessionStorage.getItem(SESSION_STORAGE_KEY);

        if (savedSession) {
          try {
            const parsedSession = normalizeSession(JSON.parse(savedSession));
            setSession(parsedSession);
          } catch {
            setSession((currentSession) => normalizeSession(currentSession));
          }
        } else {
          setSession(
            normalizeSession({
              displayName: "User",
              role: "guest",
            })
          );
          redirectIfNeeded("/pending");
        }

        setAuthResolved(true);
      }
    });

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    setSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase signOut error:", error);
    }

    // Best-effort: clear server-side auth cookie so middleware can stop treating the user as signed in.
    fetch("/api/logout", { method: "POST" }).catch(() => {});

    redirectIfNeeded("/login");
  }

  const value = useMemo(
    () => ({
      authResolved,
      hasMounted: true,
      isAuthenticated: Boolean(session && session.role !== "guest"),
      login,
      logout,
      session,
    }),
    [authResolved, session]
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
