"use client";

import { useRef, useState } from "react";
import { DEFAULT_PHOTO_CROP, type PhotoCrop, type PhotoMeta } from "@/core/card/types";
import { PHOTO_ACCEPTED_TYPES, processPhoto, type PhotoError } from "@/adapters/photo/process";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { Avatar } from "@/components/Avatar";
import { PhotoAdjust } from "./PhotoAdjust";

interface PhotoFieldProps {
  fullName: string;
  photo: { blob: Blob; meta: PhotoMeta } | null;
  crop: PhotoCrop;
  onPhotoChange: (photo: { blob: Blob; meta: PhotoMeta } | null) => void;
  onCropChange: (crop: PhotoCrop) => void;
}

const ERROR_MESSAGES: Record<PhotoError, string> = {
  "unsupported-type": "Use a JPEG, PNG, or WebP image.",
  "too-large": "The image is larger than 10 MB. Choose a smaller one.",
  "decode-failed": "That image could not be read. Try a different one.",
  "process-failed": "The photo could not be processed on this device.",
};

/**
 * Compact photo picker: preview, Replace/Remove, and an "Adjust photo"
 * entry into the focused drag/pinch framing editor. Processing is fully
 * local (resize + compress once, at selection time).
 */
export function PhotoField({
  fullName,
  photo,
  crop,
  onPhotoChange,
  onCropChange,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useObjectUrl(photo?.blob ?? null);
  const aspect = photo !== null && photo.meta.height > 0 ? photo.meta.width / photo.meta.height : 1;

  const handleFile = async (file: File | undefined) => {
    if (file === undefined) return;
    setBusy(true);
    setError(null);
    const result = await processPhoto(file);
    setBusy(false);
    if (result.ok) {
      onPhotoChange({ blob: result.blob, meta: result.meta });
      onCropChange(DEFAULT_PHOTO_CROP);
    } else {
      setError(ERROR_MESSAGES[result.error]);
    }
    if (inputRef.current !== null) inputRef.current.value = "";
  };

  return (
    <div className="field">
      <label htmlFor="photo-input">Professional photo (optional)</label>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <Avatar fullName={fullName} photoUrl={previewUrl} size={80} crop={crop} aspect={aspect} />
        <div className="stack" style={{ flex: 1 }}>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Processing…" : photo === null ? "Add photo" : "Replace photo"}
          </button>
          {photo !== null && (
            <button type="button" className="btn btn-danger" onClick={() => onPhotoChange(null)}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      {photo !== null && (
        <button
          type="button"
          className="btn"
          style={{ marginTop: 10 }}
          onClick={() => setAdjusting(true)}
        >
          Adjust photo
        </button>
      )}
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
      {adjusting && photo !== null && previewUrl !== null && (
        <PhotoAdjust
          fullName={fullName}
          photoUrl={previewUrl}
          aspect={aspect}
          crop={crop}
          onCropChange={onCropChange}
          onClose={() => setAdjusting(false)}
        />
      )}
    </div>
  );
}
