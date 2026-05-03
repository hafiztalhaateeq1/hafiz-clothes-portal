import { NextResponse } from "next/server";

function dashboardPathForRole(role?: string | null) {
  const normalized = String(role ?? "").toLowerCase();
  if (normalized === "admin") return "/dashboard/admin";
  if (normalized === "wholesale") return "/dashboard/wholesale";
  return "/dashboard/retail";
}

function readSessionRole(cookieValue?: string) {
  if (!cookieValue) return null;
  try {
    const json = Buffer.from(cookieValue, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    return String(parsed?.role ?? "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const publicPaths = new Set([
    "/login",
    "/signup",
    "/register",
    "/manifest.json",
    "/sw.js",
  ]);

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

  // Read session from httpOnly cookie set by /api/login.
  // @ts-expect-error Next.js adds `cookies` to the request object in middleware runtime
  const cookieValue = request.cookies?.get?.("hch_session")?.value as string | undefined;
  const role = readSessionRole(cookieValue);
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

  if (!isAuthed && isProtected && !publicPaths.has(pathname)) {
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If already authenticated, keep auth screens from flashing.
  if (isAuthed && publicPaths.has(pathname)) {
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

