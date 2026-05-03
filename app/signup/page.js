"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

function isBlank(value) {
  return !String(value ?? "").trim();
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      !isBlank(form.fullName) &&
      !isBlank(form.phone) &&
      !isBlank(form.email) &&
      !isBlank(form.password)
    );
  }, [form.email, form.fullName, form.password, form.phone]);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/[^\d]/g, "") : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      setErrorMessage("Please complete all fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Placeholder: wire this up to Supabase Auth / custom signup when ready.
      // For now, we just redirect back to login after validation.
      router.push("/login");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#FDF8F3]">
      <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
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
                      Create account
                    </h1>
                  </div>
                </div>

                <p className="mt-6 text-sm leading-relaxed text-[#5b3a3a]">
                  Create a new account to access your dashboard, ledger, and customer history.
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(128,0,0,0.10),transparent_55%)] blur-2xl"
              />

              <div className="relative mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
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
                      Sign up
                    </h2>
                  </div>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="sr-only">Full Name</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="fullName"
                        type="text"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Full Name"
                        autoComplete="name"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="sr-only">Phone Number</span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Phone Number"
                        autoComplete="tel"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="sr-only">Email</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Email"
                        autoComplete="email"
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
                        autoComplete="new-password"
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
                    disabled={!canSubmit || isSubmitting}
                    className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#800000] to-[#5b0303] text-sm font-bold text-white shadow-lg shadow-[#800000]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Creating..." : "Create Account"}
                  </button>

                  <p className="pt-2 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <a
                      href="/login"
                      className="inline-flex items-center rounded-lg px-2 py-1 font-bold text-[#800000] transition hover:text-[#6f0000] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                    >
                      Sign In
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
