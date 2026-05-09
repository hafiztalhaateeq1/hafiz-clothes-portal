import { supabase } from "@/lib/supabase";

const MANAGEMENT_REQUEST_SELECT =
  "id, name, username, email, phone, status, user_type, role, is_approved, created_at";

function normalizeTableRows(tableName, rows) {
  return (rows ?? []).map((row) => ({
    ...row,
    sourceTable: tableName,
  }));
}

export async function fetchPendingManagementRequests() {
  const attempts = [
    {
      table: "clients",
      query: () =>
        supabase
          .from("clients")
          .select(MANAGEMENT_REQUEST_SELECT)
          .eq("status", "pending")
          .eq("user_type", "management")
          .order("created_at", { ascending: false }),
    },
    {
      table: "clients",
      query: () =>
        supabase
          .from("clients")
          .select(MANAGEMENT_REQUEST_SELECT)
          .eq("status", "pending")
          .eq("role", "management")
          .order("created_at", { ascending: false }),
    },
    {
      table: "profiles",
      query: () =>
        supabase
          .from("profiles")
          .select(MANAGEMENT_REQUEST_SELECT)
          .eq("status", "pending")
          .eq("role", "management")
          .order("created_at", { ascending: false }),
    },
    {
      table: "users",
      query: () =>
        supabase
          .from("users")
          .select(MANAGEMENT_REQUEST_SELECT)
          .eq("status", "pending")
          .eq("role", "management")
          .order("created_at", { ascending: false }),
    },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    const result = await attempt.query();

    if (!result.error) {
      return {
        data: normalizeTableRows(attempt.table, result.data),
        error: null,
        table: attempt.table,
      };
    }

    lastError = result.error;
    console.error("Fetch error:", result.error);
  }

  return {
    data: [],
    error: lastError,
    table: null,
  };
}
