import { NextResponse } from "next/server";

function dashboardPathForRole(role?: string | null) {
  const normalized = String(role ?? "").toLowerCase();
  if (normalized === "admin" || normalized === "management") return "/dashboard/admin";
  if (normalized === "wholesale") return "/dashboard/wholesale";
  return "/dashboard/retail";
}

function readSession(cookieValue?: string) {
  if (!cookieValue) return null;
  try {
    const json = Buffer.from(cookieValue, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isPendingSession(session?: { role?: string | null; status?: string | null } | null) {
  const role = String(session?.role ?? "").toLowerCase().trim();
  const status = String(session?.status ?? "").toLowerCase().trim();
  return status === "pending" || role.endsWith("_pending");
}

function isRejectedSession(session?: { role?: string | null; status?: string | null } | null) {
  const role = String(session?.role ?? "").toLowerCase().trim();
  const status = String(session?.status ?? "").toLowerCase().trim();
  return status === "rejected" || role.endsWith("_rejected");
}

function isActiveSession(session?: { status?: string | null; role?: string | null } | null) {
  const role = String(session?.role ?? "").toLowerCase().trim();
  const status = String(session?.status ?? "").toLowerCase().trim();
  return role === "admin" || status === "active";
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/signup") ||
    pathname === "/register" ||
    pathname === "/pending-approval" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  );
}

export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Skip Next internals and API routes.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|txt)$/)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/signup")) {
    return NextResponse.next();
  }

  if (pathname === "/pending-approval") {
    return NextResponse.next();
  }

  // Read session from httpOnly cookie set by /api/login.
  // @ts-expect-error Next.js adds `cookies` to the request object in middleware runtime
  const cookieValue = request.cookies?.get?.("hch_session")?.value as string | undefined;
  const parsedSession = readSession(cookieValue);
  const role = String(parsedSession?.role ?? "").toLowerCase() || null;
  const hasPendingSession = isPendingSession(parsedSession);
  const hasRejectedSession = isRejectedSession(parsedSession);
  const hasActiveSession = isActiveSession(parsedSession);
  const isAuthed = Boolean(role);

  // Root and dashboards should never render for unauthenticated users.
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/catalogue") ||
    pathname.startsWith("/ledger") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/reports");

  if (!isAuthed && isProtected && !isPublicPath(pathname)) {
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed && hasRejectedSession) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthed && hasPendingSession) {
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

  if (isAuthed && !hasActiveSession && isProtected && pathname !== "/pending-approval") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthed && !hasPendingSession && pathname === "/pending-approval") {
    url.pathname = dashboardPathForRole(role);
    return NextResponse.redirect(url);
  }

  // If already authenticated, keep auth screens from flashing.
  if (isAuthed && isPublicPath(pathname)) {
    url.pathname = dashboardPathForRole(role);
    return NextResponse.redirect(url);
  }

  // If authenticated and hitting /, send to role dashboard (prevents any / flash).
  if (isAuthed && pathname === "/") {
    url.pathname = dashboardPathForRole(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
