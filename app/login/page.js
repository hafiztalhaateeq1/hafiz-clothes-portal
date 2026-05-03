"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/ui/auth-provider";

function dashboardPathForRole(role) {
  const normalized = String(role ?? "").toLowerCase();
  if (normalized === "admin") return "/dashboard/admin";
  if (normalized === "wholesale") return "/dashboard/wholesale";
  return "/dashboard/retail";
}

export default function LoginPage() {
  const router = useRouter();
  const { hasMounted, isAuthenticated, login, session } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasMounted && isAuthenticated) {
      router.replace(dashboardPathForRole(session?.role));
    }
  }, [hasMounted, isAuthenticated, router, session?.role]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const session = await login({
        identifier: form.identifier,
        password: form.password,
      });

      router.replace(dashboardPathForRole(session?.role));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasMounted) {
    return <section className="min-h-screen bg-[#FDF8F3]" />;
  }

  return (
    <section className="auth-surface">
      <div aria-hidden="true" className="auth-blob auth-blob-1" />
      <div aria-hidden="true" className="auth-blob auth-blob-2" />
      <div aria-hidden="true" className="auth-blob auth-blob-3" />
      <div aria-hidden="true" className="auth-watermark select-none">
        HCH
      </div>

      <div className="relative min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
          <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
            <div className="hidden lg:flex flex-col justify-center">
              <div className="rounded-3xl border border-white/60 bg-white/40 p-10 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <Image
                    src="/hch-logo.svg"
                    alt="HCH logo"
                    width={56}
                    height={56}
                    className="h-14 w-14"
                    priority
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b58a00]">
                      Hafiz Clothes House
                    </p>
                    <h1 className="truncate font-[650] text-3xl leading-tight text-[#800000]">
                      Sign in
                    </h1>
                  </div>
                </div>

                <p className="mt-6 text-sm leading-relaxed text-[#5b3a3a]">
                  Access your dashboard, ledger, customers, and reports with the right role.
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(128,0,0,0.10),transparent_55%)] blur-2xl"
              />

              <div className="relative mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_36px_90px_rgba(69,9,9,0.18),0_12px_30px_rgba(0,0,0,0.10)] sm:p-8">
                <div className="flex items-center gap-3">
                  <Image
                    src="/hch-logo.svg"
                    alt="HCH logo"
                    width={44}
                    height={44}
                    className="h-11 w-11"
                    priority
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#b58a00]">
                      Hafiz Clothes House
                    </p>
                    <h2 className="truncate text-base font-[650] text-[#800000] sm:text-lg">
                      Welcome back
                    </h2>
                  </div>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="sr-only">Phone Number or Admin Username</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="identifier"
                        type="text"
                        value={form.identifier}
                        onChange={handleChange}
                        placeholder="Phone number or username"
                        autoComplete="username"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="sr-only">Password</span>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Password"
                        autoComplete="current-password"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                    </div>
                  </label>

                  {errorMessage ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!form.identifier.trim() || isSubmitting}
                    className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#800000] to-[#5b0303] text-sm font-bold text-white shadow-lg shadow-[#800000]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </button>

                  <p className="pt-2 text-center text-sm text-gray-600">
                    Don&apos;t have an account?{" "}
                    <a
                      href="/signup"
                      className="inline-flex items-center rounded-lg px-2 py-1 font-bold text-[#800000] transition hover:text-[#6f0000] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                    >
                      Sign Up
                    </a>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
