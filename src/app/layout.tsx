import type { Metadata, Viewport } from "next";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "BYZCARD — your business card, on your phone",
  description:
    "Create a digital business card that lives on your phone. No account, no database — share it from your Wallet with a QR code.",
  applicationName: "BYZCARD",
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
        <main>{children}</main>
        <SwRegister />
      </body>
    </html>
  );
}
