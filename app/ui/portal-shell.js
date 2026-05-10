"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CircleUserRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/ui/auth-provider";
import { LanguageSwitcher, useLanguage } from "@/app/ui/language-provider";
import { PortalNavigation } from "@/app/ui/portal-navigation";

const SHOP_INFO = {
  address:
    "Gurdwara Gali No. 1, Pakistan Model High School Wali Gali, Rail Bazar, Faisalabad.",
  contact: "0323-7869400",
};

export function PortalShell({ children }) {
  const pathname = usePathname();
  const { authResolved, isAuthenticated, logout, session } = useAuth();
  const { language, setLanguage, t, languages } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const languageClass = mounted ? `language-${language}` : "language-en";

  const roleMeta = useMemo(() => {
    const role = String(session?.role ?? "").toLowerCase().trim();
    if (role === "admin") {
      return { label: t.shell?.administrator ?? "Administrator", badgeClass: "is-admin" };
    }
    if (role === "management") {
      return { label: "Management", badgeClass: "is-admin" };
    }
    if (role === "wholesale") {
      return { label: "Wholesale Partner", badgeClass: "is-wholesale" };
    }
    if (role === "retail") {
      return { label: "Retail Customer", badgeClass: "is-retail" };
    }
    if (role === "guest") {
      return { label: "Guest", badgeClass: "is-retail" };
    }
    return { label: "Retail Customer", badgeClass: "is-retail" };
  }, [session?.role, t]);
  const shellCopy = useMemo(
    () => ({
      settingsTitle: t.shell?.settingsTitle ?? "Settings",
      language: t.shell?.language ?? "Language",
      shopDetails: t.shell?.shopDetails ?? "Shop Details",
      address: t.shell?.address ?? "Address",
      contact: t.shell?.contact ?? "Contact",
      close: t.shell?.close ?? "Close",
      profile: t.shell?.profile ?? "Profile",
      logout: t.shell?.logout ?? "Log Out",
      administrator: t.shell?.administrator ?? "Administrator",
    }),
    [t]
  );

  if (!mounted) {
    return <div className={`portal-shell-root ${languageClass}`}>{children}</div>;
  }

  if (pathname === "/login" || pathname === "/signup" || pathname === "/register" || pathname === "/pending" || pathname === "/error") {
    return <div className={`portal-shell-root ${languageClass}`}>{children}</div>;
  }

  if (!authResolved) {
    return (
      <div className={`portal-shell-root ${languageClass}`}>
        <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3]">
          <div className="rounded-2xl border border-[#800000]/10 bg-white/80 px-6 py-5 text-sm font-semibold text-[#800000] shadow-lg">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || session?.role === "guest") {
    return (
      <div className={`portal-shell-root ${languageClass}`}>
        <div className="min-h-screen flex items-center justify-center bg-[#FDF8F3]">
          <div className="rounded-2xl border border-[#800000]/10 bg-white/80 px-6 py-5 text-sm font-semibold text-[#800000] shadow-lg">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  function handleLogout() {
    logout();
  }

  return (
    <div className={`portal-shell-root ${languageClass}`}>
      {isSettingsOpen ? (
        <div
          className="portal-overlay"
          role="presentation"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="portal-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="portal-settings-head">
              <div>
                <p className="dashboard-eyebrow">{shellCopy.settingsTitle}</p>
                <h2 id="portal-settings-title">{shellCopy.settingsTitle}</h2>
              </div>
              <button
                type="button"
                className="portal-settings-close"
                onClick={() => setIsSettingsOpen(false)}
                aria-label={shellCopy.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="portal-settings-section">
              <span>{shellCopy.language}</span>
              <div className="portal-settings-language">
                {languages.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`portal-settings-chip ${
                      language === option.value ? "is-active" : ""
                    }`}
                    onClick={() => setLanguage(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="portal-settings-section">
              <span>{shellCopy.shopDetails}</span>
              <div className="portal-settings-details">
                <p>
                  <strong>{shellCopy.address}:</strong> {SHOP_INFO.address}
                </p>
                <p>
                  <strong>{shellCopy.contact}:</strong> {SHOP_INFO.contact}
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : null}

      {isMobileSidebarOpen ? (
        <button
          type="button"
          className="portal-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <div className="portal-shell">
        <aside
          className={`portal-sidebar ${
            isMobileSidebarOpen ? "portal-sidebar-open" : ""
          } ${isCollapsed ? "portal-sidebar-collapsed" : ""}`}
        >
          <div className="portal-sidebar-top">
            <div className={`portal-sidebar-brand ${isCollapsed ? "is-collapsed" : ""}`}>
              <Image
                src="/hch-logo.svg"
                alt="HCH logo"
                width={40}
                height={40}
                className="portal-logo-mark"
                priority
              />
              {isCollapsed ? null : (
                <div className="portal-logo-copy">
                  <p className="portal-sidebar-title">HAFIZ CLOTHES HOUSE</p>
                </div>
              )}
            </div>
            <button
              type="button"
              className="portal-sidebar-dismiss"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          <div className="portal-sidebar-controls">
            <PortalNavigation collapsed={isCollapsed} />
          </div>

          <div className={`portal-sidebar-bottom ${isCollapsed ? "is-collapsed" : ""}`}>
            <div className="portal-sidebar-divider" aria-hidden="true" />

            {!isCollapsed ? (
              <div className="md:hidden px-2 pb-2">
                <label className="block text-[0.68rem] font-semibold uppercase tracking-widest text-white/70">
                  {t.common.language ?? "Language"}
                </label>
                <select
                  value={mounted ? language : "en"}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-[#fff8ef] shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  {languages.map((option) => (
                    <option key={option.value} value={option.value} className="text-[#241816]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <button
              type="button"
              className={`portal-nav-link portal-sidebar-utility ${
                isCollapsed ? "portal-nav-link-collapsed" : ""
              }`}
              onClick={() => {
                setIsProfileOpen(false);
                setIsSettingsOpen(true);
              }}
              title={isCollapsed ? t.nav.settings : undefined}
            >
              <span className="portal-nav-icon" aria-hidden="true">
                <Settings size={18} strokeWidth={2.1} />
              </span>
              {!isCollapsed ? <span>{t.nav.settings}</span> : null}
            </button>

            <div className="portal-profile-wrap">
              <button
                type="button"
                className={`portal-profile-card ${isCollapsed ? "is-collapsed" : ""}`}
                onClick={() => setIsProfileOpen((currentValue) => !currentValue)}
              >
                <span className="portal-profile-avatar" aria-hidden="true">
                  <CircleUserRound size={18} strokeWidth={2.1} />
                </span>
                 {!isCollapsed ? (
                   <div className="portal-profile-copy">
                     <p className="portal-profile-name">{session?.displayName ?? "Hafiz Talha"}</p>
                      <span className={`portal-profile-role ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                   </div>
                 ) : null}
               </button>
              {isProfileOpen ? (
                <div className="portal-profile-popover" role="menu" aria-label={shellCopy.profile}>
                  <span className={`portal-role-badge ${roleMeta.badgeClass}`}>
                    {roleMeta.label}
                  </span>
                  <button
                    type="button"
                    className="portal-popover-action"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>{shellCopy.logout}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div
          className={`portal-main-wrap ${
            isCollapsed ? "portal-main-wrap-collapsed" : ""
          }`}
        >
          <header className="portal-topbar">
            <div className="portal-topbar-brand min-w-0 flex-1">
              <button
                type="button"
                className="portal-menu-button"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>

              <button
                type="button"
                className="portal-sidebar-toggle hidden md:inline-flex"
                onClick={() => setIsCollapsed((currentState) => !currentState)}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>

              <div className="portal-topbar-copy">
                <div className="portal-logo-lockup min-w-0">
                  <Image
                    src="/hch-logo.svg"
                    alt="HCH logo"
                    width={48}
                    height={48}
                    className="portal-logo-mark"
                    priority
                  />
                  <div className="portal-logo-copy min-w-0 hidden sm:block">
                    <p className="portal-topbar-kicker">Hafiz Clothes House</p>
                    <h1 className="truncate">
                      <span className="inline sm:hidden">Hafiz</span>
                      <span className="hidden sm:inline md:hidden">Hafiz Clothes</span>
                      <span className="hidden md:inline">Hafiz Clothes House</span>
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            <div className="portal-topbar-actions shrink-0">
              <div className="portal-session-badge hidden md:flex">
                <strong>{session?.displayName ?? "User"}</strong>
                <span>{roleMeta.label}</span>
              </div>
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              <button
                type="button"
                className="portal-logout-button"
                onClick={handleLogout}
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          <main className="portal-main">{children}</main>
          <footer className="portal-footer">Hafiz Clothes House © 2026</footer>
        </div>
      </div>
    </div>
  );
}
