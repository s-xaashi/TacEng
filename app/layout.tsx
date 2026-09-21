import type { Metadata } from "next";
import "./globals.css";
import LanguageProvider from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "Salmaan Mukhtaar Xaashi — Portfolio",
  description:
    "Computer Science student at the University of Hargeisa combining technology, creativity, programming, design, and AI-driven digital experiences.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
