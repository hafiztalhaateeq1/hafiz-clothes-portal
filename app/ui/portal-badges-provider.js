"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/ui/auth-provider";
import { fetchPendingManagementRequests } from "@/app/lib/management-requests";

const PortalBadgesContext = createContext(null);

export function PortalBadgesProvider({ children }) {
  const { session } = useAuth();
  const [pendingManagementCount, setPendingManagementCount] = useState(0);
  const [activeCustomerCount, setActiveCustomerCount] = useState(0);
  const canManagePortal = session?.role === "admin" || session?.role === "management";

  const refreshBadgeCounts = useCallback(async () => {
    if (!canManagePortal) {
      setPendingManagementCount(0);
      setActiveCustomerCount(0);
      return;
    }

    const [managementResult, customersResult] = await Promise.all([
      fetchPendingManagementRequests(),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    if (!managementResult.success || managementResult.error) {
      console.error(
        "SUPABASE_FETCH_ERROR:",
        managementResult.error?.message ?? managementResult.error,
        managementResult.error
      );
    } else {
      setPendingManagementCount((managementResult.data ?? []).length);
    }

    if (customersResult.error) {
      console.error(
        "SUPABASE_FETCH_ERROR:",
        customersResult.error?.message ?? customersResult.error,
        customersResult.error
      );
    } else {
      setActiveCustomerCount(customersResult.count ?? 0);
    }
  }, [canManagePortal]);

  const syncPendingManagementCount = useCallback((nextCount) => {
    const normalizedCount = Number(nextCount ?? 0);
    setPendingManagementCount(Math.max(0, Number.isFinite(normalizedCount) ? normalizedCount : 0));
  }, []);

  useEffect(() => {
    if (!canManagePortal) {
      return undefined;
    }

    Promise.resolve().then(() => {
      refreshBadgeCounts();
    });

    const channel = supabase
      .channel("portal-badge-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          refreshBadgeCounts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          refreshBadgeCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canManagePortal, refreshBadgeCounts]);

  const value = useMemo(
    () => ({
      activeCustomerCount: canManagePortal ? activeCustomerCount : 0,
      pendingManagementCount: canManagePortal ? pendingManagementCount : 0,
      refreshBadgeCounts,
      syncPendingManagementCount,
    }),
    [
      activeCustomerCount,
      canManagePortal,
      pendingManagementCount,
      refreshBadgeCounts,
      syncPendingManagementCount,
    ]
  );

  return <PortalBadgesContext.Provider value={value}>{children}</PortalBadgesContext.Provider>;
}

export function usePortalBadges() {
  const context = useContext(PortalBadgesContext);

  if (!context) {
    throw new Error("usePortalBadges must be used within a PortalBadgesProvider.");
  }

  return context;
}
