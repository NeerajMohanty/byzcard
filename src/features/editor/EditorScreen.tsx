"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PHOTO_CROP,
  PRONOUN_CHOICES,
  type Card,
  type CardFieldName,
  type LinkEntry,
  type LinkGroup,
  type PhotoCrop,
  type PhotoMeta,
} from "@/core/card/types";
import { buildCard, validateCardFields } from "@/core/card/validate";
import { loadCard, loadPhoto, savePhoto, deletePhoto, saveCard } from "@/adapters/idb/cardStore";
import { StorageUnavailableError } from "@/adapters/idb/db";
import { CardView } from "@/components/CardView";
import { useClientValue } from "@/lib/useClientValue";
import { isIos, isStandaloneDisplay } from "@/lib/platform";
import { useShareQr } from "@/lib/useShareQr";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { ImportBackupButton } from "@/features/card/ImportBackupButton";
import { CardForm, type RawFieldValues } from "./CardForm";
import { LinkGroupEditor } from "./LinkGroupEditor";
import { PhotoField } from "./PhotoField";

const EMPTY: RawFieldValues = {
  fullName: "",
  preferredName: "",
  pronouns: "",
  role: "",
  headline: "",
  company: "",
  phone: "",
  email: "",
  website: "",
  linkedin: "",
};

const EMPTY_GROUPS: Record<LinkGroup, LinkEntry[]> = { social: [], messaging: [], links: [] };

/** The pronouns select stores a choice; resolve it to the stored string. */
function resolvePronouns(choice: string, custom: string): string {
  if (choice === "custom") return custom;
  if (choice === "prefer-not" || choice === "") return "";
  return choice;
}

type PhotoState = { blob: Blob; meta: PhotoMeta } | null;

export function EditorScreen() {
  const router = useRouter();
  const [values, setValues] = useState<RawFieldValues>(EMPTY);
  const [customPronouns, setCustomPronouns] = useState("");
  const [linkGroups, setLinkGroups] = useState<Record<LinkGroup, LinkEntry[]>>(EMPTY_GROUPS);
  const [issues, setIssues] = useState<Partial<Record<CardFieldName | LinkGroup, string>>>({});
  const [photo, setPhoto] = useState<PhotoState>(null);
  const [crop, setCrop] = useState<PhotoCrop>(DEFAULT_PHOTO_CROP);
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
          const stored = card.pronouns ?? "";
          const preset = (PRONOUN_CHOICES as readonly string[]).includes(stored);
          setValues({
            fullName: card.fullName,
            preferredName: card.preferredName ?? "",
            pronouns: stored === "" ? "" : preset ? stored : "custom",
            role: card.role,
            headline: card.headline ?? "",
            company: card.company,
            phone: card.phone,
            email: card.email,
            website: card.website ?? "",
            linkedin: card.linkedin ?? "",
          });
          if (stored !== "" && !preset) setCustomPronouns(stored);
          setLinkGroups({
            social: card.social ?? [],
            messaging: card.messaging ?? [],
            links: card.links ?? [],
          });
          const storedPhoto = await loadPhoto();
          if (storedPhoto !== null) {
            setPhoto(storedPhoto);
            if (storedPhoto.crop !== undefined) setCrop(storedPhoto.crop);
          }
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

  // Full raw input (text fields + resolved pronouns + optional groups).
  const profileInput = useMemo(
    () => ({
      ...values,
      pronouns: resolvePronouns(values.pronouns, customPronouns),
      social: linkGroups.social,
      messaging: linkGroups.messaging,
      links: linkGroups.links,
    }),
    [values, customPronouns, linkGroups],
  );

  // Live-preview QR only once the required fields validate.
  const validFields = useMemo(() => {
    const result = validateCardFields(profileInput);
    return result.ok ? result.fields : null;
  }, [profileInput]);
  const { state: shareState, oversize } = useShareQr(validFields);
  const previewPhotoUrl = useObjectUrl(photo?.blob ?? null);
  const standaloneIos = useClientValue(() => isStandaloneDisplay() && isIos(), false);

  const handleChange = (field: CardFieldName, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setIssues((previous) =>
      previous[field] !== undefined ? { ...previous, [field]: undefined } : previous,
    );
  };

  const handleSave = async () => {
    if (saving) return; // duplicate submit (double click / rapid Enter)
    const result = validateCardFields(profileInput);
    if (!result.ok) {
      const map: Partial<Record<CardFieldName | LinkGroup, string>> = {};
      for (const issue of result.issues) {
        if (map[issue.field] === undefined) map[issue.field] = issue.message;
      }
      setIssues(map);
      return;
    }
    if (oversize !== null) return;
    setSaving(true);
    try {
      // Timing marks only (never card contents) — inspectable via the
      // Performance panel or performance.getEntriesByName("byzcard-save").
      const t0 = performance.now();
      const card = buildCard(result.fields, existing ?? undefined);
      await saveCard(card);
      const t1 = performance.now();
      if (photo !== null) await savePhoto({ ...photo, crop });
      else await deletePhoto();
      const t2 = performance.now();
      performance.measure("byzcard-save-card", { start: t0, end: t1 });
      performance.measure("byzcard-save-photo", { start: t1, end: t2 });
      performance.measure("byzcard-save", { start: t0, end: t2 });
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

      {existing === null && standaloneIos && (
        <p className="note" style={{ margin: "0 0 16px" }}>
          First time here? Create your card once and it will stay on this device.
        </p>
      )}

      <CardView
        fields={{
          fullName: values.fullName,
          preferredName: values.preferredName === "" ? undefined : values.preferredName,
          pronouns:
            resolvePronouns(values.pronouns, customPronouns) === ""
              ? undefined
              : resolvePronouns(values.pronouns, customPronouns),
          role: values.role,
          headline: values.headline === "" ? undefined : values.headline,
          company: values.company,
          phone: values.phone,
          email: values.email,
          website: values.website,
          social: linkGroups.social,
          messaging: linkGroups.messaging,
          links: linkGroups.links,
        }}
        photoUrl={previewPhotoUrl}
        qr={shareState?.qr ?? null}
        photoCrop={crop}
        photoAspect={
          photo !== null && photo.meta.height > 0 ? photo.meta.width / photo.meta.height : undefined
        }
      />

      {oversize !== null && (
        <p className="status-error" role="alert" style={{ marginTop: 10 }}>
          Your card has too much information to share by QR ({oversize.bytes} of{" "}
          {oversize.hardLimit} bytes). Remove or shorten an optional link, or shorten long fields.
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
          photo={photo}
          crop={crop}
          onPhotoChange={setPhoto}
          onCropChange={setCrop}
        />
        <CardForm
          values={values}
          customPronouns={customPronouns}
          issues={issues}
          onChange={handleChange}
          onCustomPronounsChange={setCustomPronouns}
        />

        {/* Optional profile links — collapsed until the user asks. */}
        <div className="disclosure-group" style={{ margin: "4px 0 20px" }}>
          <LinkGroupEditor
            group="social"
            title="Social"
            addLabel="Add social"
            entries={linkGroups.social}
            error={issues.social}
            onChange={(entries) => setLinkGroups((g) => ({ ...g, social: entries }))}
          />
          <LinkGroupEditor
            group="messaging"
            title="Messaging"
            addLabel="Add messaging"
            entries={linkGroups.messaging}
            error={issues.messaging}
            onChange={(entries) => setLinkGroups((g) => ({ ...g, messaging: entries }))}
          />
          <LinkGroupEditor
            group="links"
            title="Links"
            addLabel="Add link"
            entries={linkGroups.links}
            error={issues.links}
            onChange={(entries) => setLinkGroups((g) => ({ ...g, links: entries }))}
          />
        </div>

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
          Your card and photo are stored only in this browser, on this device.
        </p>
      </form>

      {existing === null && standaloneIos && (
        // Subtle Safari→installed-app recovery. The wording is deliberately
        // transport-agnostic: today it restores via the local .byzcard
        // import, but a future local hand-off mechanism (e.g. clipboard)
        // can replace the implementation without changing this UI.
        <div className="stack" style={{ marginTop: 24 }}>
          <p className="note">
            Already created your card in a browser? Restore the backup you saved before installing.
          </p>
          <ImportBackupButton
            label="Restore existing card"
            onRestored={() => router.push("/card")}
          />
          <p className="note">Choose the .byzcard file you saved before installing.</p>
        </div>
      )}

      {existing === null && !standaloneIos && (
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
