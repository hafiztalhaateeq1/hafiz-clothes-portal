"use client";

import { Fragment, createContext, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGE_OPTIONS, translations } from "@/app/lib/translations";

const STORAGE_KEY = "hafiz-language";

const LanguageContext = createContext(null);

function detectBrowserLanguage() {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const language = navigator.language?.toLowerCase() ?? "en";

  if (language.startsWith("ur")) {
    return "ur";
  }

  if (language.startsWith("en")) {
    return "en";
  }

  return "roman";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
    return savedLanguage && translations[savedLanguage]
      ? savedLanguage
      : detectBrowserLanguage();
  });
  const hasMounted = typeof window !== "undefined";

  function updateLanguage(nextLanguage) {
    setLanguage(nextLanguage);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    }
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage: updateLanguage,
      hasMounted,
      t: translations[hasMounted ? language : "en"] ?? translations.en,
      languages: LANGUAGE_OPTIONS,
    }),
    [hasMounted, language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}

export function LanguageSwitcher() {
  const { hasMounted, language, setLanguage, languages } = useLanguage();
  const activeLanguage = hasMounted ? language : "en";

  return (
    <div className="language-switcher-links" aria-label="Language switcher">
      {languages.map((option, index) => (
        <Fragment key={option.value}>
          <button
            type="button"
            className={`language-switcher-link ${
              activeLanguage === option.value ? "is-active" : ""
            }`}
            onClick={() => setLanguage(option.value)}
            aria-pressed={activeLanguage === option.value}
          >
            {option.label}
          </button>
          {index < languages.length - 1 ? (
            <span className="language-switcher-divider" aria-hidden="true">
              |
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
