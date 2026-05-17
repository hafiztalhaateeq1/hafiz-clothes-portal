"use client";

function SocialIcon({ platform }) {
  const iconClassName =
    "mx-auto my-auto block h-5 w-5 text-[#800000] fill-current transition-colors duration-300";
  const iconPathClassName =
    "fill-current text-current transition-colors duration-300 group-hover:text-white group-hover:fill-white";

  if (platform === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
        <path
          className={iconPathClassName}
          fill="currentColor"
          d="M19.05 4.94A9.88 9.88 0 0 0 12.03 2C6.56 2 2.1 6.45 2.1 11.93c0 1.75.46 3.46 1.33 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.47 0 9.92-4.45 9.92-9.93 0-2.65-1.03-5.14-2.9-6.97Zm-7.02 15.22h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.53 3.69-8.22 8.24-8.22 2.2 0 4.27.85 5.82 2.4a8.15 8.15 0 0 1 2.41 5.82c0 4.53-3.69 8.23-8.23 8.23Zm4.51-6.18c-.25-.13-1.47-.72-1.7-.8-.23-.09-.39-.13-.56.12-.16.24-.64.8-.79.96-.14.16-.29.18-.54.06-.25-.13-1.04-.38-1.99-1.22a7.44 7.44 0 0 1-1.38-1.72c-.14-.25-.02-.39.1-.52.11-.11.25-.29.37-.43.12-.14.16-.24.25-.4.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.83-.2-.48-.41-.41-.56-.42h-.47c-.17 0-.43.06-.66.31-.23.24-.87.85-.87 2.06 0 1.22.89 2.39 1.01 2.55.13.17 1.76 2.69 4.26 3.77.59.25 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.17.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.3Z"
        />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
        <path
          className={iconPathClassName}
          fill="currentColor"
          d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 6.85A5.15 5.15 0 1 1 6.85 12 5.16 5.16 0 0 1 12 6.85Zm0 1.8A3.35 3.35 0 1 0 15.35 12 3.35 3.35 0 0 0 12 8.65Z"
        />
      </svg>
    );
  }

  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
        <path
          className={iconPathClassName}
          fill="currentColor"
          d="M13.36 22v-8.2h2.76l.41-3.2h-3.17V8.56c0-.93.26-1.56 1.59-1.56h1.7V4.14c-.3-.04-1.31-.14-2.5-.14-2.48 0-4.18 1.51-4.18 4.29v2.31H7.16v3.2h2.81V22h3.39Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={iconClassName}>
      <path
        className={iconPathClassName}
        fill="currentColor"
        d="M14.64 3c.37 2.04 1.58 3.26 3.6 3.4v2.2a6.2 6.2 0 0 1-3.56-1.11v4.76c0 3.56-2.15 5.75-5.25 5.75-2.87 0-5.18-2.15-5.18-5.05 0-3.05 2.4-5.23 5.43-5.23.3 0 .58.02.86.08v2.25a2.9 2.9 0 0 0-.86-.13c-1.62 0-2.91 1.14-2.91 2.9 0 1.63 1.2 2.83 2.78 2.83 1.83 0 2.66-1.3 2.66-3.24V3h2.43Z"
      />
    </svg>
  );
}

const socialLinks = [
  {
    href: "https://wa.me/yournumber",
    label: "WhatsApp",
    platform: "whatsapp",
    className: "hover:bg-[#25D366]",
  },
  {
    href: "#",
    label: "Instagram",
    platform: "instagram",
    className: "hover:bg-[#C13584]",
  },
  {
    href: "#",
    label: "Facebook",
    platform: "facebook",
    className: "hover:bg-[#1877F2]",
  },
  {
    href: "#",
    label: "TikTok",
    platform: "tiktok",
    className: "hover:bg-[#010101]",
  },
];

export function SocialLinksRow({ className = "", variant = "dashboard" }) {
  const isAuthVariant = variant === "auth";
  const wrapperClassName = isAuthVariant ? "relative z-10" : "dashboard-activity-card relative z-10";
  const contentClassName = isAuthVariant
    ? "flex flex-col items-center gap-3 pb-8 pt-6 text-center"
    : "flex flex-col items-center justify-center gap-3 px-4 pb-7 pt-4 text-center sm:pb-8 sm:pt-5";
  const rowClassName = isAuthVariant
    ? "flex flex-wrap items-center gap-2.5 sm:gap-3"
    : "flex flex-wrap items-center justify-center gap-3";
  const iconBaseClassName =
    "group flex h-11 w-11 items-center justify-center rounded-full border border-[#800000]/12 bg-white text-[#800000] shadow-sm transition-all duration-300 hover:-translate-y-1";

  return (
    <section className={`${wrapperClassName} ${className}`.trim()}>
      <div className={contentClassName}>
        <p className="dashboard-eyebrow font-semibold tracking-[0.28em] text-[#800000] sm:tracking-[0.32em]">
          Connect With Us
        </p>
        <div className={rowClassName}>
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              className={`${iconBaseClassName} ${link.className}`}
            >
              <SocialIcon platform={link.platform} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
