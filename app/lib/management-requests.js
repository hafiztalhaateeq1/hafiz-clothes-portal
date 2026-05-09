import { supabase } from "@/lib/supabase";

const EXACT_PENDING_STATUS = "pending";
const EXACT_MANAGEMENT_ROLE = "management_pending";

export async function fetchPendingManagementRequests() {
  try {
    const result = await supabase
      .from("profiles")
      .select("id, full_name, username, email, phone, role, status, created_at")
      .eq("role", EXACT_MANAGEMENT_ROLE)
      .eq("status", EXACT_PENDING_STATUS)
      .order("created_at", { ascending: false });

    if (result.error) {
      console.error("FETCH_ERROR:", result.error);

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
        name: row.full_name ?? "Management User",
        full_name: row.full_name ?? "Management User",
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

    return {
      data: [],
      error,
      table: "profiles",
      success: false,
    };
  }
}
