import { supabase } from "@/lib/supabase";

const EXACT_PENDING_STATUS = "pending";
const EXACT_MANAGEMENT_ROLE = "management_pending";

export async function fetchPendingManagementRequests() {
  try {
    const result = await supabase
      .from("profiles")
      .select("id, username, phone, role, status")
      .eq("role", EXACT_MANAGEMENT_ROLE)
      .eq("status", EXACT_PENDING_STATUS)

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
        username: row.username ?? "management_user",
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
