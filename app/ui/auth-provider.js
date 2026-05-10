"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname);
}

function clearBrowserStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.clear();
  window.sessionStorage.clear();
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
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const invalidateStaleSession = useCallback(async (reason, error = null) => {
    console.error("Invalidating stale session:", reason, error);
    setSession(null);
    setAuthResolved(true);

    clearBrowserStorage();

    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Supabase signOut error:", signOutError);
    }

    fetch("/api/logout", { method: "POST" }).catch(() => {});

    if (typeof window !== "undefined" && !isPublicPath(window.location.pathname)) {
      redirectIfNeeded("/login");
    }
  }, []);

  const hydrateFreshSession = useCallback(async (cachedSession) => {
    const normalizedCachedSession = normalizeSession(cachedSession);

    if (!normalizedCachedSession) {
      return null;
    }

    const role = String(normalizedCachedSession.role ?? "").toLowerCase().trim();
    const recordId = String(normalizedCachedSession.customerId ?? "").trim();

    if (role === "admin" || !recordId) {
      return normalizedCachedSession;
    }

    try {
      if (role.startsWith("management")) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, phone, role, status")
          .eq("id", recordId)
          .maybeSingle();

        if (error) {
          await invalidateStaleSession("profiles fetch failed", error);
          return null;
        }

        if (!data) {
          await invalidateStaleSession("profile missing after session check");
          return null;
        }

        return normalizeSession({
          ...normalizedCachedSession,
          customerId: String(data.id ?? recordId),
          displayName: String(data.username ?? "").trim() || "User",
          phone: String(data.phone ?? "").trim() || null,
          role: String(data.role ?? "").trim().toLowerCase() || normalizedCachedSession.role,
          status: String(data.status ?? "").trim().toLowerCase() || null,
        });
      }

      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, status, user_type, trust_level, account_type, customer_type")
        .eq("id", recordId)
        .maybeSingle();

      if (error) {
        await invalidateStaleSession("clients fetch failed", error);
        return null;
      }

      if (!data) {
        await invalidateStaleSession("client missing after session check");
        return null;
      }

      const rawUserType = String(
        data.user_type ?? data.trust_level ?? data.account_type ?? data.customer_type ?? ""
      )
        .toLowerCase()
        .trim();
      const normalizedStatus = String(data.status ?? "").toLowerCase().trim();
      const isWholesale =
        rawUserType.includes("whole") || rawUserType.includes("regular");
      const nextRole = isWholesale
        ? normalizedStatus === "pending"
          ? "wholesale_pending"
          : "wholesale"
        : "retail";

      return normalizeSession({
        ...normalizedCachedSession,
        customerId: String(data.id ?? recordId),
        displayName: String(data.name ?? "").trim() || "User",
        phone: String(data.phone ?? "").trim() || null,
        role: nextRole,
        status: normalizedStatus || null,
      });
    } catch (error) {
      await invalidateStaleSession("fresh profile hydration failed", error);
      return null;
    }
  }, [invalidateStaleSession]);

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
      invalidateStaleSession("auth bootstrap timed out");
    }, AUTH_TIMEOUT_MS);

    async function bootstrapAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth bootstrap error:", error);
          await invalidateStaleSession("auth bootstrap returned error", error);
          return;
        }

        if (!isActive) {
          return;
        }

        const savedSession =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY) ??
              window.sessionStorage.getItem(SESSION_STORAGE_KEY)
            : null;

        let cachedSession = null;
        if (savedSession) {
          try {
            cachedSession = JSON.parse(savedSession);
          } catch (parseError) {
            await invalidateStaleSession("cached session parse failed", parseError);
            return;
          }
        }

        if (data?.session) {
          const refreshedSession = await hydrateFreshSession(
            cachedSession ?? sessionRef.current ?? {
              customerId: data.session.user?.id ?? null,
              displayName:
                data.session.user?.user_metadata?.username ??
                data.session.user?.user_metadata?.full_name ??
                data.session.user?.email ??
                "User",
              phone: data.session.user?.phone ?? null,
              role:
                data.session.user?.user_metadata?.role ??
                data.session.user?.app_metadata?.role ??
                "guest",
            }
          );

          if (!isActive) {
            return;
          }

          if (refreshedSession) {
            setSession(refreshedSession);
            if (typeof window !== "undefined") {
              if (window.localStorage.getItem(STORAGE_KEY)) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedSession));
              } else if (window.sessionStorage.getItem(SESSION_STORAGE_KEY)) {
                window.sessionStorage.setItem(
                  SESSION_STORAGE_KEY,
                  JSON.stringify(refreshedSession)
                );
              }
            }
          }
        } else {
          if (cachedSession) {
            const refreshedSession = await hydrateFreshSession(cachedSession);

            if (!isActive) {
              return;
            }

            if (refreshedSession) {
              setSession(refreshedSession);
            }
            return;
          }

          setSession(null);
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
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "SIGNED_OUT" || !nextSession) {
        setSession(null);
        setAuthResolved(true);

        clearBrowserStorage();
        fetch("/api/logout", { method: "POST" }).catch(() => {});
        if (typeof window !== "undefined" && !isPublicPath(window.location.pathname)) {
          redirectIfNeeded("/login");
        }
        return;
      }

      if (
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED" ||
          event === "INITIAL_SESSION") &&
        nextSession &&
        typeof window !== "undefined"
      ) {
        const savedSession =
          window.localStorage.getItem(STORAGE_KEY) ??
          window.sessionStorage.getItem(SESSION_STORAGE_KEY);

        let parsedSession = null;
        if (savedSession) {
          try {
            parsedSession = JSON.parse(savedSession);
          } catch (parseError) {
            await invalidateStaleSession("auth state cached session parse failed", parseError);
            return;
          }
        }

        const refreshedSession = await hydrateFreshSession(
          parsedSession ?? {
            customerId: nextSession.user?.id ?? null,
            displayName:
              nextSession.user?.user_metadata?.username ??
              nextSession.user?.user_metadata?.full_name ??
              nextSession.user?.email ??
              "User",
            phone: nextSession.user?.phone ?? null,
            role:
              nextSession.user?.user_metadata?.role ??
              nextSession.user?.app_metadata?.role ??
              "guest",
          }
        );

        if (!isActive) {
          return;
        }

        if (refreshedSession) {
          setSession(refreshedSession);
        }
        setAuthResolved(true);
      }
    });

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [hydrateFreshSession, invalidateStaleSession]);

  const logout = useCallback(async () => {
    setSession(null);

    clearBrowserStorage();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase signOut error:", error);
    }

    // Best-effort: clear server-side auth cookie so middleware can stop treating the user as signed in.
    fetch("/api/logout", { method: "POST" }).catch(() => {});

    redirectIfNeeded("/login");
  }, []);

  const value = useMemo(
    () => ({
      authResolved,
      hasMounted: true,
      isAuthenticated: Boolean(session && session.role !== "guest"),
      login,
      logout,
      session,
    }),
    [authResolved, logout, session]
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
