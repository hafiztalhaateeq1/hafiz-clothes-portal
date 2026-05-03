"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LockKeyhole, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/ui/auth-provider";

const initialForms = {
  admin: {
    username: "",
    password: "",
  },
  wholesale: {
    phone: "",
    name: "",
  },
  retail: {
    phone: "",
    name: "",
  },
};

const loginModes = [
  {
    key: "admin",
    title: "Admin",
    kicker: "Full access for admins.",
  },
  {
    key: "wholesale",
    title: "Wholesale",
    kicker: "Wholesale rates + personal khata.",
  },
  {
    key: "retail",
    title: "Retail",
    kicker: "Retail access for customers.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { hasMounted, isAuthenticated, login } = useAuth();
  const [activeMode, setActiveMode] = useState("admin");
  const [forms, setForms] = useState(initialForms);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasMounted && isAuthenticated) {
      router.replace("/");
    }
  }, [hasMounted, isAuthenticated, router]);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/[^\d]/g, "") : value;

    setForms((currentForms) => ({
      ...currentForms,
      [activeMode]: {
        ...currentForms[activeMode],
        [name]: nextValue,
      },
    }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (activeMode === "admin") {
        await login({
          role: "admin",
          username: forms.admin.username,
          password: forms.admin.password,
        });
      } else {
        await login({
          role: activeMode,
          phone: forms[activeMode].phone,
          name: forms[activeMode].name,
        });
      }

      router.replace("/");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasMounted) {
    return <section className="min-h-screen bg-[#FDF8F3]" />;
  }

  const activeIndex = Math.max(
    0,
    loginModes.findIndex((mode) => mode.key === activeMode)
  );
  const activeKicker = loginModes.find((mode) => mode.key === activeMode)?.kicker ?? "";

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
                      Welcome back
                    </h2>
                  </div>
                </div>

                <div className="mt-6" role="tablist" aria-label="Login modes">
                  <div className="relative flex rounded-2xl bg-gray-100 p-1">
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-white shadow-sm transition-transform duration-200"
                      style={{ transform: `translateX(${activeIndex * 100}%)` }}
                    />
                    {loginModes.map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        className={`relative z-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                          activeMode === mode.key
                            ? "text-[#800000]"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                        onClick={() => {
                          setActiveMode(mode.key);
                          setErrorMessage("");
                        }}
                      >
                        {mode.title}
                      </button>
                    ))}
                  </div>

                  {activeKicker ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <ShieldCheck className="h-4 w-4 text-[#800000]" aria-hidden="true" />
                      <p className="m-0">{activeKicker}</p>
                    </div>
                  ) : null}
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  {activeMode === "admin" ? (
                    <>
                      <label className="block">
                        <span className="sr-only">Username</span>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            name="username"
                            type="text"
                            value={forms.admin.username}
                            onChange={handleChange}
                            placeholder="Admin username"
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
                            value={forms.admin.password}
                            onChange={handleChange}
                            placeholder="Password"
                            autoComplete="current-password"
                            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                          />
                        </div>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="block">
                        <span className="sr-only">Phone Number</span>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            value={forms[activeMode].phone}
                            onChange={handleChange}
                            placeholder="Phone number"
                            autoComplete="tel"
                            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="sr-only">Name</span>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            name="name"
                            type="text"
                            value={forms[activeMode].name}
                            onChange={handleChange}
                            placeholder="Your name"
                            autoComplete="name"
                            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                          />
                        </div>
                      </label>
                    </>
                  )}

                  {errorMessage ? (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMessage}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#800000] to-[#5b0303] text-sm font-bold text-white shadow-lg shadow-[#800000]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
