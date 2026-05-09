import { supabase } from "@/lib/supabase";

const EXACT_PENDING_STATUS = "pending";
const EXACT_MANAGEMENT_ROLE = "management";

function logSupabaseFetchError(error, context = {}) {
  console.error("SUPABASE_FETCH_ERROR:", {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    ...context,
  });
}

function normalizeRequestRow(tableName, row) {
  return {
    ...row,
    id: row?.id ?? null,
    name: row?.name ?? row?.full_name ?? row?.display_name ?? "Management User",
    username: row?.username ?? row?.user_name ?? null,
    email: row?.email ?? null,
    phone: row?.phone ?? row?.phone_number ?? null,
    status: String(row?.status ?? row?.approval_status ?? "").trim().toLowerCase(),
    role: String(row?.user_type ?? row?.role ?? row?.account_type ?? "").trim().toLowerCase(),
    sourceTable: tableName,
    created_at: row?.created_at ?? row?.createdAt ?? null,
  };
}

function filterManagementRequests(rows, tableName) {
  return (rows ?? [])
    .map((row) => normalizeRequestRow(tableName, row))
    .filter(
      (row) => row.status === EXACT_PENDING_STATUS && row.role === EXACT_MANAGEMENT_ROLE
    );
}

function isMissingColumnError(error) {
  const message = String(error?.message ?? "").toLowerCase();
  const details = String(error?.details ?? "").toLowerCase();
  return (
    message.includes("column") ||
    details.includes("column") ||
    message.includes("does not exist") ||
    details.includes("does not exist")
  );
}

export async function fetchPendingManagementRequests() {
  const attempts = [
    {
      table: "clients",
      statusColumn: "status",
      roleColumn: "user_type",
    },
    {
      table: "clients",
      statusColumn: "status",
      roleColumn: "role",
    },
    {
      table: "profiles",
      statusColumn: "status",
      roleColumn: "role",
    },
    {
      table: "profiles",
      statusColumn: "approval_status",
      roleColumn: "role",
    },
    {
      table: "users",
      statusColumn: "status",
      roleColumn: "role",
    },
    {
      table: "users",
      statusColumn: "approval_status",
      roleColumn: "role",
    },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const result = await supabase
        .from(attempt.table)
        .select("*")
        .eq(attempt.statusColumn, EXACT_PENDING_STATUS)
        .eq(attempt.roleColumn, EXACT_MANAGEMENT_ROLE)
        .order("created_at", { ascending: false });

      if (result.error) {
        lastError = result.error;
        logSupabaseFetchError(result.error, {
          table: attempt.table,
          statusColumn: attempt.statusColumn,
          roleColumn: attempt.roleColumn,
        });

        if (isMissingColumnError(result.error)) {
          continue;
        }

        return {
          data: [],
          error: result.error,
          table: attempt.table,
          success: false,
        };
      }

      return {
        data: filterManagementRequests(result.data, attempt.table),
        error: null,
        table: attempt.table,
        success: true,
      };
    } catch (error) {
      lastError = error;
      logSupabaseFetchError(error, {
        table: attempt.table,
        statusColumn: attempt.statusColumn,
        roleColumn: attempt.roleColumn,
        caught: true,
      });
    }
  }

  return {
    data: [],
    error: lastError,
    table: null,
    success: false,
  };
}
