/**
 * Typed local persistence for the card, photo, and Wallet identifiers.
 * Everything here stays on the device; corrupted data is detected via the
 * core type guards and treated as absent rather than crashing the app.
 */
import {
  clampPhotoCrop,
  isPhotoCrop,
  type Card,
  type PhotoCrop,
  type PhotoMeta,
  type WalletIds,
} from "@/core/card/types";
import { isStoredCard } from "@/core/card/validate";
import { kvClear, kvDelete, kvGet, kvSet, requestPersistentStorage } from "./db";

const KEY_CARD = "card";
const KEY_PHOTO_BYTES = "photoBytes";
const KEY_PHOTO_META = "photoMeta";
const KEY_PHOTO_CROP = "photoCrop";
const KEY_WALLET_IDS = "walletIds";

export interface StoredPhoto {
  blob: Blob;
  meta: PhotoMeta;
  /** Absent on cards saved before crop support existed. */
  crop?: PhotoCrop;
}

export async function saveCard(card: Card): Promise<void> {
  await kvSet(KEY_CARD, card);
  void requestPersistentStorage();
}

export async function loadCard(): Promise<Card | null> {
  const value = await kvGet(KEY_CARD);
  if (value === undefined || value === null) return null;
  if (!isStoredCard(value)) {
    // Corrupted or foreign data — treat as absent.
    await kvDelete(KEY_CARD);
    return null;
  }
  return value;
}

function isPhotoMeta(value: unknown): value is PhotoMeta {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.mimeType === "string" &&
    typeof record.width === "number" &&
    typeof record.height === "number" &&
    typeof record.byteSize === "number"
  );
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("Unexpected reader result"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Blob read failed"));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * The photo is persisted as raw bytes + metadata rather than a Blob:
 * ArrayBuffers structured-clone reliably everywhere (including older
 * WebKit versions with historic Blob-in-IndexedDB bugs).
 */
export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const bytes = await blobToArrayBuffer(photo.blob);
  await kvSet(KEY_PHOTO_BYTES, bytes);
  await kvSet(KEY_PHOTO_META, photo.meta);
  if (photo.crop !== undefined) await kvSet(KEY_PHOTO_CROP, clampPhotoCrop(photo.crop));
  else await kvDelete(KEY_PHOTO_CROP);
}

/** Realm-safe ArrayBuffer check (IndexedDB clones can cross realms). */
function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    value instanceof ArrayBuffer || Object.prototype.toString.call(value) === "[object ArrayBuffer]"
  );
}

export async function loadPhoto(): Promise<StoredPhoto | null> {
  const bytes = await kvGet(KEY_PHOTO_BYTES);
  const meta = await kvGet(KEY_PHOTO_META);
  if (!isArrayBuffer(bytes) || !isPhotoMeta(meta)) return null;
  const crop = await kvGet(KEY_PHOTO_CROP);
  return {
    blob: new Blob([bytes], { type: meta.mimeType }),
    meta,
    ...(isPhotoCrop(crop) ? { crop: clampPhotoCrop(crop) } : {}),
  };
}

export async function deletePhoto(): Promise<void> {
  await kvDelete(KEY_PHOTO_BYTES);
  await kvDelete(KEY_PHOTO_META);
  await kvDelete(KEY_PHOTO_CROP);
}

function isWalletIds(value: unknown): value is WalletIds {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const serialOk =
    record.appleSerialNumber === undefined || typeof record.appleSerialNumber === "string";
  const suffixOk =
    record.googleObjectSuffix === undefined || typeof record.googleObjectSuffix === "string";
  return serialOk && suffixOk;
}

export async function saveWalletIds(ids: WalletIds): Promise<void> {
  await kvSet(KEY_WALLET_IDS, ids);
}

export async function loadWalletIds(): Promise<WalletIds> {
  const value = await kvGet(KEY_WALLET_IDS);
  return isWalletIds(value) ? value : {};
}

/** Remove every locally stored BYZCARD item. */
export async function resetAllLocalData(): Promise<void> {
  await kvClear();
}
