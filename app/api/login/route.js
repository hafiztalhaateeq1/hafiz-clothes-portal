import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function inferCustomerRole(client) {
  const rawType = String(
    client?.trust_level ?? client?.customer_type ?? client?.account_type ?? client?.role ?? ""
  )
    .toLowerCase()
    .trim();

  // Your DB uses "Regular" for wholesale/trusted accounts in several places.
  if (rawType.includes("whole") || rawType.includes("regular")) {
    return "wholesale";
  }

  return "retail";
}

function normalizeRequestedRole(value) {
  const normalized = String(value ?? "").toLowerCase().trim();
  if (normalized === "wholesale") return "wholesale";
  if (normalized === "retail") return "retail";
  if (normalized === "management" || normalized === "admin") return "management";
  return "unknown";
}

function normalizeUserRole(value) {
  const normalized = String(value ?? "").toLowerCase().trim();
  if (normalized === "admin") return "admin";
  if (normalized === "wholesale") return "wholesale";
  if (normalized === "wholesale_pending") return "wholesale_pending";
  if (normalized === "retail") return "retail";
  return "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rememberMe = Boolean(body.rememberMe);
    const requestedRole = normalizeRequestedRole(body.requestedRole ?? body.role);

    const identifierRaw = String(body.identifier ?? body.email ?? body.phone ?? "").trim();
    const password = String(body.password ?? "");

    const expectedUsername = String(process.env.ADMIN_USERNAME ?? "Hafiz Talha")
      .trim()
      .toLowerCase();
    const expectedPassword = String(process.env.ADMIN_PASSWORD ?? "hafiz123");

    // Admin: username/email-style identifier + password.
    if (identifierRaw.toLowerCase() === expectedUsername) {
      if (!password) {
        return NextResponse.json(
          { error: "Please enter your password to sign in." },
          { status: 400 }
        );
      }
      if (password !== expectedPassword) {
        return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
      }

      const response = NextResponse.json({
        session: {
          role: "admin",
          customerId: null,
          displayName: "Hafiz Talha",
        },
      });

      const cookieValue = Buffer.from(
        JSON.stringify({
          role: "admin",
          customerId: null,
          displayName: "Hafiz Talha",
        })
      ).toString("base64url");

      response.cookies.set("hch_session", cookieValue, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}), // 30 days
      });

      return response;
    }

    // Customers: phone-as-email sign-in (password required).
    const phone = identifierRaw.replace(/[^\d]/g, "");

    if (!phone) {
      return NextResponse.json(
        { error: "Please enter your phone number or admin username." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: "Invalid Password" }, { status: 401 });
    }

    const emailIdentifier = `${phone}@hch.com`;

    const authResult = await supabase.auth.signInWithPassword({
      email: emailIdentifier,
      password,
    });

    console.log("API LOGIN auth:", {
      emailIdentifier,
      ok: !authResult.error,
      error: authResult.error?.message ?? null,
      userId: authResult.data?.user?.id ?? null,
    });

    if (authResult.error) {
      // Distinguish "not found" vs "wrong password" by checking clients existence.
      const existing = await supabase
        .from("clients")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

      if (existing.data) {
        return NextResponse.json({ error: "Invalid Password" }, { status: 401 });
      }

      return NextResponse.json(
        { error: "Account not found. Please Sign Up first." },
        { status: 404 }
      );
    }

    const user = authResult.data?.user;
    const metaRole = normalizeUserRole(user?.user_metadata?.role);

    // If metadata doesn't contain role, fall back to clients trust_level inference.
    let effectiveRole = metaRole || "retail";

    const { data: client } = await supabase
      .from("clients")
      // Use '*' so login doesn't break if optional columns (status/user_type) don't exist yet.
      .select("*")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (client && effectiveRole !== "admin") {
      const inferredBase = inferCustomerRole(client); // retail | wholesale
      const status = String(client?.status ?? "").toLowerCase().trim();
      const userType = String(client?.user_type ?? "").toLowerCase().trim();

      const isWholesaleAccount =
        inferredBase === "wholesale" || userType.includes("whole") || userType.includes("regular");

      if (isWholesaleAccount) {
        effectiveRole = status === "pending" ? "wholesale_pending" : "wholesale";
      } else {
        effectiveRole = "retail";
      }
    }

    // Strict role guard: prevent cross-login confusion.
    // We only apply this guard for customer sign-ins (not admin username flow above).
    if (requestedRole === "wholesale") {
      if (effectiveRole === "retail") {
        return NextResponse.json(
          { error: "Access Denied: Your account is for Retail. Please use the Retail login." },
          { status: 403 }
        );
      }
      if (effectiveRole === "wholesale_pending") {
        return NextResponse.json(
          { error: "Your wholesale account is pending Admin approval." },
          { status: 403 }
        );
      }
      if (effectiveRole !== "wholesale") {
        return NextResponse.json(
          { error: "Access Denied: Please use the correct login option for your account." },
          { status: 403 }
        );
      }
    }

    if (requestedRole === "retail") {
      if (effectiveRole === "wholesale") {
        return NextResponse.json(
          { error: "Access Denied: Your account is for Wholesale. Please use the Wholesale login." },
          { status: 403 }
        );
      }
      if (effectiveRole === "wholesale_pending") {
        return NextResponse.json(
          { error: "Your wholesale account is pending Admin approval." },
          { status: 403 }
        );
      }
      if (effectiveRole !== "retail") {
        return NextResponse.json(
          { error: "Access Denied: Please use the correct login option for your account." },
          { status: 403 }
        );
      }
    }

    if (requestedRole === "management") {
      // Management flow is username-based and handled above; if someone posts here, deny.
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }

    const session = {
      role: effectiveRole,
      customerId: client?.id ? String(client.id) : null,
      displayName: client?.name ?? user?.user_metadata?.full_name ?? "Customer",
      phone,
    };

    const response = NextResponse.json({
      session: {
        ...session,
      },
    });

    const cookieValue = Buffer.from(JSON.stringify(session)).toString("base64url");

    response.cookies.set("hch_session", cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to complete sign in right now." },
      { status: 500 }
    );
  }
}
