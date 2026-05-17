import {
  Geist_Mono,
  Montserrat,
  Noto_Nastaliq_Urdu,
  Poppins,
} from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/app/ui/auth-provider";
import { LanguageProvider } from "@/app/ui/language-provider";
import { PortalBadgesProvider } from "@/app/ui/portal-badges-provider";
import { PortalShell } from "@/app/ui/portal-shell";
import { ServiceWorkerRegister } from "@/app/ui/sw-register";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-urdu-fallback",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const nastaleeq = localFont({
  src: "../public/fonts/JameelNooriNastaleeq.ttf",
  variable: "--font-nastaleeq",
  display: "swap",
});

export const metadata = {
  title: "Hafiz Clothes House",
  description: "Digital operations portal for Hafiz Clothes House.",
  manifest: "/manifest.json",
  icons: {
    icon: "/hch-logo.svg",
    shortcut: "/hch-logo.svg",
    apple: "/hch-logo.svg",
  },
};

export const viewport = {
  themeColor: "#800000",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${poppins.variable} ${nastaleeq.variable} ${notoNastaliqUrdu.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#800000" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full bg-[var(--portal-canvas)] text-[var(--portal-ink)] antialiased">
        <ServiceWorkerRegister />
        <AuthProvider>
          <PortalBadgesProvider>
            <LanguageProvider>
              <PortalShell>{children}</PortalShell>
            </LanguageProvider>
          </PortalBadgesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
