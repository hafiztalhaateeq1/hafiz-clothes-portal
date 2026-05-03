"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Handshake,
  LockKeyhole,
  Mail,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

function isBlank(value) {
  return !String(value ?? "").trim();
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState("select"); // select | form
  const [selectedRole, setSelectedRole] = useState(null); // retail | wholesale
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    phone: "",
    email: "",
    password: "",
    businessName: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    fullName: "",
    username: "",
    phone: "",
    email: "",
    password: "",
    businessName: "",
  });

  function validateFullName(value) {
    const v = String(value ?? "").trim();
    if (!v) return "Full Name is required.";
    if (!/^[A-Za-z ]+$/.test(v)) return "Only letters and spaces are allowed.";
    if (v.length < 3) return "Please enter a valid full name.";
    return "";
  }

  function validateBusinessName(value) {
    const v = String(value ?? "").trim();
    if (!v) return "Shop/Business Name is required.";
    if (!/^[A-Za-z ]+$/.test(v)) return "Only letters and spaces are allowed.";
    if (v.length < 2) return "Please enter a valid business name.";
    return "";
  }

  function validateUsername(value) {
    const v = String(value ?? "").trim();
    if (!v) return "Username is required.";
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(v)) {
      return "Use 3-30 characters (letters, numbers, . _ -).";
    }
    return "";
  }

  function validatePhone(value) {
    const v = String(value ?? "").trim();
    if (!v) return "Phone Number is required.";
    if (!v.startsWith("03")) return "Please enter a valid 11-digit number starting with 03";
    if (v.length !== 11) return "Please enter a valid 11-digit number starting with 03";
    if (!/^03\d{9}$/.test(v)) return "Please enter a valid 11-digit number starting with 03";
    return "";
  }

  function validateEmail(value) {
    const v = String(value ?? "").trim();
    if (!v) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address.";
    return "";
  }

  function validatePassword(value) {
    const v = String(value ?? "");
    if (!v.trim()) return "Password is required.";
    if (v.length < 8) return "Password must be at least 8 characters.";
    return "";
  }

  function passwordStrength(value) {
    const raw = String(value ?? "");
    if (!raw) return { score: 0, label: "Weak", color: "bg-red-500" };

    const lengthScore = raw.length >= 12 ? 2 : raw.length >= 8 ? 1 : 0;
    const variety =
      (/[a-z]/.test(raw) ? 1 : 0) +
      (/[A-Z]/.test(raw) ? 1 : 0) +
      (/\d/.test(raw) ? 1 : 0) +
      (/[^a-zA-Z0-9]/.test(raw) ? 1 : 0);

    const varietyScore = variety >= 3 ? 2 : variety === 2 ? 1 : 0;
    const score = Math.min(3, lengthScore + varietyScore);

    if (score >= 3) return { score, label: "Strong", color: "bg-emerald-500" };
    if (score === 2) return { score, label: "Medium", color: "bg-amber-400" };
    return { score, label: "Weak", color: "bg-red-500" };
  }

  const validation = useMemo(() => {
    const next = {
      fullName: validateFullName(form.fullName),
      username: validateUsername(form.username),
      phone: validatePhone(form.phone),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      businessName: selectedRole === "wholesale" ? validateBusinessName(form.businessName) : "",
    };

    const allValid = Object.values(next).every((msg) => !msg);
    return { errors: next, allValid };
  }, [form, selectedRole]);

  const canSubmit = validation.allValid && acceptedTerms && Boolean(selectedRole);

  function handleChange(event) {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "phone") {
      nextValue = value.replace(/[^\d]/g, "").slice(0, 11);
    }

    if (name === "fullName" || name === "businessName") {
      // Only allow letters and spaces while typing.
      nextValue = value.replace(/[^A-Za-z ]/g, "");
    }

    setForm((current) => ({ ...current, [name]: nextValue }));

    // Real-time field-level validation feedback.
    setFieldErrors((current) => {
      const next = { ...current };

      if (name === "fullName") next.fullName = validateFullName(nextValue);
      if (name === "username") next.username = validateUsername(nextValue);
      if (name === "phone") next.phone = validatePhone(nextValue);
      if (name === "email") next.email = validateEmail(nextValue);
      if (name === "password") next.password = validatePassword(nextValue);
      if (name === "businessName") next.businessName = validateBusinessName(nextValue);

      return next;
    });

    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedRole) {
      setErrorMessage("Please choose an account type.");
      return;
    }

    const cleanedPhone = String(form.phone ?? "").replace(/[^\d]/g, "");
    const submitErrors = {
      fullName: validateFullName(form.fullName),
      username: validateUsername(form.username),
      phone: validatePhone(cleanedPhone),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      businessName:
        selectedRole === "wholesale" ? validateBusinessName(form.businessName) : "",
    };

    setFieldErrors(submitErrors);

    const submitValid = Object.values(submitErrors).every((msg) => !msg);

    if (!submitValid) {
      setErrorMessage("Please fix the highlighted fields.");
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage("Please accept the Terms and Conditions to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        user_type: selectedRole, // retail | wholesale (hidden)
        status: selectedRole === "wholesale" ? "pending" : "active",
        name: form.fullName.trim(),
        username: form.username.trim(),
        phone: cleanedPhone,
        email: form.email.trim(),
        password: form.password,
        business_name: selectedRole === "wholesale" ? form.businessName.trim() : null,
      };

      // Placeholder: wire this up to Supabase Auth / custom signup when ready.
      console.log("Signup payload:", payload);
      // For now, we just redirect back to login after validation.
      router.push("/login");
    } catch (error) {
      setErrorMessage(error?.message || "Unable to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-surface">
      <div aria-hidden="true" className="auth-blob auth-blob-1" />
      <div aria-hidden="true" className="auth-blob auth-blob-2" />
      <div aria-hidden="true" className="auth-blob auth-blob-3" />
      <div aria-hidden="true" className="auth-text-watermark">
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
                      {step === "select"
                        ? "Choose account"
                        : selectedRole === "wholesale"
                          ? "Wholesale Partner"
                          : "Retail Customer"}
                    </h2>
                  </div>
                </div>

                <p className="mt-3 text-sm text-[#5b3a3a]">
                  {step === "select"
                    ? "Select the account type that matches your relationship with the shop."
                    : "Fill in your details to create the account."}
                </p>

                <div
                  className={`mt-6 grid gap-3 transition-all duration-200 ${
                    step === "select"
                      ? "opacity-100 translate-y-0"
                      : "pointer-events-none opacity-0 -translate-y-2 h-0 overflow-hidden"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("retail");
                      setStep("form");
                      setErrorMessage("");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Store className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-[#241816]">Retail Customer</span>
                        <span className="block text-xs text-gray-500">For everyday shopping</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      Continue
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("wholesale");
                      setStep("form");
                      setErrorMessage("");
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/60 px-4 py-4 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800000]/10 text-[#800000]">
                        <Handshake className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-[#241816]">Wholesale Partner (Apply)</span>
                        <span className="block text-xs text-gray-500">Pending approval</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#800000] opacity-70 group-hover:opacity-100">
                      Apply
                    </span>
                  </button>

                  <p className="rounded-2xl border border-gray-100 bg-white/70 px-4 py-3 text-xs leading-relaxed text-gray-600">
                    Want to be a Wholesale Partner?{" "}
                    <span className="font-semibold text-[#800000]">
                      Apply here
                    </span>{" "}
                    and you will be approved by Admin later.
                  </p>
                </div>

                <form
                  className={`mt-6 space-y-4 transition-all duration-200 ${
                    step === "form"
                      ? "opacity-100 translate-y-0"
                      : "pointer-events-none opacity-0 translate-y-2 h-0 overflow-hidden"
                  }`}
                  onSubmit={handleSubmit}
                >
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
                    {fieldErrors.fullName ? (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.fullName}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="sr-only">Username</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="username"
                        type="text"
                        value={form.username}
                        onChange={handleChange}
                        placeholder="Username"
                        autoComplete="username"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                    </div>
                    {fieldErrors.username ? (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.username}</p>
                    ) : null}
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
                        placeholder="03XXXXXXXXX"
                        autoComplete="tel"
                        maxLength={11}
                        pattern="03\\d{9}"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                    </div>
                    {fieldErrors.phone ? (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.phone}</p>
                    ) : null}
                  </label>

                  {selectedRole === "wholesale" ? (
                    <label className="block">
                      <span className="sr-only">Shop/Business Name</span>
                      <div className="relative">
                        <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          name="businessName"
                          type="text"
                          value={form.businessName}
                          onChange={handleChange}
                          placeholder="Shop / Business Name"
                          autoComplete="organization"
                          className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                        />
                      </div>
                      {fieldErrors.businessName ? (
                        <p className="mt-1 text-xs text-red-700">{fieldErrors.businessName}</p>
                      ) : null}
                    </label>
                  ) : null}

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
                    {fieldErrors.email ? (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="sr-only">Password</span>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Password"
                        autoComplete="new-password"
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:text-[#800000] focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p>
                    ) : null}
                  </label>

                  {/* Strength meter */}
                  <div className="-mt-2">
                    {(() => {
                      const strength = passwordStrength(form.password);
                      const width = strength.score === 0 ? "w-1/6" : strength.score === 1 ? "w-2/6" : strength.score === 2 ? "w-4/6" : "w-full";
                      return (
                        <div className="rounded-2xl border border-gray-100 bg-white/70 px-3 py-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                            <span>Password strength</span>
                            <span className={strength.score >= 3 ? "text-emerald-700" : strength.score === 2 ? "text-amber-700" : "text-red-700"}>
                              {strength.label}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                            <div className={`h-1.5 rounded-full ${strength.color} ${width}`} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-white/70 px-3 py-3 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#800000] focus:ring-2 focus:ring-[#800000]/25"
                    />
                    <span>
                      I agree to the{" "}
                      <span className="font-semibold text-[#800000]">Terms and Conditions</span>
                    </span>
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

                  <div className="flex items-center justify-between pt-2 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("select");
                        setSelectedRole(null);
                        setErrorMessage("");
                      }}
                      className="rounded-lg px-2 py-1 font-semibold text-gray-600 transition hover:text-gray-900 hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                    >
                      Go Back
                    </button>
                    <a
                      href="/login"
                      className="inline-flex items-center rounded-lg px-2 py-1 font-bold text-[#800000] transition hover:text-[#6f0000] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800000]/25"
                    >
                      Sign In
                    </a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
