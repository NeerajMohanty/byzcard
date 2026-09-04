"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "@/core/card/types";
import { loadWalletIds, type StoredPhoto } from "@/adapters/idb/cardStore";
import { downloadBlob } from "@/adapters/share/webShare";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { makeBackupFile } from "./files";

interface SheetShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Shared bottom-sheet shell: backdrop, dialog semantics, X, Escape. */
function SheetShell({ title, onClose, children }: SheetShellProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 5, 10, 0.72)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          background: "var(--surface)",
          border: "1px solid var(--card-edge)",
          borderRadius: "16px 16px 0 0",
          padding: "20px 20px 28px",
          width: "100%",
          maxWidth: 480,
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg)",
            border: "1px solid var(--text-dim)",
            borderRadius: 12,
            color: "var(--text)",
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        <h3 style={{ margin: "0 0 12px", fontSize: 17, paddingRight: 56 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface InstructionSheetProps {
  title: string;
  steps: readonly string[];
  onClose: () => void;
}

/** Concise install instructions — nothing technical. */
function InstructionSheet({ title, steps, onClose }: InstructionSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <SheetShell title={title} onClose={onClose}>
      <ol style={{ margin: "0 0 18px", paddingLeft: 22, lineHeight: 1.9 }}>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
        Got it
      </button>
    </SheetShell>
  );
}

interface BackupFirstSheetProps {
  filename: string;
  onDownload: () => Promise<void>;
  onContinue: () => void;
  onClose: () => void;
}

/** Pre-install safety step: a predictable local backup download. */
function BackupFirstSheet({ filename, onDownload, onContinue, onClose }: BackupFirstSheetProps) {
  const [ready, setReady] = useState(false);
  return (
    <SheetShell title="Save a backup first" onClose={onClose}>
      <div className="stack">
        <p className="note" style={{ margin: 0 }}>
          Before adding Byzcard to your Home Screen, download a backup of your card. On some
          devices, your saved card may not transfer automatically to the Home Screen version.
        </p>
        {!ready ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void onDownload().then(() => setReady(true))}
            >
              Download backup
            </button>
            <button type="button" className="btn" onClick={onContinue}>
              Continue without backup
            </button>
          </>
        ) : (
          <>
            <p className="status-ok" role="status" style={{ margin: 0 }}>
              Backup ready — file: {filename}
            </p>
            <p className="note" style={{ margin: 0 }}>
              Save it to your Downloads or Files. You’ll need it only if your card doesn’t appear
              after installation.
            </p>
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              Continue to Home Screen instructions
            </button>
          </>
        )}
      </div>
    </SheetShell>
  );
}

const IOS_STEPS = [
  "Tap the Share button in your browser",
  "Choose “Add to Home Screen”",
  "Tap “Add”",
] as const;

const GENERIC_STEPS = [
  "Open your browser's menu",
  "Choose “Add to Home Screen” or “Install app”",
] as const;

interface QuickAccessProps {
  card: Card;
  photo: StoredPhoto | null;
}

/**
 * Quick Access: Add Byzcard to the Home Screen — the primary free way to
 * open the card instantly. On the iOS path a predictable backup download
 * is offered first, because the installed app may start with its own
 * empty local storage.
 */
export function QuickAccess({ card, photo }: QuickAccessProps) {
  const { mode, promptInstall } = useInstallPrompt();
  const [sheet, setSheet] = useState<"backup" | "ios" | "generic" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeSheet = (): void => {
    setSheet(null);
    // Return keyboard focus to the trigger that opened the sheet.
    triggerRef.current?.focus();
  };

  if (mode === "installed") {
    return (
      <p className="status-ok" role="status">
        ✓ Byzcard opens from your Home Screen.
      </p>
    );
  }

  const handleClick = async () => {
    setMessage(null);
    if (mode === "native") {
      const outcome = await promptInstall();
      if (outcome === "accepted") return; // state flips to installed
      if (outcome === "dismissed") {
        setMessage("No problem — you can add it any time from this button.");
        return;
      }
    }
    // iOS first offers the backup safety step; installs elsewhere share
    // the browser's storage, so they go straight to the instructions.
    setSheet(mode === "ios" ? "backup" : "generic");
  };

  const handleDownloadBackup = async (): Promise<void> => {
    const walletIds = await loadWalletIds();
    const file = await makeBackupFile(card, photo, walletIds);
    downloadBlob(file, file.name);
    setFilename(file.name);
  };

  return (
    <div className="stack">
      <button
        ref={triggerRef}
        className="btn btn-primary"
        type="button"
        onClick={() => void handleClick()}
      >
        Add Byzcard to Home Screen
      </button>
      <p className="note">Open your card directly from your phone’s Home Screen.</p>
      {message !== null && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      {sheet === "backup" && (
        <BackupFirstSheet
          filename={filename}
          onDownload={handleDownloadBackup}
          onContinue={() => setSheet("ios")}
          onClose={closeSheet}
        />
      )}
      {(sheet === "ios" || sheet === "generic") && (
        <InstructionSheet
          title="Add Byzcard to your Home Screen"
          steps={sheet === "ios" ? IOS_STEPS : GENERIC_STEPS}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
