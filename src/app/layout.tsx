import type { Metadata, Viewport } from "next";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "BYZCARD — Your business card, on your phone",
  description:
    "Create a private, local-first digital business card. Share it by QR, keep it on your Home Screen, save contacts, print cards and badges — no account required.",
  applicationName: "BYZCARD",
  appleWebApp: {
    capable: true,
    title: "BYZCARD",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
