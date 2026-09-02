"use client";

/**
 * Local file generation glue for the card screen: vCard and backup files,
 * plus backup restore. Everything runs on-device.
 */
import type { Card, WalletIds } from "@/core/card/types";
import { bytesToBase64, base64ToBytes } from "@/core/share/bytes";
import { buildVcard, vcardFilename } from "@/core/vcard/build";
import { backupFilename, parseBackup, serializeBackup } from "@/core/backup/codec";
import type { BackupParseError, BackupPhotoV1 } from "@/core/backup/schema";
import { saveCard, savePhoto, saveWalletIds, type StoredPhoto } from "@/adapters/idb/cardStore";

async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

/** Build the .vcf file, embedding the photo when present. */
export async function makeVcardFile(card: Card, photo: StoredPhoto | null): Promise<File> {
  let vcardPhoto: { mimeType: string; base64: string } | undefined;
  if (
    photo !== null &&
    (photo.meta.mimeType === "image/jpeg" || photo.meta.mimeType === "image/png")
  ) {
    vcardPhoto = { mimeType: photo.meta.mimeType, base64: await blobToBase64(photo.blob) };
  }
  const text = buildVcard(card, vcardPhoto);
  return new File([text], vcardFilename(card.fullName), { type: "text/vcard" });
}

/** Build the .byzcard backup file (schema-versioned JSON). */
export async function makeBackupFile(
  card: Card,
  photo: StoredPhoto | null,
  walletIds: WalletIds,
): Promise<File> {
  let backupPhoto: BackupPhotoV1 | undefined;
  if (
    photo !== null &&
    (photo.meta.mimeType === "image/jpeg" || photo.meta.mimeType === "image/png")
  ) {
    backupPhoto = {
      mimeType: photo.meta.mimeType,
      width: photo.meta.width,
      height: photo.meta.height,
      dataBase64: await blobToBase64(photo.blob),
    };
  }
  const text = serializeBackup(
    {
      card,
      photo: backupPhoto,
      walletIds: Object.keys(walletIds).length > 0 ? walletIds : undefined,
    },
    new Date().toISOString(),
  );
  return new File([text], backupFilename(card.fullName), { type: "application/json" });
}

export type RestoreResult = { ok: true } | { ok: false; error: BackupParseError | "storage" };

/** Validate and restore a backup file into local storage. */
export async function restoreFromBackup(file: File): Promise<RestoreResult> {
  const parsed = parseBackup(await file.text());
  if (!parsed.ok) return parsed;
  try {
    await saveCard(parsed.backup.card);
    if (parsed.backup.photo !== undefined) {
      const bytes = base64ToBytes(parsed.backup.photo.dataBase64);
      if (bytes !== null) {
        const blob = new Blob([Uint8Array.from(bytes)], { type: parsed.backup.photo.mimeType });
        await savePhoto({
          blob,
          meta: {
            mimeType: parsed.backup.photo.mimeType,
            width: parsed.backup.photo.width,
            height: parsed.backup.photo.height,
            byteSize: blob.size,
          },
        });
      }
    }
    if (parsed.backup.walletIds !== undefined) await saveWalletIds(parsed.backup.walletIds);
    return { ok: true };
  } catch {
    return { ok: false, error: "storage" };
  }
}

export const RESTORE_ERROR_MESSAGES: Record<BackupParseError | "storage", string> = {
  "too-large": "That file is too large to be a BYZCARD backup.",
  "not-json": "That file is not a readable BYZCARD backup.",
  "not-backup": "That file is not a BYZCARD backup.",
  "unsupported-version": "This backup was made by a newer BYZCARD version.",
  "invalid-card": "The backup's card data is damaged and cannot be imported.",
  "invalid-photo": "The backup's photo data is damaged and cannot be imported.",
  storage: "This browser is blocking local storage, so the backup could not be restored.",
};
