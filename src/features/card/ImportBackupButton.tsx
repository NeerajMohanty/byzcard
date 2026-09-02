"use client";

import { useRef, useState } from "react";
import { restoreFromBackup, RESTORE_ERROR_MESSAGES } from "./files";

interface ImportBackupButtonProps {
  label: string;
  /** Called after a successful restore. */
  onRestored: () => void;
}

/** File picker + validated restore of a .byzcard backup. Fully local. */
export function ImportBackupButton({ label, onRestored }: ImportBackupButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (file: File | undefined) => {
    if (file === undefined) return;
    setError(null);
    const result = await restoreFromBackup(file);
    if (result.ok) onRestored();
    else setError(RESTORE_ERROR_MESSAGES[result.error]);
    if (inputRef.current !== null) inputRef.current.value = "";
  };

  return (
    <>
      <button className="btn" type="button" onClick={() => inputRef.current?.click()}>
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".byzcard,application/json"
        className="visually-hidden"
        aria-label="Import a .byzcard backup file"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />
      {error !== null && (
        <p className="status-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
