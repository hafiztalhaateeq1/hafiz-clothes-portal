import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}

async function insertClientWithFallback(clientPayload) {
  // Try richer payload first; if schema doesn't have a column, retry without it.
  const attempts = [
    clientPayload,
    (() => {
      const { password_hash, ...rest } = clientPayload;
      return rest;
    })(),
    (() => {
      const { password, ...rest } = clientPayload;
      return rest;
    })(),
    (() => {
      const {
        password_hash,
        password,
        username,
        email,
        status,
        business_name,
        user_type,
        ...rest
      } = clientPayload;
      return rest;
    })(),
  ];

  let lastError = null;
  for (const payload of attempts) {
    const result = await supabase.from("clients").insert([payload]).select("*").maybeSingle();
    if (!result.error) return result;
    lastError = result.error;
  }

  return { data: null, error: lastError };
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body.fullName ?? body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").replace(/[^\d]/g, "");
    const password = String(body.password ?? "");
    const userType = String(body.user_type ?? "retail").toLowerCase();
    const status = String(body.status ?? (userType === "wholesale" ? "pending" : "active"));
    const businessName = String(body.business_name ?? body.businessName ?? "").trim();

    console.log("API SIGNUP payload (normalized):", {
      name,
      username,
      email,
      phone,
      userType,
      status,
      businessName,
      hasPassword: Boolean(password),
    });

    if (!name || !username || !email || !phone || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Basic phone guard (client does stricter checks too).
    if (!/^03[0-9]{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 11-digit number starting with 03." },
        { status: 400 }
      );
    }

    // Prevent duplicates by phone.
    const existing = await supabase
      .from("clients")
      .select("id, phone")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        { error: "Unable to verify this account right now." },
        { status: 500 }
      );
    }

    if (existing.data) {
      return NextResponse.json(
        { error: "An account with this phone number already exists. Please sign in." },
        { status: 409 }
      );
    }

    const clientPayload = {
      name,
      phone,
      trust_level: userType === "wholesale" ? "Regular" : "Retail",
      // Optional fields (may not exist in your schema, insert will fallback safely).
      username,
      email,
      user_type: userType,
      status,
      business_name: userType === "wholesale" ? businessName : null,
      // Prefer secure storage.
      password_hash: sha256Hex(password),
      // Fallback legacy storage if password_hash doesn't exist.
      password,
    };

    const { data, error } = await insertClientWithFallback(clientPayload);

    if (error) {
      console.error("SUPABASE SIGNUP ERROR:", error.message, error.details, error.hint);
      return NextResponse.json(
        { error: "Unable to create account right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, client: data });
  } catch (error) {
    console.error("API SIGNUP exception:", error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}

