import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import LanguageProvider from "@/components/LanguageProvider";

const siteUrl = "https://salmaan.site";
const profileImage = `${siteUrl}/images/profile.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Salmaan Mukhtaar Xaashi | Computer Science Student & Developer",
  description:
    "The portfolio of Salmaan Mukhtaar Xaashi, a Computer Science student at the University of Hargeisa focused on web development, programming, design, and AI-driven digital experiences.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Salmaan Mukhtaar Xaashi",
    title: "Salmaan Mukhtaar Xaashi | Computer Science Student & Developer",
    description:
      "Portfolio of Salmaan Mukhtaar Xaashi — Computer Science student, web developer, programmer, and creative digital builder.",
    images: [
      {
        url: profileImage,
        alt: "Salmaan Mukhtaar Xaashi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Salmaan Mukhtaar Xaashi | Computer Science Student & Developer",
    description:
      "Portfolio of Salmaan Mukhtaar Xaashi — Computer Science student, web developer, programmer, and creative digital builder.",
    images: [profileImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="so">
      <body className="antialiased">
        <LanguageProvider>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
