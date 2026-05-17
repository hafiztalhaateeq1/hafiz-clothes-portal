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
import { usePortalBadges } from "@/app/ui/portal-badges-provider";

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
  const { activeCustomerCount, pendingManagementCount } = usePortalBadges();
  const canManagePortal = session?.role === "admin" || session?.role === "management";

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
                {item.key === "customers" && activeCustomerCount > 0 ? (
                  <span
                    className="portal-nav-badge"
                    aria-label={`${activeCustomerCount} active customer records`}
                  >
                    {activeCustomerCount}
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
            ) : item.key === "customers" && activeCustomerCount > 0 ? (
              <span
                className="portal-nav-dot"
                aria-label={`${activeCustomerCount} active customer records`}
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
