import { NextResponse } from "next/server";

function buildExpiredCookieOptions(isSecure) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

function isAuthCookieName(name) {
  return (
    name === "hch_session" ||
    name.startsWith("sb-") ||
    name.includes("supabase") ||
    name.includes("auth-token")
  );
}

export async function POST(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isSecure =
    process.env.NODE_ENV === "production" || forwardedProto === "https";
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );

  const expiredCookieOptions = buildExpiredCookieOptions(isSecure);
  const requestCookies = request.cookies.getAll();
  const authCookieNames = new Set(
    requestCookies.filter((cookie) => isAuthCookieName(cookie.name)).map((cookie) => cookie.name)
  );

  authCookieNames.add("hch_session");

  authCookieNames.forEach((cookieName) => {
    response.cookies.set(cookieName, "", expiredCookieOptions);
  });

  return response;
}
