"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Building2, Handshake, LockKeyhole, Store, UserRound } from "lucide-react";
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
  const [step, setStep] = useState("select"); // select | form
  const [selectedRole, setSelectedRole] = useState(null); // management | wholesale | retail
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
    const nextValue =
      selectedRole === "management"
        ? value
        : name === "identifier"
          ? value.replace(/[^\d]/g, "")
          : value;

    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (!selectedRole) {
        setErrorMessage("Please select an access type.");
        return;
      }

      if (selectedRole === "management" && !form.password.trim()) {
        setErrorMessage("Please enter your password to sign in.");
        return;
      }

      const session = await login({
        identifier: form.identifier,
        password: selectedRole === "management" ? form.password : "",
      });

      router.replace(dashboardPathForRole(session?.role));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function chooseRole(roleKey) {
    setSelectedRole(roleKey);
    setStep("form");
    setErrorMessage("");
    setForm({ identifier: "", password: "" });
  }

  const roleCopy =
    selectedRole === "management"
      ? { title: "Management", hint: "Use your username + password." }
      : selectedRole === "wholesale"
        ? { title: "Wholesale Partner", hint: "Enter your registered phone number." }
        : selectedRole === "retail"
          ? { title: "Retail Customer", hint: "Enter your registered phone number." }
          : { title: "Sign in", hint: "Select your access type to continue." };

  if (!hasMounted) {
    return <section className="min-h-screen bg-[#FDF8F3]" />;
  }

  return (
    <section className="auth-surface">
      <div aria-hidden="true" className="auth-blob auth-blob-1" />
      <div aria-hidden="true" className="auth-blob auth-blob-2" />
      <div aria-hidden="true" className="auth-blob auth-blob-3" />
      <Image
        aria-hidden="true"
        src="/hch-logo.svg"
        alt=""
        width={76}
        height={76}
        className="auth-corner-logo"
      />

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
                      {step === "select" ? "Choose access" : roleCopy.title}
                    </h2>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[#5b3a3a]">{roleCopy.hint}</p>

                {/* Step 1: Role selection */}
                <div
                  className={`mt-6 grid gap-3 transition-all duration-200 ${
                    step === "select" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2 h-0 overflow-hidden"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => chooseRole("management")}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-[#241816]">Management</span>
                        <span className="block text-xs text-gray-500">Username + password</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      Continue
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => chooseRole("wholesale")}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Handshake className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-[#241816]">Wholesale Partner</span>
                        <span className="block text-xs text-gray-500">Phone number</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      Continue
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => chooseRole("retail")}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Store className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-[#241816]">Retail Customer</span>
                        <span className="block text-xs text-gray-500">Phone number</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      Continue
                    </span>
                  </button>
                </div>

                {/* Step 2: Role-specific form */}
                <div
                  className={`transition-all duration-200 ${
                    step === "form" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2 h-0 overflow-hidden"
                  }`}
                >
                  <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                    <label className="block">
                      <span className="sr-only">
                        {selectedRole === "management" ? "Username" : "Phone Number"}
                      </span>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          name="identifier"
                          type="text"
                          value={form.identifier}
                          onChange={handleChange}
                          placeholder={selectedRole === "management" ? "Username" : "Phone Number"}
                          autoComplete="username"
                          inputMode={selectedRole === "management" ? undefined : "tel"}
                          className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                        />
                      </div>
                    </label>

                    {selectedRole === "management" ? (
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
                    ) : null}

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

                    <div className="flex items-center justify-between pt-2 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("select");
                          setSelectedRole(null);
                          setErrorMessage("");
                          setForm({ identifier: "", password: "" });
                        }}
                        className="rounded-lg px-2 py-1 font-semibold text-gray-600 transition hover:text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                      >
                        Go Back
                      </button>
                      <a
                        href="/signup"
                        className="inline-flex items-center rounded-lg px-2 py-1 font-bold text-[#800000] transition hover:text-[#6f0000] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                      >
                        Sign Up
                      </a>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
