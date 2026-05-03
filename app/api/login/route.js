import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function inferCustomerRole(client, selectedRole) {
  const rawType = String(
    client?.customer_type ?? client?.account_type ?? client?.role ?? selectedRole ?? ""
  ).toLowerCase();

  if (rawType.includes("whole")) {
    return "wholesale";
  }

  return selectedRole === "wholesale" ? "wholesale" : "retail";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const role = String(body.role ?? "").toLowerCase();

    if (role === "admin") {
      const username = String(body.username ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const expectedUsername = String(
        process.env.ADMIN_USERNAME ?? "Hafiz Talha"
      ).trim().toLowerCase();
      const expectedPassword = String(process.env.ADMIN_PASSWORD ?? "hafiz123");

      if (username !== expectedUsername || password !== expectedPassword) {
        return NextResponse.json(
          { error: "Invalid admin credentials." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        session: {
          role: "admin",
          customerId: null,
          displayName: "Hafiz Talha",
        },
      });
    }

    const phone = String(body.phone ?? "").replace(/[^\d]/g, "");
    const providedName = String(body.name ?? "").trim();

    if (!phone && role !== "retail") {
      return NextResponse.json(
        { error: "Please enter the registered phone number." },
        { status: 400 }
      );
    }

    let client = null;

    if (phone) {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: "Unable to verify this customer account right now." },
          { status: 500 }
        );
      }

      client = data;
    }

    if (client) {
      const effectiveRole = inferCustomerRole(client, role);

      return NextResponse.json({
        session: {
          role: effectiveRole,
          customerId: String(client.id ?? ""),
          displayName: client.name ?? providedName ?? "Customer",
          phone: client.phone ?? phone,
        },
      });
    }

    if (role === "retail") {
      return NextResponse.json({
        session: {
          role: "retail",
          customerId: null,
          displayName: providedName || "Guest Customer",
          phone,
        },
      });
    }

    return NextResponse.json(
      { error: "No wholesale customer account was found with that phone number." },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to complete sign in right now." },
      { status: 500 }
    );
  }
}
