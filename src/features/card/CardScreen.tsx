"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card } from "@/core/card/types";
import { loadCard, loadPhoto, type StoredPhoto } from "@/adapters/idb/cardStore";
import { CardView } from "@/components/CardView";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { useShareQr } from "@/lib/useShareQr";
import { WalletActions } from "./WalletActions";
import { ShareActions } from "./ShareActions";
import { NfcPanel } from "./NfcPanel";
import { BackupActions } from "./BackupActions";

export function CardScreen() {
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [photo, setPhoto] = useState<StoredPhoto | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    void (async () => {
      try {
        const stored = await loadCard();
        if (stored === null) {
          router.replace("/create");
          return;
        }
        setCard(stored);
        setPhoto(await loadPhoto());
      } catch {
        router.replace("/create");
        return;
      }
      setLoaded(true);
    })();
  }, [router]);

  useEffect(() => {
    reload();
  }, [reload]);

  const photoUrl = useObjectUrl(photo?.blob ?? null);
  const { state: shareState } = useShareQr(card);

  if (!loaded || card === null) return <p className="note">Loading your card…</p>;

  return (
    <div>
      <CardView fields={card} photoUrl={photoUrl} qr={shareState?.qr ?? null} />
      {shareState !== null && (
        <p
          className="note"
          style={{ textAlign: "center", marginTop: 10 }}
          data-share-url={shareState.shareUrl}
        >
          Share link: {shareState.size.bytes} bytes — scans reliably
          {shareState.size.level === "warn" && " (large; shorter fields scan faster)"}
        </p>
      )}

      <h2 className="section-title">Wallet</h2>
      <WalletActions card={card} photo={photo} />

      <h2 className="section-title">Share</h2>
      <ShareActions card={card} photo={photo} shareLink={shareState?.shareUrl ?? null} />

      <h2 className="section-title">NFC tag</h2>
      <NfcPanel shareLink={shareState?.shareUrl ?? null} />

      <h2 className="section-title">Backup</h2>
      <BackupActions card={card} photo={photo} onRestored={reload} />

      <h2 className="section-title">Card</h2>
      <div className="stack">
        <Link className="btn" href="/create">
          Edit card
        </Link>
      </div>
    </div>
  );
}
