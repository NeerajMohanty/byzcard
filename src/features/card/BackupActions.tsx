"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Card } from "@/core/card/types";
import { loadWalletIds, resetAllLocalData, type StoredPhoto } from "@/adapters/idb/cardStore";
import { shareOrDownloadFile } from "@/adapters/share/webShare";
import { makeBackupFile } from "./files";
import { ImportBackupButton } from "./ImportBackupButton";

interface BackupActionsProps {
  card: Card;
  photo: StoredPhoto | null;
  /** Called after a successful import so the screen reloads its data. */
  onRestored: () => void;
}

export function BackupActions({ card, photo, onRestored }: BackupActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setMessage(null);
    const walletIds = await loadWalletIds();
    const file = await makeBackupFile(card, photo, walletIds);
    const outcome = await shareOrDownloadFile(file, "BYZCARD backup");
    if (outcome === "downloaded") setMessage(`Backup saved as ${file.name}.`);
    if (outcome === "shared") setMessage("Backup shared.");
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Delete your card and photo from this device? Export a backup first if you want to keep them.",
    );
    if (!confirmed) return;
    await resetAllLocalData();
    router.push("/");
  };

  return (
    <div className="stack">
      <button className="btn" type="button" onClick={() => void handleExport()}>
        Export card (.byzcard backup)
      </button>
      <ImportBackupButton
        label="Import card from backup"
        onRestored={() => {
          setMessage("Backup imported.");
          onRestored();
        }}
      />
      <button className="btn btn-danger" type="button" onClick={() => void handleReset()}>
        Delete card from this device
      </button>
      {message !== null && (
        <p className="status-ok" role="status">
          {message}
        </p>
      )}
      <p className="note">
        Browser storage can be cleared by the system — keep a backup file. Backups are created
        on-device and never uploaded.
      </p>
    </div>
  );
}
