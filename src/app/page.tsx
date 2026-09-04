import type { Metadata } from "next";
import { githubUrl } from "@/features/landing/github";
import { LandingNav } from "@/features/landing/LandingNav";
import { Hero } from "@/features/landing/Hero";
import { TrustStrip } from "@/features/landing/TrustStrip";
import { HowItWorks } from "@/features/landing/HowItWorks";
import { SharingWays } from "@/features/landing/SharingWays";
import { PrivacySection } from "@/features/landing/PrivacySection";
import { UseCases } from "@/features/landing/UseCases";
import { PrintSection } from "@/features/landing/PrintSection";
import { OpenSourceSection } from "@/features/landing/OpenSourceSection";
import { Faq } from "@/features/landing/Faq";
import { FinalCta } from "@/features/landing/FinalCta";
import { LandingFooter } from "@/features/landing/LandingFooter";
import { exampleQr } from "@/features/landing/exampleQr";
import styles from "@/features/landing/landing.module.css";

export const metadata: Metadata = {
  title: "Byzcard — Your business card, on your phone",
  description:
    "Create a private, local-first digital business card. Share it by QR, keep it on your Home Screen, save contacts, print cards and badges — no account required.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Byzcard — Your business card, on your phone",
    description:
      "Create a digital business card in your browser, stored on your device. Share it by QR — no app, account, or subscription required.",
    type: "website",
    url: "/",
    siteName: "Byzcard",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Byzcard" }],
  },
  twitter: {
    card: "summary",
    title: "Byzcard — Your business card, on your phone",
    description:
      "A local-first digital business card. Share by QR, save to contacts, print cards and badges — no account required.",
  },
};

export default async function LandingPage() {
  const github = githubUrl();
  const qr = await exampleQr();
  return (
    <div className={styles.page}>
      <LandingNav />
      <main>
        <Hero qr={qr} />
        <TrustStrip />
        <HowItWorks qr={qr} />
        <SharingWays />
        <PrivacySection />
        <UseCases />
        <PrintSection qr={qr} />
        <OpenSourceSection github={github} />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter github={github} />
    </div>
  );
}
