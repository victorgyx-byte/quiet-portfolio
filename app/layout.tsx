import type { Metadata } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Student's Companion",
  description: "A calm student-owned reflection portfolio for secondary school learners."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
