"use client";

import { useEffect, useRef, useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

interface SheetProps {
  title: string;
  steps: readonly string[];
  onClose: () => void;
}

/** Small accessible instruction sheet (focus-managed, Escape/backdrop close). */
function InstructionSheet({ title, steps, onClose }: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
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
          background: "var(--surface)",
          border: "1px solid var(--card-edge)",
          borderRadius: "16px 16px 0 0",
          padding: "20px 20px 28px",
          width: "100%",
          maxWidth: 480,
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 17 }}>{title}</h3>
        <ol style={{ margin: "0 0 18px", paddingLeft: 22, lineHeight: 1.9 }}>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

const IOS_STEPS = [
  "Tap the Share button in Safari",
  "Choose “Add to Home Screen”",
  "Tap “Add”",
] as const;

const GENERIC_STEPS = [
  "Open your browser's menu",
  "Choose “Add to Home Screen” or “Install app”",
] as const;

/**
 * Quick Access: Add BYZCARD to the Home Screen — the primary free way to
 * open the card instantly. Requires no account and no Apple credentials.
 */
export function QuickAccess() {
  const { mode, promptInstall } = useInstallPrompt();
  const [sheet, setSheet] = useState<"ios" | "generic" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (mode === "installed") {
    return (
      <p className="status-ok" role="status">
        ✓ BYZCARD opens from your Home Screen.
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
    setSheet(mode === "ios" ? "ios" : "generic");
  };

  return (
    <div className="stack">
      <button className="btn btn-primary" type="button" onClick={() => void handleClick()}>
        Add BYZCARD to Home Screen
      </button>
      <p className="note">Open your card directly from your phone’s Home Screen.</p>
      {message !== null && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      {sheet !== null && (
        <InstructionSheet
          title="Add BYZCARD to your Home Screen"
          steps={sheet === "ios" ? IOS_STEPS : GENERIC_STEPS}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
