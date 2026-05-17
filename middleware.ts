import { NextRequest, NextResponse } from "next/server";

type PortalSession = {
  role?: string | null;
  status?: string | null;
};

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/catalogue",
  "/ledger",
  "/customers",
  "/expenses",
  "/reports",
];

function dashboardPathForRole(role?: string | null) {
  const normalizedRole = String(role ?? "").toLowerCase().trim();

  if (normalizedRole === "admin" || normalizedRole === "management") {
    return "/dashboard/admin";
  }

  if (normalizedRole === "wholesale") {
    return "/dashboard/wholesale";
  }

  return "/dashboard/retail";
}

function readSession(cookieValue?: string) {
  if (!cookieValue) {
    return null;
  }

  try {
    const json = Buffer.from(cookieValue, "base64url").toString("utf8");
    return JSON.parse(json) as PortalSession;
  } catch {
    return null;
  }
}

function isPendingSession(session?: PortalSession | null) {
  const role = String(session?.role ?? "").toLowerCase().trim();
  const status = String(session?.status ?? "").toLowerCase().trim();
  return status === "pending" || role.endsWith("_pending");
}

function isRejectedSession(session?: PortalSession | null) {
  const role = String(session?.role ?? "").toLowerCase().trim();
  const status = String(session?.status ?? "").toLowerCase().trim();
  return status === "rejected" || role.endsWith("_rejected");
}

function isActiveSession(session?: PortalSession | null) {
  const role = String(session?.role ?? "").toLowerCase().trim();
  const status = String(session?.status ?? "").toLowerCase().trim();
  return role === "admin" || status === "active";
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildRedirect(request: NextRequest, pathname: string, nextPath?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  if (nextPath) {
    url.searchParams.set("next", nextPath);
  } else {
    url.searchParams.delete("next");
  }

  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const parsedSession = readSession(request.cookies.get("hch_session")?.value);
  const role = String(parsedSession?.role ?? "").toLowerCase().trim();
  const hasSession = Boolean(parsedSession && role);
  const hasPendingSession = isPendingSession(parsedSession);
  const hasRejectedSession = isRejectedSession(parsedSession);
  const hasActiveSession = isActiveSession(parsedSession);
  const isProtected = isProtectedPath(pathname);
  const isRoot = pathname === "/";
  const isLogin = pathname === "/login";
  const isPendingApproval = pathname === "/pending-approval";
  const isSignup = pathname.startsWith("/signup");
  const isRegister = pathname === "/register";

  if (isRoot) {
    if (!hasSession) {
      return buildRedirect(request, "/login");
    }

    if (hasRejectedSession) {
      return buildRedirect(request, "/login");
    }

    if (hasPendingSession) {
      return buildRedirect(request, "/pending-approval");
    }

    if (!hasActiveSession) {
      return buildRedirect(request, "/login");
    }

    return buildRedirect(request, dashboardPathForRole(role));
  }

  if (isProtected) {
    if (!hasSession) {
      return buildRedirect(request, "/login", pathname);
    }

    if (hasRejectedSession) {
      return buildRedirect(request, "/login");
    }

    if (hasPendingSession) {
      return isPendingApproval ? response : buildRedirect(request, "/pending-approval");
    }

    if (!hasActiveSession) {
      return buildRedirect(request, "/login");
    }

    return response;
  }

  if (isPendingApproval) {
    if (!hasSession) {
      return buildRedirect(request, "/login");
    }

    if (hasRejectedSession) {
      return buildRedirect(request, "/login");
    }

    if (hasPendingSession) {
      return response;
    }

    if (hasActiveSession) {
      return buildRedirect(request, dashboardPathForRole(role));
    }

    return buildRedirect(request, "/login");
  }

  if (isLogin || isSignup || isRegister) {
    if (!hasSession) {
      return response;
    }

    if (hasRejectedSession) {
      return isLogin ? response : buildRedirect(request, "/login");
    }

    if (hasPendingSession) {
      return buildRedirect(request, "/pending-approval");
    }

    if (hasActiveSession) {
      return buildRedirect(request, dashboardPathForRole(role));
    }

    return buildRedirect(request, "/login");
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup/:path*",
    "/register",
    "/pending-approval",
    "/dashboard/:path*",
    "/catalogue/:path*",
    "/ledger/:path*",
    "/customers/:path*",
    "/expenses/:path*",
    "/reports/:path*",
  ],
};
