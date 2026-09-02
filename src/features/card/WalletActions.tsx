"use client";

import { useEffect, useState } from "react";
import type { Card, WalletIds } from "@/core/card/types";
import { generateId } from "@/core/card/validate";
import {
  fetchWalletAvailability,
  requestApplePass,
  requestGooglePass,
  type WalletAvailability,
} from "@/adapters/wallet/client";
import { loadWalletIds, saveWalletIds, type StoredPhoto } from "@/adapters/idb/cardStore";
import { photoToWalletPng } from "@/adapters/photo/process";
import { isAndroid, isIos } from "@/lib/platform";

interface WalletActionsProps {
  card: Card;
  photo: StoredPhoto | null;
}

type Busy = "apple" | "google" | null;

async function ensureWalletIds(): Promise<
  WalletIds & { appleSerialNumber: string; googleObjectSuffix: string }
> {
  const ids = await loadWalletIds();
  const appleSerialNumber = ids.appleSerialNumber ?? generateId();
  const googleObjectSuffix = ids.googleObjectSuffix ?? appleSerialNumber;
  const next = { ...ids, appleSerialNumber, googleObjectSuffix };
  await saveWalletIds(next);
  return next;
}

export function WalletActions({ card, photo }: WalletActionsProps) {
  const [availability, setAvailability] = useState<WalletAvailability | "offline" | null>(null);
  const [hasPassIdentity, setHasPassIdentity] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchWalletAvailability().then(setAvailability);
    void loadWalletIds().then((ids) => setHasPassIdentity(ids.appleSerialNumber !== undefined));
  }, []);

  const available = availability !== null && availability !== "offline" ? availability : null;
  const showApple = available?.apple === true && !isAndroid();
  const showGoogle = available?.google === true && !isIos();

  const handleApple = async () => {
    setBusy("apple");
    setMessage(null);
    const ids = await ensureWalletIds();
    const photoPng = photo !== null ? await photoToWalletPng(photo.blob) : null;
    const result = await requestApplePass(card, ids.appleSerialNumber, photoPng);
    setBusy(null);
    if (result.ok) {
      setHasPassIdentity(true);
      setMessage("Pass created — follow the prompt to add it to Apple Wallet.");
    } else {
      setMessage(
        result.reason === "offline"
          ? "Adding to Apple Wallet needs an internet connection."
          : "The pass could not be created. Please try again.",
      );
    }
  };

  const handleGoogle = async () => {
    setBusy("google");
    setMessage(null);
    const ids = await ensureWalletIds();
    const result = await requestGooglePass(card, ids.googleObjectSuffix);
    setBusy(null);
    if (!result.ok) {
      setMessage(
        result.reason === "offline"
          ? "Adding to Google Wallet needs an internet connection."
          : "The pass could not be created. Please try again.",
      );
    }
  };

  if (availability === null) return null;
  if (availability === "offline") {
    return (
      <p className="note">
        Wallet passes need an internet connection. Everything else on this page works offline.
      </p>
    );
  }
  if (!showApple && !showGoogle) {
    return (
      <p className="note">
        Wallet passes are not configured on this BYZCARD instance. Everything else works without
        them.
      </p>
    );
  }

  return (
    <div className="stack">
      {showApple && (
        <button
          className="btn"
          type="button"
          disabled={busy !== null}
          onClick={() => void handleApple()}
        >
          {busy === "apple"
            ? "Creating pass…"
            : hasPassIdentity
              ? "Update Apple Wallet pass"
              : "Add to Apple Wallet"}
        </button>
      )}
      {showGoogle && (
        <button
          className="btn"
          type="button"
          disabled={busy !== null}
          onClick={() => void handleGoogle()}
        >
          {busy === "google" ? "Creating pass…" : "Add to Google Wallet"}
        </button>
      )}
      {message !== null && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      <p className="note">
        Wallet passes are signed by the BYZCARD server in memory; your card is not stored there.
        {showGoogle && " The Google Wallet pass shows your details and QR without the photo."}
      </p>
    </div>
  );
}
