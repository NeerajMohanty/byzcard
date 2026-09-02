"use client";

import { useRef, useState } from "react";
import type { PhotoMeta } from "@/core/card/types";
import { PHOTO_ACCEPTED_TYPES, processPhoto, type PhotoError } from "@/adapters/photo/process";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { Avatar } from "@/components/Avatar";

interface PhotoFieldProps {
  fullName: string;
  photoBlob: Blob | null;
  onPhotoChange: (photo: { blob: Blob; meta: PhotoMeta } | null) => void;
}

const ERROR_MESSAGES: Record<PhotoError, string> = {
  "unsupported-type": "Use a JPEG, PNG, or WebP image.",
  "too-large": "The image is larger than 10 MB. Choose a smaller one.",
  "decode-failed": "That image could not be read. Try a different one.",
  "process-failed": "The photo could not be processed on this device.",
};

/** Photo picker with fully local resize/compress; nothing is uploaded. */
export function PhotoField({ fullName, photoBlob, onPhotoChange }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useObjectUrl(photoBlob);

  const handleFile = async (file: File | undefined) => {
    if (file === undefined) return;
    setBusy(true);
    setError(null);
    const result = await processPhoto(file);
    setBusy(false);
    if (result.ok) {
      onPhotoChange({ blob: result.blob, meta: result.meta });
    } else {
      setError(ERROR_MESSAGES[result.error]);
    }
    if (inputRef.current !== null) inputRef.current.value = "";
  };

  return (
    <div className="field">
      <label htmlFor="photo-input">Professional photo (optional)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar fullName={fullName} photoUrl={previewUrl} size={64} />
        <div className="stack" style={{ flex: 1 }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Processing…" : photoBlob === null ? "Add photo" : "Replace photo"}
          </button>
          {photoBlob !== null && (
            <button type="button" className="btn btn-danger" onClick={() => onPhotoChange(null)}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        accept={PHOTO_ACCEPTED_TYPES.join(",")}
        className="visually-hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {error !== null && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="note">Resized and stored only on this device.</p>
    </div>
  );
}
