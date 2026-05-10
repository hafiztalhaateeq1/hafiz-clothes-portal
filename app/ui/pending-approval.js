"use client";

import Image from "next/image";
import { Clock3 } from "lucide-react";
import { useAuth } from "@/app/ui/auth-provider";

export function PendingApproval() {
  const { logout } = useAuth();

  return (
    <section className="auth-surface pending-approval-shell">
      <div aria-hidden="true" className="auth-blob auth-blob-1" />
      <div aria-hidden="true" className="auth-blob auth-blob-2" />
      <div aria-hidden="true" className="auth-blob auth-blob-3" />
      <div aria-hidden="true" className="auth-text-watermark">
        HCH
      </div>

      <div className="relative min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
          <div className="pending-approval-card">
            <div className="pending-approval-logo-wrap">
              <Image
                src="/hch-logo.svg"
                alt="HCH logo"
                width={72}
                height={72}
                className="pending-approval-logo"
                priority
              />
              <div>
                <p className="pending-approval-eyebrow">Hafiz Clothes House</p>
                <h1 className="pending-approval-title">PendingApproval</h1>
              </div>
            </div>

            <p className="pending-approval-message">
              Your application is under review. Our team will verify your details and
              approve your account shortly.
            </p>

            <div className="pending-approval-status">
              <span className="pending-approval-status-dot" aria-hidden="true" />
              <Clock3 size={16} strokeWidth={2.2} />
              <span>Status: Pending</span>
            </div>

            <button
              type="button"
              className="pending-approval-signout"
              onClick={() => logout()}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
