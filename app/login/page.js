"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Handshake,
  LockKeyhole,
  Store,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/ui/auth-provider";
import { useLanguage } from "@/app/ui/language-provider";

function dashboardPathForRole(role) {
  const normalized = String(role ?? "").toLowerCase();
  if (normalized === "admin") return "/dashboard/admin";
  if (normalized === "wholesale") return "/dashboard/wholesale";
  return "/dashboard/retail";
}

export default function LoginPage() {
  const router = useRouter();
  const { hasMounted, isAuthenticated, login, session } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [step, setStep] = useState("select"); // select | form
  const [selectedRole, setSelectedRole] = useState(null); // management | wholesale | retail
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isUrdu = language === "ur";

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
        setErrorMessage(
          isUrdu ? "براہ کرم پہلے اپنی رسائی کی قسم منتخب کریں۔" : "Please select an access type."
        );
        return;
      }

      if (!form.identifier.trim() || !form.password.trim()) {
        setErrorMessage(
          isUrdu
            ? "سائن اِن کرنے کے لیے دونوں خانے مکمل کریں۔"
            : "Please complete both fields to sign in."
        );
        return;
      }

      if (selectedRole !== "management") {
        const cleanedPhone = String(form.identifier ?? "").replace(/[^\d]/g, "");
        if (!/^03\d{9}$/.test(cleanedPhone)) {
          setErrorMessage(
            isUrdu
              ? "براہ کرم 03 سے شروع ہونے والا درست 11 ہندسوں کا نمبر درج کریں۔"
              : "Please enter a valid 11-digit number starting with 03"
          );
          return;
        }
      }

      console.log("Sign-in request:", {
        role: selectedRole,
        identifier: form.identifier,
        hasPassword: Boolean(form.password),
        rememberMe,
      });

      const session = await login({
        identifier: form.identifier,
        password: form.password,
        requestedRole: selectedRole,
        rememberMe,
      });

      console.log("Sign-in session:", session);

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
    setShowPassword(false);
  }

  const copy = {
    brandName: "Hafiz Clothes House",
    tagline: isUrdu ? "اعلیٰ معیار کے کپڑے" : "Premium Quality Fabrics",
    motto: isUrdu
      ? "ہر دھاگے میں عمدگی۔ ہر لین دین میں شفافیت۔"
      : "Excellence in Every Thread. Transparency in Every Transaction.",
    desktopEyebrow: isUrdu ? "محفوظ رسائی" : "Secure access",
    desktopTitle: isUrdu
      ? "درست ورک اسپیس کے ساتھ آگے بڑھنے کے لیے سائن اِن کریں۔"
      : "Sign in to continue with the right workspace.",
    desktopBody: isUrdu
      ? "اپنے کردار کے مطابق ڈیش بورڈ، لیجر، کسٹمرز اور رپورٹس تک رسائی حاصل کریں۔"
      : "Access your dashboard, ledger, customers, and reports with the right role.",
    roleHintDefault: isUrdu
      ? "جاری رکھنے کے لیے اپنی رسائی کی قسم منتخب کریں۔"
      : "Select your access type to continue.",
    chooseAccess: isUrdu ? "رسائی منتخب کریں" : "Choose access",
    signIn: isUrdu ? "سائن اِن" : "Sign In",
    signingIn: isUrdu ? "سائن اِن ہو رہا ہے..." : "Signing in...",
    username: isUrdu ? "یوزرنیم" : "Username",
    phone: isUrdu ? "فون نمبر" : "Phone Number",
    password: isUrdu ? "پاس ورڈ" : "Password",
    rememberMe: isUrdu ? "مجھے یاد رکھیں" : "Remember Me",
    goBack: isUrdu ? "واپس جائیں" : "Go Back",
    createAccount: isUrdu ? "اکاؤنٹ بنائیں" : "Create Account",
    continue: isUrdu ? "جاری رکھیں" : "Continue",
    hidePassword: isUrdu ? "پاس ورڈ چھپائیں" : "Hide password",
    showPassword: isUrdu ? "پاس ورڈ دکھائیں" : "Show password",
    management: isUrdu ? "انتظامیہ" : "Management",
    wholesale: isUrdu ? "ہول سیل پارٹنر" : "Wholesale Partner",
    retail: isUrdu ? "ریٹیل کسٹمر" : "Retail Customer",
    managementHint: isUrdu ? "یوزرنیم + پاس ورڈ" : "Username + password",
    partnerHint: isUrdu ? "فون نمبر + پاس ورڈ" : "Phone + password",
  };

  const roleCopy =
    selectedRole === "management"
      ? {
          title: copy.management,
          hint: isUrdu ? "اپنا یوزرنیم اور پاس ورڈ استعمال کریں۔" : "Use your username + password.",
        }
      : selectedRole === "wholesale"
        ? {
            title: copy.wholesale,
            hint: isUrdu ? "اپنا فون نمبر اور پاس ورڈ استعمال کریں۔" : "Use your phone + password.",
          }
        : selectedRole === "retail"
          ? {
              title: copy.retail,
              hint: isUrdu ? "اپنا فون نمبر اور پاس ورڈ استعمال کریں۔" : "Use your phone + password.",
            }
          : { title: copy.signIn, hint: copy.roleHintDefault };

  if (!hasMounted) {
    return <section className="min-h-screen bg-[#FDF8F3]" />;
  }

  return (
    <section
      className="auth-surface"
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
    >
      <div aria-hidden="true" className="auth-fabric-wave" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-72 w-72 bg-[radial-gradient(circle_at_top_left,rgba(128,0,0,0.22),transparent_68%)] blur-3xl sm:h-96 sm:w-96"
      />
      <div aria-hidden="true" className="auth-blob auth-blob-1" />
      <div aria-hidden="true" className="auth-blob auth-blob-2" />
      <div aria-hidden="true" className="auth-blob auth-blob-3" />
      <div aria-hidden="true" className="auth-text-watermark">
        HCH
      </div>

      <div className="relative min-h-screen px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="relative lg:flex lg:items-start lg:justify-between">
            <header className="flex justify-center pt-4 lg:flex-none lg:justify-start lg:pt-4">
              <div className="rounded-full border border-white/65 bg-white/45 px-4 py-2.5 shadow-lg shadow-[#800000]/8 backdrop-blur-xl sm:px-5">
                <div className="flex flex-col items-center gap-1.5 text-center lg:flex-row lg:items-center lg:gap-2.5 lg:text-left">
                  <Image
                    src="/hch-logo.svg"
                    alt="HCH logo"
                    width={42}
                    height={42}
                    className="h-10 w-10 shrink-0"
                    priority
                  />
                  <div className={isUrdu ? "text-center lg:text-right" : undefined}>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#b58a00]">
                      {copy.brandName}
                    </p>
                    <p className={`mt-0.5 text-[11px] font-medium tracking-[0.1em] text-[#7b4a4a] ${isUrdu ? "urdu-text" : ""}`}>
                      {copy.tagline}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            <div className="absolute right-0 top-1 z-20 sm:top-3 lg:static lg:ml-6 lg:pt-4">
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-2 text-[0.7rem] font-semibold tracking-[0.2em] text-[#6f5555] shadow-lg shadow-[#800000]/8 backdrop-blur-xl sm:text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  aria-pressed={!isUrdu}
                  className={`transition ${!isUrdu ? "text-[#800000]" : "hover:text-[#800000]"}`}
                >
                  EN
                </button>
                <span className="text-[#a88d8d]">|</span>
                <button
                  type="button"
                  onClick={() => setLanguage("ur")}
                  aria-pressed={isUrdu}
                  className={`transition ${isUrdu ? "text-[#800000]" : "hover:text-[#800000]"}`}
                >
                  اردو
                </button>
              </div>
            </div>
          </div>
          <div className="pointer-events-none mx-auto mt-8 max-w-4xl px-4 text-center sm:mt-10 lg:mt-7">
            <p className={`text-balance text-[1.15rem] leading-relaxed text-[#800000]/38 sm:text-[1.5rem] sm:leading-relaxed lg:text-[1.9rem] ${isUrdu ? "urdu-text" : "font-[500]"}`}>
              {copy.motto}
            </p>
          </div>
        </div>

        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-start justify-center pt-14 lg:items-center lg:pt-3">
          <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.1fr_minmax(0,28rem)]">
            <div className="hidden lg:flex flex-col justify-center">
              <div className="rounded-3xl border border-white/60 bg-white/40 p-10 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b58a00]">
                  {copy.desktopEyebrow}
                </p>
                <h1 className={`mt-3 text-3xl leading-tight text-[#800000] ${isUrdu ? "urdu-text font-semibold" : "font-[650]"}`}>
                  {copy.desktopTitle}
                </h1>

                <p className={`mt-6 text-sm leading-relaxed text-[#5b3a3a] ${isUrdu ? "urdu-text text-base" : ""}`}>
                  {copy.desktopBody}
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(128,0,0,0.10),transparent_55%)] blur-2xl"
              />

              <div className="relative mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-8">
                <div>
                  <h2 className={`text-base text-[#800000] sm:text-lg ${isUrdu ? "urdu-text font-semibold" : "font-[650]"}`}>
                    {step === "select" ? copy.chooseAccess : roleCopy.title}
                  </h2>
                </div>

                <p className={`mt-3 text-sm text-[#5b3a3a] ${isUrdu ? "urdu-text text-base" : ""}`}>
                  {roleCopy.hint}
                </p>

                {/* Step 1: Role selection */}
                <div
                  className={`mt-6 grid gap-3 transition-all duration-200 ${
                    step === "select" ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2 h-0 overflow-hidden"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => chooseRole("management")}
                    className={`group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md ${isUrdu ? "text-right" : "text-left"}`}
                  >
                    <span className={`flex items-center gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <span>
                        <span className={`block text-sm font-bold text-[#241816] ${isUrdu ? "urdu-text text-base" : ""}`}>{copy.management}</span>
                        <span className={`block text-xs text-gray-500 ${isUrdu ? "urdu-text text-sm" : ""}`}>{copy.managementHint}</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      {copy.continue}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => chooseRole("wholesale")}
                    className={`group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md ${isUrdu ? "text-right" : "text-left"}`}
                  >
                    <span className={`flex items-center gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Handshake className="h-5 w-5" />
                      </span>
                      <span>
                        <span className={`block text-sm font-bold text-[#241816] ${isUrdu ? "urdu-text text-base" : ""}`}>{copy.wholesale}</span>
                        <span className={`block text-xs text-gray-500 ${isUrdu ? "urdu-text text-sm" : ""}`}>{copy.partnerHint}</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      {copy.continue}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => chooseRole("retail")}
                    className={`group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md ${isUrdu ? "text-right" : "text-left"}`}
                  >
                    <span className={`flex items-center gap-3 ${isUrdu ? "flex-row-reverse" : ""}`}>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Store className="h-5 w-5" />
                      </span>
                      <span>
                        <span className={`block text-sm font-bold text-[#241816] ${isUrdu ? "urdu-text text-base" : ""}`}>{copy.retail}</span>
                        <span className={`block text-xs text-gray-500 ${isUrdu ? "urdu-text text-sm" : ""}`}>{copy.partnerHint}</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      {copy.continue}
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
                        {selectedRole === "management" ? copy.username : copy.phone}
                      </span>
                      <div className="relative">
                        <UserRound
                          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${
                            isUrdu ? "right-3" : "left-3"
                          }`}
                        />
                        <input
                          name="identifier"
                          type={selectedRole === "management" ? "text" : "tel"}
                          value={form.identifier}
                          onChange={handleChange}
                          placeholder={selectedRole === "management" ? copy.username : copy.phone}
                          autoComplete="username"
                          inputMode={selectedRole === "management" ? undefined : "tel"}
                          maxLength={selectedRole === "management" ? undefined : 11}
                          dir={selectedRole === "management" && isUrdu ? "rtl" : "ltr"}
                          className={`h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25 ${
                            isUrdu ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"
                          }`}
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="sr-only">{copy.password}</span>
                      <div className="relative">
                        <LockKeyhole
                          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${
                            isUrdu ? "right-3" : "left-3"
                          }`}
                        />
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={handleChange}
                          placeholder={copy.password}
                          autoComplete="current-password"
                          dir="ltr"
                          className={`h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25 ${
                            isUrdu ? "pr-10 pl-12 text-right" : "pl-10 pr-12 text-left"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className={`absolute top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:text-[#800000] focus:outline-none focus:ring-2 focus:ring-[#800000]/25 ${
                            isUrdu ? "left-3" : "right-3"
                          }`}
                          aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>

                    <label className={`flex items-center justify-between gap-3 pt-1 text-sm text-gray-600 ${isUrdu ? "urdu-text" : ""}`}>
                      <span className={`flex items-center gap-2 ${isUrdu ? "flex-row-reverse" : ""}`}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                        />
                        {copy.rememberMe}
                      </span>
                    </label>

                    {errorMessage ? (
                      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={!form.identifier.trim() || !form.password.trim() || isSubmitting}
                      className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#800000] to-[#5b0303] text-sm font-bold text-white shadow-lg shadow-[#800000]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? copy.signingIn : copy.signIn}
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
                        {copy.goBack}
                      </button>
                      <a
                        href="/signup"
                        className="inline-flex items-center rounded-lg px-2 py-1 font-bold text-[#800000] transition hover:text-[#6f0000] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                      >
                        {copy.createAccount}
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
