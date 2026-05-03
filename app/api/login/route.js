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

export async function POST(request) {
  try {
    const body = await request.json();

    const identifierRaw = String(body.identifier ?? body.email ?? body.phone ?? "").trim();
    const password = String(body.password ?? "");

    const expectedUsername = String(process.env.ADMIN_USERNAME ?? "Hafiz Talha")
      .trim()
      .toLowerCase();
    const expectedPassword = String(process.env.ADMIN_PASSWORD ?? "hafiz123");

    // Admin: username/email-style identifier + password.
    if (identifierRaw.toLowerCase() === expectedUsername) {
      if (password !== expectedPassword) {
        return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
      }

      return NextResponse.json({
        session: {
          role: "admin",
          customerId: null,
          displayName: "Hafiz Talha",
        },
      });
    }

    // Customers: phone-based lookup. (Password is optional for now.)
    const phone = identifierRaw.replace(/[^\d]/g, "");

    if (!phone) {
      return NextResponse.json(
        { error: "Please enter your phone number or admin username." },
        { status: 400 }
      );
    }

    const { data: client, error } = await supabase
      .from("clients")
      .select("id, name, phone, trust_level")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

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

    const effectiveRole = inferCustomerRole(client);

    return NextResponse.json({
      session: {
        role: effectiveRole,
        customerId: String(client.id ?? ""),
        displayName: client.name ?? "Customer",
        phone: client.phone ?? phone,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to complete sign in right now." },
      { status: 500 }
    );
  }
}
