import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neighborhood Analytics · Vancouver Pilot",
  description: "A transparent neighborhood matching concept by Mumbi Infrastructure Systems Ltd.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${display.variable}`}>{children}</body></html>;
}