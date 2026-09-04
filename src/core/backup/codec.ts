/**
 * Backup serialization, parsing, validation, and migration.
 * Parsing is defensive: every field is checked before use, malformed files
 * are rejected with a typed error, and nothing from the file is executed.
 */
import {
  clampPhotoCrop,
  isPhotoCrop,
  type Card,
  type PhotoCrop,
  type WalletIds,
} from "../card/types";
import { isStoredCard } from "../card/validate";
import { slugifyName } from "../vcard/build";
import {
  BACKUP_FILE_MAX_BYTES,
  BACKUP_FORMAT,
  BACKUP_PHOTO_MAX_BYTES,
  BACKUP_PHOTO_MIME_TYPES,
  BACKUP_SCHEMA_VERSION,
  type BackupFileV1,
  type BackupParseResult,
  type BackupPhotoV1,
} from "./schema";

export interface BackupInput {
  card: Card;
  photo?: BackupPhotoV1;
  photoCrop?: PhotoCrop;
  walletIds?: WalletIds;
}

/** Serialize a backup to pretty JSON (generated fully on-device). */
export function serializeBackup(input: BackupInput, exportedAt: string): string {
  const backup: BackupFileV1 = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    card: input.card,
    ...(input.photo !== undefined ? { photo: input.photo } : {}),
    ...(input.photo !== undefined && input.photoCrop !== undefined
      ? { photoCrop: clampPhotoCrop(input.photoCrop) }
      : {}),
    ...(input.walletIds !== undefined ? { walletIds: input.walletIds } : {}),
  };
  return JSON.stringify(backup, null, 2);
}

/** "firstname-lastname.byzcard" filename. */
export function backupFilename(fullName: string): string {
  return `${slugifyName(fullName)}.byzcard`;
}

function isValidBase64(text: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/u.test(text) && text.length % 4 === 0;
}

function parsePhoto(value: unknown): BackupPhotoV1 | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const mimeType = record.mimeType;
  if (
    typeof mimeType !== "string" ||
    !(BACKUP_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType)
  ) {
    return null;
  }
  const { width, height, dataBase64 } = record;
  if (typeof width !== "number" || !Number.isInteger(width) || width < 1 || width > 4096)
    return null;
  if (typeof height !== "number" || !Number.isInteger(height) || height < 1 || height > 4096)
    return null;
  if (typeof dataBase64 !== "string" || !isValidBase64(dataBase64)) return null;
  const decodedBytes = Math.floor((dataBase64.length * 3) / 4);
  if (decodedBytes > BACKUP_PHOTO_MAX_BYTES) return null;
  return {
    mimeType: mimeType as BackupPhotoV1["mimeType"],
    width,
    height,
    dataBase64,
  };
}

function parseWalletIds(value: unknown): WalletIds | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const out: WalletIds = {};
  if (typeof record.appleSerialNumber === "string" && record.appleSerialNumber.length <= 64) {
    out.appleSerialNumber = record.appleSerialNumber;
  }
  if (typeof record.googleObjectSuffix === "string" && record.googleObjectSuffix.length <= 64) {
    out.googleObjectSuffix = record.googleObjectSuffix;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Migrate an older backup document to the current schema.
 * V1 is the first version, so this is currently an identity hook; the switch
 * exists so future versions have a designated upgrade path.
 */
function migrateBackupDocument(record: Record<string, unknown>): Record<string, unknown> | null {
  switch (record.schemaVersion) {
    case BACKUP_SCHEMA_VERSION:
      return record;
    default:
      return null;
  }
}

/** Parse and validate a .byzcard file's text content. */
export function parseBackup(text: string): BackupParseResult {
  if (new TextEncoder().encode(text).length > BACKUP_FILE_MAX_BYTES) {
    return { ok: false, error: "too-large" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (typeof parsed !== "object" || parsed === null) return { ok: false, error: "not-backup" };
  const raw = parsed as Record<string, unknown>;
  if (raw.format !== BACKUP_FORMAT) return { ok: false, error: "not-backup" };
  if (typeof raw.schemaVersion !== "number") return { ok: false, error: "unsupported-version" };
  const record = migrateBackupDocument(raw);
  if (record === null) return { ok: false, error: "unsupported-version" };

  if (!isStoredCard(record.card)) return { ok: false, error: "invalid-card" };
  const card = record.card;

  let photo: BackupPhotoV1 | undefined;
  if (record.photo !== undefined && record.photo !== null) {
    const parsedPhoto = parsePhoto(record.photo);
    if (parsedPhoto === null) return { ok: false, error: "invalid-photo" };
    photo = parsedPhoto;
  }

  // Tolerant by design: a malformed crop never rejects a whole backup.
  const photoCrop =
    photo !== undefined && isPhotoCrop(record.photoCrop)
      ? clampPhotoCrop(record.photoCrop)
      : undefined;

  const exportedAt = typeof record.exportedAt === "string" ? record.exportedAt : "";
  const walletIds = parseWalletIds(record.walletIds);
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt,
      card,
      ...(photo !== undefined ? { photo } : {}),
      ...(photoCrop !== undefined ? { photoCrop } : {}),
      ...(walletIds !== undefined ? { walletIds } : {}),
    },
  };
}
