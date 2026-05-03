"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
    subtitle: "Full access for Hafiz Talha with business-wide metrics and controls.",
  },
  {
    key: "wholesale",
    title: "Wholesale Customer",
    subtitle: "Wholesale prices, own credit history, and khata visibility.",
  },
  {
    key: "retail",
    title: "Retail / New Customer",
    subtitle: "Retail prices, shop highlights, and personal khata history when available.",
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
    return <section className="login-page" />;
  }

  return (
    <section className="login-page">
      <div className="login-shell">
        <div className="login-brand-panel">
          <Image
            src="/hch-logo.svg"
            alt="HCH logo"
            width={64}
            height={64}
            className="login-logo-mark"
            priority
          />
          <p className="dashboard-eyebrow">Hafiz Clothes House</p>
          <h1>Hafiz Clothes House</h1>
          <p className="login-copy">
            Sign in with the right access level to view admin metrics, wholesale
            pricing, customer history, and the latest khata activity.
          </p>
        </div>

        <div className="login-card">
          <div className="login-mode-tabs" role="tablist" aria-label="Login modes">
            {loginModes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={`login-mode-tab ${activeMode === mode.key ? "is-active" : ""}`}
                onClick={() => {
                  setActiveMode(mode.key);
                  setErrorMessage("");
                }}
              >
                {mode.title}
              </button>
            ))}
          </div>

          <div className="login-mode-copy">
            <h2>{loginModes.find((mode) => mode.key === activeMode)?.title}</h2>
            <p>{loginModes.find((mode) => mode.key === activeMode)?.subtitle}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {activeMode === "admin" ? (
              <>
                <label className="login-field">
                  <span>Username</span>
                  <input
                    name="username"
                    type="text"
                    value={forms.admin.username}
                    onChange={handleChange}
                    placeholder="Enter admin username"
                    autoComplete="username"
                  />
                </label>

                <label className="login-field">
                  <span>Password</span>
                  <input
                    name="password"
                    type="password"
                    value={forms.admin.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="login-field">
                  <span>Phone Number</span>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={forms[activeMode].phone}
                    onChange={handleChange}
                    placeholder="Enter registered phone number"
                    autoComplete="tel"
                  />
                </label>

                <label className="login-field">
                  <span>Name</span>
                  <input
                    name="name"
                    type="text"
                    value={forms[activeMode].name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    autoComplete="name"
                  />
                </label>
              </>
            )}

            {errorMessage ? <p className="login-feedback error">{errorMessage}</p> : null}

            <button type="submit" className="login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
