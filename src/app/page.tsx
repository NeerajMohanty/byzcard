import Link from "next/link";
import { ExampleCard } from "@/components/ExampleCard";

export default function LandingPage() {
  return (
    <div>
      <header style={{ padding: "18px 0 26px" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "var(--text-dim)",
            margin: 0,
          }}
        >
          BYZCARD
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: "14px 0 10px" }}>
          Create your digital business card.
        </h1>
        <p className="note" style={{ fontSize: 15, margin: 0 }}>
          Keep it on your phone. Share it from Wallet.
        </p>
      </header>

      <ExampleCard />

      <div className="stack" style={{ marginTop: 24 }}>
        <Link className="btn btn-primary" href="/create">
          Create your card
        </Link>
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 className="section-title">Private by architecture</h2>
        <p className="note">
          Your card is created and stored locally on your device. BYZCARD has no accounts and no
          card database, and does not store your card, photo, or contact information. When you
          explicitly add your card to Apple Wallet or Google Wallet, the information needed to
          create that pass is transmitted once for signing and is not retained.
        </p>
        <p className="note">
          The QR code carries your card inside the link itself — scanning it opens the card directly
          on the other person’s phone, with no lookup on any server.
        </p>
      </section>
    </div>
  );
}
