"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Receipt,
  FileBarChart,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/ui/auth-provider";
import { useLanguage } from "@/app/ui/language-provider";
import { supabase } from "@/lib/supabase";
import {
  fetchPendingCustomerRequests,
  fetchPendingManagementRequests,
} from "@/app/lib/management-requests";

const navigationItems = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "catalogue", href: "/catalogue", icon: ShoppingBag },
  { key: "ledger", href: "/ledger", icon: BookOpen },
  { key: "customers", href: "/customers", icon: Users },
  { key: "expenses", href: "/expenses", icon: Receipt },
  { key: "reports", href: "/reports", icon: FileBarChart },
];

export function PortalNavigation({ collapsed = false }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [pendingCustomerCount, setPendingCustomerCount] = useState(0);
  const [pendingManagementCount, setPendingManagementCount] = useState(0);
  const canManagePortal = session?.role === "admin" || session?.role === "management";

  useEffect(() => {
    if (!session?.role) {
      return undefined;
    }

    if (!canManagePortal) {
      return undefined;
    }

    let isCurrent = true;

    async function loadPendingCounts() {
      const [customerResult, managementResult] = await Promise.all([
        fetchPendingCustomerRequests(),
        fetchPendingManagementRequests(),
      ]);

      if (!customerResult.success || customerResult.error) {
        console.error(
          "SUPABASE_FETCH_ERROR:",
          customerResult.error?.message ?? customerResult.error,
          customerResult.error
        );
      } else if (isCurrent) {
        setPendingCustomerCount((customerResult.data ?? []).length);
      }

      if (!managementResult.success || managementResult.error) {
        console.error(
          "SUPABASE_FETCH_ERROR:",
          managementResult.error?.message ?? managementResult.error,
          managementResult.error
        );
        return;
      }

      if (isCurrent) {
        setPendingManagementCount((managementResult.data ?? []).length);
      }
    }

    loadPendingCounts();

    const channel = supabase
      .channel("management-request-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          loadPendingCounts();
        }
      )
      .subscribe();

    return () => {
      isCurrent = false;
      supabase.removeChannel(channel);
    };
  }, [canManagePortal, session?.role]);

  function getLabel(itemKey) {
    return t.nav[itemKey] ?? itemKey;
  }

  return (
    <nav className="portal-nav" aria-label="Primary">
      {navigationItems
        .filter((item) => {
          if (canManagePortal) {
            return true;
          }

          return item.key !== "customers" && item.key !== "expenses" && item.key !== "reports";
        })
        .map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/" || pathname.startsWith("/dashboard")
            : pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`portal-nav-link ${isActive ? "portal-nav-link-active" : ""} ${
              collapsed ? "portal-nav-link-collapsed" : ""
            }`}
            title={collapsed ? getLabel(item.key) : undefined}
          >
            <span className="portal-nav-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={2.1} />
            </span>
            {!collapsed ? (
              <>
                <span>{getLabel(item.key)}</span>
                {item.key === "customers" && pendingCustomerCount > 0 ? (
                  <span
                    className="portal-nav-badge"
                    aria-label={`${pendingCustomerCount} pending customer requests`}
                  >
                    {pendingCustomerCount}
                  </span>
                ) : null}
                {item.key === "dashboard" && pendingManagementCount > 0 ? (
                  <span
                    className="portal-nav-badge"
                    aria-label={`${pendingManagementCount} pending management requests`}
                  >
                    {pendingManagementCount}
                  </span>
                ) : null}
              </>
            ) : item.key === "customers" && pendingCustomerCount > 0 ? (
              <span
                className="portal-nav-dot"
                aria-label={`${pendingCustomerCount} pending customer requests`}
              />
            ) : item.key === "dashboard" && pendingManagementCount > 0 ? (
              <span
                className="portal-nav-dot"
                aria-label={`${pendingManagementCount} pending management requests`}
              />
            ) : null}
          </Link>
        );
        })}
    </nav>
  );
}
