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

async function signUpAuthAccount({ fullName, phoneNumber, password, role }) {
  const phoneAsEmail = `${phoneNumber}@hch.com`;

  const { data, error } = await supabase.auth.signUp({
    email: phoneAsEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phoneNumber,
        role,
      },
    },
  });

  return { data, error, phoneAsEmail };
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
        is_approved,
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
    const isApprovalRole = userType === "wholesale" || userType === "management";
    const status = String(body.status ?? (isApprovalRole ? "pending" : "active"));
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

    // Create Supabase Auth account using phone-as-email.
  const authSignup = await signUpAuthAccount({
    fullName: name,
    phoneNumber: phone,
    password,
    role:
      userType === "wholesale" && status !== "active"
        ? "wholesale_pending"
        : userType === "management" && status !== "active"
          ? "management_pending"
          : userType,
  });

    console.log("API SIGNUP auth:", {
      phoneAsEmail: authSignup.phoneAsEmail,
      hasUser: Boolean(authSignup.data?.user),
      hasSession: Boolean(authSignup.data?.session),
      error: authSignup.error?.message ?? null,
    });

    if (authSignup.error) {
      // Most common: user already exists in Auth for that email.
      return NextResponse.json(
        { error: authSignup.error.message ?? "Unable to create account right now." },
        { status: 400 }
      );
    }

    const clientPayload = {
      name,
      phone,
      trust_level:
        userType === "wholesale"
          ? "Regular"
          : userType === "management"
            ? "Management"
            : "Retail",
      // Optional fields (may not exist in your schema, insert will fallback safely).
      username,
      email,
      user_type: userType,
      status,
      is_approved: userType === "management" ? false : status === "active",
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

    return NextResponse.json({
      ok: true,
      client: data,
      auth: {
        email: authSignup.phoneAsEmail,
        userId: authSignup.data?.user?.id ?? null,
      },
    });
  } catch (error) {
    console.error("API SIGNUP exception:", error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}
