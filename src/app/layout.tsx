import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resit — Creative workspace",
  description: "An open-source Canva alternative for design, video, social publishing, and AI creation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
