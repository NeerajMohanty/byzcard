/**
 * Backup file format (.byzcard) — versioned, documented, locally generated.
 * A backup is plain JSON. Nothing in it is ever executed.
 */
import type { Card, WalletIds } from "../card/types";

export const BACKUP_FORMAT = "byzcard-backup";
export const BACKUP_SCHEMA_VERSION = 1;

/** Decoded photo size cap inside a backup (bytes). */
export const BACKUP_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
/** Whole backup file size cap (bytes). */
export const BACKUP_FILE_MAX_BYTES = 5 * 1024 * 1024;

export const BACKUP_PHOTO_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export interface BackupPhotoV1 {
  mimeType: (typeof BACKUP_PHOTO_MIME_TYPES)[number];
  width: number;
  height: number;
  dataBase64: string;
}

export interface BackupFileV1 {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  card: Card;
  photo?: BackupPhotoV1;
  walletIds?: WalletIds;
}

export type BackupParseError =
  | "too-large"
  | "not-json"
  | "not-backup"
  | "unsupported-version"
  | "invalid-card"
  | "invalid-photo";

export type BackupParseResult =
  { ok: true; backup: BackupFileV1 } | { ok: false; error: BackupParseError };
