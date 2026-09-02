"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/core/card/types";
import { encodeQrText, type QrSymbol } from "@/core/qr";
import { buildVcard } from "@/core/vcard/build";
import {
  copyText,
  shareOrDownloadFile,
  shareUrl as webShareUrl,
  canShareText,
} from "@/adapters/share/webShare";
import type { StoredPhoto } from "@/adapters/idb/cardStore";
import { QrSvg } from "@/components/QrSvg";
import { makeVcardFile } from "./files";

interface ShareActionsProps {
  card: Card;
  photo: StoredPhoto | null;
  shareLink: string | null;
}

export function ShareActions({ card, photo, shareLink }: ShareActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [showContactQr, setShowContactQr] = useState(false);

  // Contact QR: a vCard payload (no photo — QR capacity) readable by any
  // camera app even with no BYZCARD page involved.
  const contactQr = useMemo<QrSymbol | null>(() => {
    if (!showContactQr) return null;
    try {
      return encodeQrText(buildVcard(card), { ecl: "M" });
    } catch {
      return null;
    }
  }, [card, showContactQr]);

  const handleShareLink = async () => {
    if (shareLink === null) return;
    setMessage(null);
    if (canShareText()) {
      const outcome = await webShareUrl(shareLink, `${card.fullName} — business card`);
      if (outcome === "failed") setMessage("Sharing is not available here.");
      return;
    }
    const copied = await copyText(shareLink);
    setMessage(copied ? "Link copied to clipboard." : "Copy the link from the address below.");
  };

  const handleSaveContact = async () => {
    setMessage(null);
    const file = await makeVcardFile(card, photo);
    const outcome = await shareOrDownloadFile(file, `${card.fullName} contact`);
    if (outcome === "downloaded") {
      setMessage("Contact file saved — open it to add the contact.");
    }
  };

  return (
    <div className="stack">
      <button
        className="btn"
        type="button"
        disabled={shareLink === null}
        onClick={() => void handleShareLink()}
      >
        Share card link
      </button>
      <button className="btn" type="button" onClick={() => void handleSaveContact()}>
        Save / share contact file (.vcf)
      </button>
      <button className="btn" type="button" onClick={() => setShowContactQr((v) => !v)}>
        {showContactQr ? "Hide contact QR" : "Show contact QR (works fully offline)"}
      </button>
      {showContactQr && contactQr !== null && (
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
          <div style={{ width: 200 }}>
            <QrSvg symbol={contactQr} label="QR code containing this contact as a vCard" />
          </div>
        </div>
      )}
      {showContactQr && contactQr === null && (
        <p className="status-error" role="alert">
          The contact details are too long for a contact QR. The card link QR still works.
        </p>
      )}
      {message !== null && (
        <p className="note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
