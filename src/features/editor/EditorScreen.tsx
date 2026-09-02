"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card, CardFieldName, PhotoMeta } from "@/core/card/types";
import { buildCard, validateCardFields } from "@/core/card/validate";
import { loadCard, loadPhoto, savePhoto, deletePhoto, saveCard } from "@/adapters/idb/cardStore";
import { StorageUnavailableError } from "@/adapters/idb/db";
import { CardView } from "@/components/CardView";
import { useShareQr } from "@/lib/useShareQr";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { ImportBackupButton } from "@/features/card/ImportBackupButton";
import { CardForm, type RawFieldValues } from "./CardForm";
import { PhotoField } from "./PhotoField";

const EMPTY: RawFieldValues = {
  fullName: "",
  role: "",
  company: "",
  phone: "",
  email: "",
  website: "",
  linkedin: "",
};

type PhotoState = { blob: Blob; meta: PhotoMeta } | null;

export function EditorScreen() {
  const router = useRouter();
  const [values, setValues] = useState<RawFieldValues>(EMPTY);
  const [issues, setIssues] = useState<Partial<Record<CardFieldName, string>>>({});
  const [photo, setPhoto] = useState<PhotoState>(null);
  const [existing, setExisting] = useState<Card | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const card = await loadCard();
        if (card !== null) {
          setExisting(card);
          setValues({
            fullName: card.fullName,
            role: card.role,
            company: card.company,
            phone: card.phone,
            email: card.email,
            website: card.website ?? "",
            linkedin: card.linkedin ?? "",
          });
          const storedPhoto = await loadPhoto();
          if (storedPhoto !== null) setPhoto(storedPhoto);
        }
      } catch (error) {
        if (error instanceof StorageUnavailableError) {
          setStorageError(
            "This browser is blocking local storage (possibly private browsing). Your card cannot be saved on this device.",
          );
        }
      }
      setLoaded(true);
    })();
  }, []);

  // Live-preview QR only once the required fields validate.
  const validFields = useMemo(() => {
    const result = validateCardFields(values);
    return result.ok ? result.fields : null;
  }, [values]);
  const { state: shareState, oversize } = useShareQr(validFields);
  const previewPhotoUrl = useObjectUrl(photo?.blob ?? null);

  const handleChange = (field: CardFieldName, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setIssues((previous) =>
      previous[field] !== undefined ? { ...previous, [field]: undefined } : previous,
    );
  };

  const handleSave = async () => {
    const result = validateCardFields(values);
    if (!result.ok) {
      const map: Partial<Record<CardFieldName, string>> = {};
      for (const issue of result.issues) {
        if (map[issue.field] === undefined) map[issue.field] = issue.message;
      }
      setIssues(map);
      return;
    }
    if (oversize !== null) return;
    setSaving(true);
    try {
      const card = buildCard(result.fields, existing ?? undefined);
      await saveCard(card);
      if (photo !== null) await savePhoto(photo);
      else await deletePhoto();
      router.push("/card");
    } catch {
      setStorageError("Saving failed — this browser may be blocking local storage.");
      setSaving(false);
    }
  };

  if (!loaded) return <p className="note">Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "6px 0 16px" }}>
        {existing === null ? "Create your card" : "Edit your card"}
      </h1>

      <CardView
        fields={{
          fullName: values.fullName,
          role: values.role,
          company: values.company,
          phone: values.phone,
          email: values.email,
          website: values.website,
        }}
        photoUrl={previewPhotoUrl}
        qr={shareState?.qr ?? null}
      />

      {oversize !== null && (
        <p className="status-error" role="alert" style={{ marginTop: 10 }}>
          Your card is too large to share as a QR code ({oversize.bytes} of {oversize.hardLimit}{" "}
          bytes). Shorten long fields — usually company, website, or LinkedIn.
        </p>
      )}

      <form
        style={{ marginTop: 22 }}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <PhotoField
          fullName={values.fullName}
          photoBlob={photo?.blob ?? null}
          onPhotoChange={setPhoto}
        />
        <CardForm values={values} issues={issues} onChange={handleChange} />

        {storageError !== null && (
          <p className="status-error" role="alert">
            {storageError}
          </p>
        )}

        <button
          className="btn btn-primary"
          type="submit"
          disabled={saving || storageError !== null}
        >
          {saving ? "Saving…" : "Save card"}
        </button>
        <p className="note" style={{ marginTop: 10 }}>
          Your card and photo are stored only in this browser, on this phone.
        </p>
      </form>

      {existing === null && (
        <div className="stack" style={{ marginTop: 24 }}>
          <p className="note">Already made your card on another device or browser?</p>
          <ImportBackupButton
            label="Import card from a .byzcard backup"
            onRestored={() => router.push("/card")}
          />
        </div>
      )}
    </div>
  );
}
