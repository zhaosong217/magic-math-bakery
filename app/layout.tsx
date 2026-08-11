import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magic Math Bakery — A Number Game",
  description: "Build target numbers with magical ingredients in this playful elementary maths prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
