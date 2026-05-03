import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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

export async function POST(request) {
  try {
    const body = await request.json();
    const rememberMe = Boolean(body.rememberMe);

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

    // Customers: phone-based lookup (password required).
    const phone = identifierRaw.replace(/[^\d]/g, "");

    if (!phone) {
      return NextResponse.json(
        { error: "Please enter your phone number or admin username." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
    }

    // Try to read a password field if it exists. We support either `password` (legacy)
    // or `password_hash` (sha256 hex).
    let lookup = await supabase
      .from("clients")
      .select("id, name, phone, trust_level, password, password_hash")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (lookup.error) {
      const msg = String(lookup.error.message ?? "");

      if (/password_hash/i.test(msg)) {
        lookup = await supabase
          .from("clients")
          .select("id, name, phone, trust_level, password")
          .eq("phone", phone)
          .limit(1)
          .maybeSingle();
      }

      if (lookup.error && /\bpassword\b/i.test(String(lookup.error.message ?? ""))) {
        lookup = await supabase
          .from("clients")
          .select("id, name, phone, trust_level")
          .eq("phone", phone)
          .limit(1)
          .maybeSingle();
      }
    }

    const { data: client, error } = lookup;

    if (error) {
      return NextResponse.json(
        { error: "Unable to verify this account right now." },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: "Account not found. Please Sign Up first." },
        { status: 404 }
      );
    }

    const storedHash = client?.password_hash ? String(client.password_hash) : "";
    const storedPassword = client?.password ? String(client.password) : "";

    if (storedHash) {
      const sha = crypto.createHash("sha256").update(password, "utf8").digest("hex");
      if (sha !== storedHash) {
        return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
      }
    } else if (storedPassword) {
      if (password !== storedPassword) {
        return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
      }
    } else {
      return NextResponse.json(
        { error: "Password authentication is not configured for customer accounts yet." },
        { status: 500 }
      );
    }

    const effectiveRole = inferCustomerRole(client);

    const session = {
      role: effectiveRole,
      customerId: String(client.id ?? ""),
      displayName: client.name ?? "Customer",
      phone: client.phone ?? phone,
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
