import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "Magic Math Bakery",
    description: "Follow a colourful maths story, drag number recipes into place, and grow from tiny sums to place-value challenges.",
    openGraph: {
      title: "Magic Math Bakery",
      description: "Bake, think, and play through number adventures.",
      type: "website",
      images: [{ url: imageUrl, width: 1536, height: 1024, alt: "Magic Math Bakery with three ways to make 12" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Magic Math Bakery",
      description: "Bake, think, and play through number adventures.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
