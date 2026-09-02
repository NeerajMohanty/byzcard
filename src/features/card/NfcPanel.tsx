"use client";

import { useState } from "react";
import { checkNdefFit, NFC_TAG_BUDGETS } from "@/core/ndef/build";
import { webNfcSupported, writeNfcUrl, type NfcWriteOutcome } from "@/adapters/nfc/webNfc";
import { isIos } from "@/lib/platform";
import { useClientValue } from "@/lib/useClientValue";

interface NfcPanelProps {
  shareLink: string | null;
}

const OUTCOME_MESSAGES: Record<Exclude<NfcWriteOutcome, "written">, string> = {
  unsupported: "NFC writing is not supported in this browser.",
  "permission-denied": "NFC permission was declined.",
  failed: "Writing failed — hold the tag steady against the back of the phone and try again.",
  aborted: "No tag was detected. Tap Write and hold a tag to the phone within 30 seconds.",
};

export function NfcPanel({ shareLink }: NfcPanelProps) {
  const supported = useClientValue<boolean | null>(webNfcSupported, null);
  const ios = useClientValue(isIos, false);
  const [state, setState] = useState<"idle" | "writing" | "written" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (supported === null || shareLink === null) return null;

  const fit = checkNdefFit(shareLink);

  if (!supported) {
    return (
      <p className="note">
        NFC tag writing is not available from this browser.{" "}
        {ios
          ? "iPhones cannot write NFC tags from any browser — use the QR code or Wallet pass to share instead. (iPhones can still read tags written elsewhere.)"
          : "On Android, Chrome supports writing NFC tags. Sharing by QR and Wallet works everywhere."}
      </p>
    );
  }

  const handleWrite = async () => {
    setState("writing");
    setMessage("Hold an NFC tag against the back of the phone…");
    const outcome = await writeNfcUrl(shareLink);
    if (outcome === "written") {
      setState("written");
      setMessage("Tag written. Any modern phone that taps it opens your card.");
    } else {
      setState("error");
      setMessage(OUTCOME_MESSAGES[outcome]);
    }
  };

  return (
    <div className="stack">
      <p className={fit.fitsNtag216 ? "note" : "status-error"}>
        NFC payload: {fit.bytes} / {NFC_TAG_BUDGETS.ntag216} bytes (NTAG216)
        {fit.fitsNtag215
          ? ` — also fits NTAG215 (${NFC_TAG_BUDGETS.ntag215} bytes)`
          : ` — needs NTAG216; too large for NTAG215 (${NFC_TAG_BUDGETS.ntag215} bytes)`}
      </p>
      {fit.fitsNtag216 ? (
        <button
          className="btn"
          type="button"
          disabled={state === "writing"}
          onClick={() => void handleWrite()}
        >
          {state === "writing" ? "Waiting for tag…" : "Write to NFC tag"}
        </button>
      ) : (
        <p className="status-error" role="alert">
          The card is too large for common NFC tags. Shorten long fields (company, website,
          LinkedIn) to enable NFC writing.
        </p>
      )}
      {message !== null && (
        <p className={state === "error" ? "status-error" : "note"} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
