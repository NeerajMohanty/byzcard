import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buildCard, validateCardFields } from "@/core/card/validate";
import {
  deletePhoto,
  loadCard,
  loadPhoto,
  loadWalletIds,
  resetAllLocalData,
  saveCard,
  savePhoto,
  saveWalletIds,
} from "@/adapters/idb/cardStore";
import { kvSet } from "@/adapters/idb/db";

function makeCard(overrides: Partial<Record<string, string>> = {}) {
  const validated = validateCardFields({
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
    ...overrides,
  });
  if (!validated.ok) throw new Error("fixture invalid");
  return buildCard(validated.fields);
}

beforeEach(async () => {
  await resetAllLocalData();
});

describe("IndexedDB card store", () => {
  it("saves and loads a card", async () => {
    const card = makeCard();
    await saveCard(card);
    expect(await loadCard()).toEqual(card);
  });

  it("updates an existing card in place", async () => {
    const card = makeCard();
    await saveCard(card);
    const updated = { ...card, role: "Director of Research", updatedAt: new Date().toISOString() };
    await saveCard(updated);
    expect((await loadCard())?.role).toBe("Director of Research");
  });

  it("returns null when no card exists", async () => {
    expect(await loadCard()).toBeNull();
  });

  it("treats corrupted stored data as absent and clears it", async () => {
    await kvSet("card", { hello: "not a card" });
    expect(await loadCard()).toBeNull();
    expect(await loadCard()).toBeNull(); // idempotent after cleanup
  });

  it("saves, loads, and deletes the photo blob with metadata", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" });
    const meta = { mimeType: "image/jpeg", width: 512, height: 512, byteSize: 4 };
    await savePhoto({ blob, meta });
    const loaded = await loadPhoto();
    expect(loaded).not.toBeNull();
    expect(loaded?.meta).toEqual(meta);
    expect(loaded?.blob.size).toBe(4);
    await deletePhoto();
    expect(await loadPhoto()).toBeNull();
  });

  it("persists wallet identifiers", async () => {
    expect(await loadWalletIds()).toEqual({});
    await saveWalletIds({ appleSerialNumber: "abc123", googleObjectSuffix: "abc123" });
    expect(await loadWalletIds()).toEqual({
      appleSerialNumber: "abc123",
      googleObjectSuffix: "abc123",
    });
  });

  it("reset clears everything", async () => {
    await saveCard(makeCard());
    await saveWalletIds({ appleSerialNumber: "abc" });
    await resetAllLocalData();
    expect(await loadCard()).toBeNull();
    expect(await loadWalletIds()).toEqual({});
  });
});
