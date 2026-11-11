import type { Metadata, Viewport } from "next";

import "./globals.css";

import { DemoBanner } from "@/components/demo-banner";
import { SetupRequired } from "@/components/setup-required";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { setupRequired, siteUrl } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Schemonlist — Geometry Dash Demonlist",
    template: "%s · Schemonlist",
  },
  description:
    "The community demonlist for Geometry Dash. Browse the hardest verified levels, submit your completions and verifications, and climb the leaderboard.",
  applicationName: "Schemonlist",
  openGraph: {
    title: "Schemonlist — Geometry Dash Demonlist",
    description:
      "Browse the hardest verified Geometry Dash levels, submit records and climb the leaderboard.",
    type: "website",
    images: [{ url: "/hero-art.jpg", width: 1568, height: 672, alt: "Schemonlist" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schemonlist — Geometry Dash Demonlist",
    description:
      "Browse the hardest verified Geometry Dash levels, submit records and climb the leaderboard.",
    images: ["/hero-art.jpg"],
  },
};

// Every page renders per-request: the header depends on the session cookie.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#05060e",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
        <div className="grid-lines pointer-events-none fixed inset-0 -z-10 opacity-70" aria-hidden />

        <SiteHeader user={user} />
        {setupRequired ? null : <DemoBanner />}

        <main className="shell min-h-[70vh] pb-20 pt-8">
          {setupRequired ? <SetupRequired /> : children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
