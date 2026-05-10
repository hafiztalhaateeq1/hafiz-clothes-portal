import { supabase } from "@/lib/supabase";

const EXACT_PENDING_STATUS = "pending";
const EXACT_MANAGEMENT_ROLE = "management_pending";
const EXACT_WHOLESALE_ROLE = "wholesale_pending";
const CUSTOMER_PENDING_ROLES = ["retail", "wholesale"];

export async function fetchPendingManagementRequests() {
  try {
    console.log("Pending Request Filters:", {
      table: "profiles",
      roles: [EXACT_MANAGEMENT_ROLE, EXACT_WHOLESALE_ROLE],
      status: EXACT_PENDING_STATUS,
    });

    const result = await supabase
      .from("profiles")
      .select("id, username, phone, role, status")
      .eq("status", EXACT_PENDING_STATUS)
      .or(`role.eq.${EXACT_MANAGEMENT_ROLE},role.eq.${EXACT_WHOLESALE_ROLE}`);

    if (result.error) {
      console.error("FETCH_ERROR:", result.error);
      console.error("SUPABASE_FETCH_ERROR:", result.error?.message ?? result.error, result.error);

      return {
        data: [],
        error: result.error,
        table: "profiles",
        success: false,
      };
    }

    console.log("Fetched Data:", result.data);

    return {
      data: (result.data ?? []).map((row) => ({
        ...row,
        username: row?.username ?? null,
        phone: row.phone ?? null,
        role: String(row.role ?? "").trim().toLowerCase(),
        status: String(row.status ?? "").trim().toLowerCase(),
        sourceTable: "profiles",
      })),
      error: null,
      table: "profiles",
      success: true,
    };
  } catch (error) {
    console.error("FETCH_ERROR:", error);
    console.error("SUPABASE_FETCH_ERROR:", error?.message ?? error, error);

    return {
      data: [],
      error,
      table: "profiles",
      success: false,
    };
  }
}

export async function fetchPendingCustomerRequests() {
  try {
    const result = await supabase
      .from("profiles")
      .select("id, username, phone, role, status")
      .eq("status", EXACT_PENDING_STATUS)
      .in("role", CUSTOMER_PENDING_ROLES);

    if (result.error) {
      console.error("FETCH_ERROR:", result.error);
      console.error("SUPABASE_FETCH_ERROR:", result.error?.message ?? result.error, result.error);

      return {
        data: [],
        error: result.error,
        table: "profiles",
        success: false,
      };
    }

    return {
      data: result.data ?? [],
      error: null,
      table: "profiles",
      success: true,
    };
  } catch (error) {
    console.error("FETCH_ERROR:", error);
    console.error("SUPABASE_FETCH_ERROR:", error?.message ?? error, error);

    return {
      data: [],
      error,
      table: "profiles",
      success: false,
    };
  }
}
