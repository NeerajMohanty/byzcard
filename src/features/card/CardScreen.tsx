"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card } from "@/core/card/types";
import { loadCard, loadPhoto, type StoredPhoto } from "@/adapters/idb/cardStore";
import { CardView } from "@/components/CardView";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { useShareQr } from "@/lib/useShareQr";
import { QuickAccess } from "./QuickAccess";
import { useWalletVisibility, WalletActions } from "./WalletActions";
import { ShareActions } from "./ShareActions";
import { NfcPanel } from "./NfcPanel";
import { BackupActions } from "./BackupActions";
import { PrintPanel } from "@/features/print/PrintPanel";
import { PrintSheets, type PrintFormat } from "@/features/print/PrintSheets";

export function CardScreen() {
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [photo, setPhoto] = useState<StoredPhoto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>("cr80");

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

  const wallet = useWalletVisibility();
  const photoUrl = useObjectUrl(photo?.blob ?? null);
  const photoAspect =
    photo !== null && photo.meta.height > 0 ? photo.meta.width / photo.meta.height : undefined;
  const { state: shareState } = useShareQr(card);

  if (!loaded || card === null) return <p className="note">Loading your card…</p>;

  return (
    <>
      <div className="screenOnly">
        <CardView
          fields={card}
          photoUrl={photoUrl}
          qr={shareState?.qr ?? null}
          photoCrop={photo?.crop}
          photoAspect={photoAspect}
        />
        {shareState !== null && (
          // Invisible marker: carries the share URL for automated tests and
          // diagnostics without exposing byte-count debug copy to users.
          <span data-share-url={shareState.shareUrl} hidden />
        )}

        <h2 className="section-title">Quick access</h2>
        <QuickAccess card={card} photo={photo} />

        <h2 className="section-title">Share</h2>
        <ShareActions card={card} photo={photo} shareLink={shareState?.shareUrl ?? null} />

        {/* Secondary tools stay collapsed until asked for. */}
        <div className="disclosure-group">
          <details className="disclosure">
            <summary className="disclosure-summary">Do you want to print this?</summary>
            <div className="disclosure-body">
              <PrintPanel
                format={printFormat}
                onFormatChange={setPrintFormat}
                ready={shareState !== null}
              />
            </div>
          </details>

          {(wallet.showApple || wallet.showGoogle) && (
            <details className="disclosure">
              <summary className="disclosure-summary">Add to Wallet</summary>
              <div className="disclosure-body">
                <WalletActions
                  card={card}
                  photo={photo}
                  showApple={wallet.showApple}
                  showGoogle={wallet.showGoogle}
                />
              </div>
            </details>
          )}

          <details className="disclosure">
            <summary className="disclosure-summary">Use an NFC tag?</summary>
            <div className="disclosure-body">
              <NfcPanel shareLink={shareState?.shareUrl ?? null} />
            </div>
          </details>

          <details className="disclosure">
            <summary className="disclosure-summary">Backup &amp; restore</summary>
            <div className="disclosure-body">
              <BackupActions card={card} photo={photo} onRestored={reload} />
            </div>
          </details>
        </div>

        <h2 className="section-title">Card</h2>
        <div className="stack">
          <Link className="btn" href="/create">
            Edit card
          </Link>
        </div>
      </div>

      <PrintSheets
        format={printFormat}
        card={card}
        photoUrl={photoUrl}
        qr={shareState?.qr ?? null}
        photoCrop={photo?.crop}
        photoAspect={photoAspect}
      />
    </>
  );
}
