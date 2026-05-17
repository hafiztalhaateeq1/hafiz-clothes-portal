"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "hafiz-auth-session";
const SESSION_STORAGE_KEY = "hafiz-auth-session-temporary";
const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/register",
  "/pending",
  "/pending-approval",
  "/error",
]);

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
    status: String(sessionLike.status ?? "").toLowerCase().trim() || null,
  };
}

function isPublicPath(pathname) {
  return pathname.startsWith("/signup") || PUBLIC_PATHS.has(pathname);
}

function isPendingSession(sessionLike) {
  const role = String(sessionLike?.role ?? "").toLowerCase().trim();
  const status = String(sessionLike?.status ?? "").toLowerCase().trim();
  return status === "pending" || role.endsWith("_pending");
}

function isRejectedSession(sessionLike) {
  const role = String(sessionLike?.role ?? "").toLowerCase().trim();
  const status = String(sessionLike?.status ?? "").toLowerCase().trim();
  return status === "rejected" || role.endsWith("_rejected");
}

function isAbortLikeError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.name === "AbortError" || message.includes("aborted");
}

function buildFallbackSession(authSession, sessionLike = null) {
  const source = authSession?.user ?? {};
  const fallbackRole = String(
    sessionLike?.role ??
      source.user_metadata?.role ??
      source.app_metadata?.role ??
      "retail"
  )
    .toLowerCase()
    .trim();

  return normalizeSession({
    customerId: String(sessionLike?.customerId ?? source.id ?? "").trim() || null,
    displayName:
      String(
        sessionLike?.displayName ??
          source.user_metadata?.username ??
          source.user_metadata?.full_name ??
          source.email ??
          "User"
      ).trim() || "User",
    phone:
      String(sessionLike?.phone ?? source.user_metadata?.phone ?? source.phone ?? "").trim() ||
      null,
    role: fallbackRole || "retail",
    status: String(sessionLike?.status ?? "active").toLowerCase().trim() || "active",
  });
}

function buildBootstrapFallbackSession(authSession, sessionLike = null) {
  const baseSession = buildFallbackSession(authSession, sessionLike);

  return normalizeSession({
    ...baseSession,
    role: "admin",
    status: "active",
  });
}

async function fetchApprovalProfileByPhone(phone) {
  const normalizedPhone = String(phone ?? "").replace(/[^\d]/g, "");

  if (!normalizedPhone) {
    return { data: null, error: null };
  }

  return supabase
    .from("profiles")
    .select("id, username, phone, role, status")
    .eq("phone", normalizedPhone)
    .in("role", [
      "wholesale_pending",
      "management_pending",
      "wholesale_rejected",
      "management_rejected",
      "wholesale",
      "management",
    ])
    .limit(1)
    .maybeSingle();
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function clearBrowserState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.clear();
  window.sessionStorage.clear();

  if (typeof document !== "undefined") {
    document.cookie.split(";").forEach((cookie) => {
      const cookieName = cookie.split("=")[0]?.trim();
      if (!cookieName) {
        return;
      }

      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
    });
  }
}

function clearAuthCookiesOnClient() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const expiredAt = "Thu, 01 Jan 1970 00:00:00 GMT";
  const cookieNames = new Set(["hch_session"]);

  document.cookie.split(";").forEach((cookie) => {
    const cookieName = cookie.split("=")[0]?.trim();
    if (!cookieName) {
      return;
    }

    if (
      cookieName === "hch_session" ||
      cookieName.startsWith("sb-") ||
      cookieName.includes("supabase") ||
      cookieName.includes("auth-token")
    ) {
      cookieNames.add(cookieName);
    }
  });

  cookieNames.forEach((cookieName) => {
    const cookieFragments = [
      `${cookieName}=`,
      `expires=${expiredAt}`,
      "max-age=0",
      "path=/",
      "SameSite=Lax",
      "Secure",
    ];

    document.cookie = cookieFragments.join("; ");
    document.cookie = `${cookieFragments.join("; ")}; domain=${window.location.hostname}`;
  });
}

export function AuthProvider({ children }) {
  const pathname = usePathname();
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
  const [authLoading, setAuthLoading] = useState(true);
  const sessionRef = useRef(session);
  const rejectionHandledRef = useRef(false);
  const logoutInProgressRef = useRef(false);
  const bootstrapInProgressRef = useRef(true);
  const hasFetchedRef = useRef(false);
  const authLoadingRef = useRef(authLoading);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    authLoadingRef.current = authLoading;
  }, [authLoading]);

  const resetAuthState = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
    setAuthResolved(true);
    setAuthLoading(false);
  }, []);

  async function invalidateStaleSession(reason, error = null) {
    if (logoutInProgressRef.current) {
      return;
    }

    console.error("Invalidating stale session:", reason, error);
    resetAuthState();

    clearStoredSession();

    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Supabase signOut error:", signOutError);
    }

    fetch("/api/logout", { method: "POST" }).catch(() => {});

    if (typeof window !== "undefined" && !isPublicPath(window.location.pathname)) {
      redirectIfNeeded("/login");
    }
  }

  const rejectSessionAccess = useCallback(async () => {
    if (rejectionHandledRef.current || logoutInProgressRef.current) {
      return;
    }

    rejectionHandledRef.current = true;
    resetAuthState();
    clearStoredSession();

    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Supabase signOut error:", signOutError);
    }

    fetch("/api/logout", { method: "POST" }).catch(() => {});

    if (typeof window !== "undefined") {
      alert("Your account application has been rejected by the admin.");
    }

    redirectIfNeeded("/login");
  }, [resetAuthState]);

  const hydrateFreshSession = useCallback(async (cachedSession, authSession = null) => {
    const normalizedCachedSession = normalizeSession(cachedSession);

    if (!normalizedCachedSession) {
      return authSession ? buildBootstrapFallbackSession(authSession, cachedSession) : null;
    }

    const role = String(normalizedCachedSession.role ?? "").toLowerCase().trim();
    const recordId = String(normalizedCachedSession.customerId ?? "").trim();

    if (role === "admin" || !recordId) {
      return normalizedCachedSession;
    }

    try {
      if (role.startsWith("management") || role.endsWith("_pending")) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, phone, role, status")
          .eq("id", recordId)
          .maybeSingle();

        if (error) {
          console.warn("Auth profile fetch warning:", error);
          return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
        }

        if (!data) {
          return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
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
        console.warn("Auth client fetch warning:", error);
        return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
      }

      if (!data) {
        return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
      }

      const approvalProfileResult = await fetchApprovalProfileByPhone(
        data.phone ?? normalizedCachedSession.phone
      );

      if (approvalProfileResult.error) {
        console.warn("Auth approval profile fetch warning:", approvalProfileResult.error);
        return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
      }

      const approvalProfile = approvalProfileResult.data ?? null;
      const approvalStatus = String(approvalProfile?.status ?? "").toLowerCase().trim();
      const approvalRole = String(approvalProfile?.role ?? "").toLowerCase().trim();

      if (approvalStatus === "pending") {
        return normalizeSession({
          ...normalizedCachedSession,
          customerId:
            String(approvalProfile?.id ?? normalizedCachedSession.customerId ?? data.id ?? "").trim() ||
            null,
          displayName:
            String(approvalProfile?.username ?? "").trim() ||
            String(data.name ?? "").trim() ||
            "User",
          phone: String(approvalProfile?.phone ?? data.phone ?? "").trim() || null,
          role: approvalRole || "wholesale_pending",
          status: "pending",
        });
      }

      if (approvalStatus === "rejected") {
        return normalizeSession({
          ...normalizedCachedSession,
          customerId:
            String(approvalProfile?.id ?? normalizedCachedSession.customerId ?? data.id ?? "").trim() ||
            null,
          displayName:
            String(approvalProfile?.username ?? "").trim() ||
            String(data.name ?? "").trim() ||
            "User",
          phone: String(approvalProfile?.phone ?? data.phone ?? "").trim() || null,
          role: approvalRole || "wholesale_rejected",
          status: "rejected",
        });
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
          : normalizedStatus === "rejected"
            ? "wholesale_rejected"
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
      if (isAbortLikeError(error)) {
        console.log("Auth hydration aborted safely");
        return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
      }

      console.warn("Fresh profile hydration warning:", error);
      return buildBootstrapFallbackSession(authSession, normalizedCachedSession);
    }
  }, []);

  const login = useCallback(async (credentials) => {
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

    if (isRejectedSession(normalizedSession)) {
      await rejectSessionAccess();
      throw new Error("Your account application has been rejected by the admin.");
    }

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

    rejectionHandledRef.current = false;
    return normalizedSession;
  }, [rejectSessionAccess]);

  const primeSession = useCallback((sessionLike, options = {}) => {
    const rememberMe = Boolean(options?.rememberMe);
    const normalizedSession = normalizeSession(sessionLike);

    setSession(normalizedSession);
    setAuthResolved(true);
    setAuthLoading(false);

    if (typeof window !== "undefined" && normalizedSession) {
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
  }, []);

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
    if (hasFetchedRef.current) {
      return undefined;
    }

    hasFetchedRef.current = true;

    let isActive = true;
    const failSafeTimeout = window.setTimeout(() => {
      console.warn("Auth bootstrap fail-safe released loading after 2000ms.");
      setAuthResolved(true);
      setAuthLoading(false);
    }, 2000);

    async function bootstrapAuth() {
      if (logoutInProgressRef.current) {
        return;
      }

      bootstrapInProgressRef.current = true;
      setAuthLoading(true);

      let authSession = null;
      let cachedSession = null;

      try {
        const { data, error } = await supabase.auth.getSession();
        authSession = data?.session ?? null;

        if (error) {
          throw error;
        }

        const savedSession =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY) ??
              window.sessionStorage.getItem(SESSION_STORAGE_KEY)
            : null;

        if (savedSession) {
          try {
            cachedSession = JSON.parse(savedSession);
          } catch (parseError) {
            console.warn("Cached session parse warning:", parseError);
            cachedSession = null;
          }
        }

        if (!isActive || logoutInProgressRef.current) {
          return;
        }

        if (authSession) {
          const baseSession =
            cachedSession ??
            sessionRef.current ?? {
              customerId: authSession.user?.id ?? null,
              displayName:
                authSession.user?.user_metadata?.username ??
                authSession.user?.user_metadata?.full_name ??
                authSession.user?.email ??
                "User",
              phone: authSession.user?.phone ?? null,
              role:
                authSession.user?.user_metadata?.role ??
                authSession.user?.app_metadata?.role ??
                "guest",
            };

          const refreshedSession = await hydrateFreshSession(baseSession, authSession);

          if (!isActive || logoutInProgressRef.current) {
            return;
          }

          const nextSession =
            refreshedSession ?? buildBootstrapFallbackSession(authSession, cachedSession);

          if (isRejectedSession(nextSession)) {
            await rejectSessionAccess();
            return;
          }

          setSession(nextSession);
          if (typeof window !== "undefined") {
            if (window.localStorage.getItem(STORAGE_KEY)) {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
            } else if (window.sessionStorage.getItem(SESSION_STORAGE_KEY)) {
              window.sessionStorage.setItem(
                SESSION_STORAGE_KEY,
                JSON.stringify(nextSession)
              );
            }

            if (
              isPendingSession(nextSession) &&
              window.location.pathname !== "/pending-approval"
            ) {
              redirectIfNeeded("/pending-approval");
            }
          }

          return;
        }

        if (cachedSession) {
          const refreshedSession = await hydrateFreshSession(cachedSession, null);

          if (!isActive || logoutInProgressRef.current) {
            return;
          }

          if (refreshedSession) {
            if (isRejectedSession(refreshedSession)) {
              await rejectSessionAccess();
              return;
            }

            setSession(refreshedSession);
          } else {
            setSession(null);
          }

          return;
        }

        setSession(null);
      } catch (error) {
        if (isAbortLikeError(error)) {
          console.log("Auth bootstrap aborted safely");
        } else {
          console.warn("Auth bootstrap catch warning:", error);
        }

        if (!logoutInProgressRef.current) {
          if (authSession) {
            setSession(buildBootstrapFallbackSession(authSession, cachedSession));
          } else {
            setSession((currentSession) => currentSession ?? null);
          }
        }
      } finally {
        bootstrapInProgressRef.current = false;
        setAuthResolved(true);
        setAuthLoading(false);
      }
    }

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (logoutInProgressRef.current && event !== "SIGNED_OUT") {
        return;
      }

      if (event === "SIGNED_OUT") {
        rejectionHandledRef.current = false;
        resetAuthState();
        clearBrowserState();
        fetch("/api/logout", { method: "POST" }).catch(() => {});
        if (typeof window !== "undefined" && !isPublicPath(window.location.pathname)) {
          redirectIfNeeded("/login");
        }
        return;
      }

      if (!nextSession) {
        if (bootstrapInProgressRef.current || authLoadingRef.current) {
          return;
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
        setAuthLoading(true);

        const savedSession =
          window.localStorage.getItem(STORAGE_KEY) ??
          window.sessionStorage.getItem(SESSION_STORAGE_KEY);

        let parsedSession = null;
        if (savedSession) {
          try {
            parsedSession = JSON.parse(savedSession);
          } catch (parseError) {
            console.warn("Auth state cached session parse warning:", parseError);
            parsedSession = null;
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
          },
          nextSession
        );

        if (!isActive || logoutInProgressRef.current) {
          return;
        }

        if (refreshedSession) {
          if (isRejectedSession(refreshedSession)) {
            await rejectSessionAccess();
            return;
          }

          setSession(refreshedSession);
          if (
            isPendingSession(refreshedSession) &&
            window.location.pathname !== "/pending-approval"
          ) {
            redirectIfNeeded("/pending-approval");
          }
        } else {
          setSession(buildBootstrapFallbackSession(nextSession, parsedSession));
        }
        setAuthResolved(true);
        setAuthLoading(false);
      }
    });

    return () => {
      isActive = false;
      window.clearTimeout(failSafeTimeout);
      subscription.unsubscribe();
    };
  }, [hydrateFreshSession, rejectSessionAccess, resetAuthState]);

  useEffect(() => {
    if (logoutInProgressRef.current || !authResolved || !session) {
      return;
    }

    if (pathname === "/pending-approval") {
      return;
    }

    if (isRejectedSession(session)) {
      rejectSessionAccess();
      return;
    }

    if (
      isPendingSession(session) &&
      pathname &&
      pathname !== "/pending-approval" &&
      !isPublicPath(pathname)
    ) {
      redirectIfNeeded("/pending-approval");
    }
  }, [authResolved, pathname, rejectSessionAccess, session]);

  const logout = useCallback(async () => {
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;
    setAuthLoading(true);
    rejectionHandledRef.current = false;
    resetAuthState();
    clearBrowserState();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Supabase signOut error:", error);
    } finally {
      clearAuthCookiesOnClient();

      // Best-effort: clear server-side auth cookie so middleware can stop treating the user as signed in.
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }).catch(() => {});

      if (typeof window !== "undefined") {
        clearAuthCookiesOnClient();

        try {
          const registrations = await navigator.serviceWorker?.getRegistrations?.();
          await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
        } catch (serviceWorkerError) {
          console.error("Service worker cleanup error:", serviceWorkerError);
        }

        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
        } catch (cacheError) {
          console.error("Cache cleanup error:", cacheError);
        }

        window.location.href = "/login";
      }
    }
  }, [resetAuthState]);

  const value = useMemo(
    () => ({
      authLoading,
      authResolved,
      hasMounted: true,
      isAuthenticated: Boolean(session && session.role !== "guest"),
      login,
      logout,
      primeSession,
      session,
    }),
    [authLoading, authResolved, login, logout, primeSession, session]
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
