"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mailtoHref, telHref } from "@/core/card/links";
import { decodeSharePayload, type SharePayload, type ShareDecodeError } from "@/core/share/codec";
import { buildVcard, vcardFilename } from "@/core/vcard/build";
import { shareOrDownloadFile } from "@/adapters/share/webShare";
import { CardView } from "@/components/CardView";

type State =
  | { kind: "loading" }
  | { kind: "ready"; payload: SharePayload }
  | { kind: "error"; error: ShareDecodeError };

const ERROR_MESSAGES: Record<ShareDecodeError, string> = {
  empty: "This link does not contain a card. Ask the sender to share it again.",
  format: "This card link is damaged or incomplete. Ask the sender to share it again.",
  "unsupported-version":
    "This card was made with a newer Byzcard version. Update or open on another device.",
  "decompress-unavailable": "This browser is too old to open this card. Try a current browser.",
  "invalid-fields": "This card link is damaged or incomplete. Ask the sender to share it again.",
};

/**
 * Recipient viewer: decodes the card entirely from the URL fragment and
 * renders the same ID card the owner sees (no photo — it never travels in
 * the link). The fragment never reaches any server and no lookup occurs.
 * Contact actions sit below the card; they are app controls, not card content.
 */
export function RecipientScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    void (async () => {
      const result = await decodeSharePayload(window.location.hash);
      if (result.ok) setState({ kind: "ready", payload: result.payload });
      else setState({ kind: "error", error: result.error });
    })();
  }, []);

  if (state.kind === "loading") return <p className="note">Opening card…</p>;

  if (state.kind === "error") {
    return (
      <div>
        <h1 style={{ fontSize: 20 }}>Couldn’t open this card</h1>
        <p className="note">{ERROR_MESSAGES[state.error]}</p>
        <Link className="btn" href="/" style={{ marginTop: 16 }}>
          What is Byzcard?
        </Link>
      </div>
    );
  }

  const card = state.payload;
  const saveContact = async () => {
    const text = buildVcard(card); // no photo: it is never transmitted in the link
    const file = new File([text], vcardFilename(card.fullName), { type: "text/vcard" });
    await shareOrDownloadFile(file, `${card.fullName} contact`);
  };

  return (
    <div>
      <CardView fields={card} photoUrl={null} qr={null} interactive />

      <h2 className="section-title">Contact actions</h2>
      <div className="stack">
        <button className="btn btn-primary" type="button" onClick={() => void saveContact()}>
          Save contact
        </button>
        <a className="btn" href={telHref(card.phone)}>
          Call
        </a>
        <a className="btn" href={mailtoHref(card.email)}>
          Email
        </a>
      </div>

      <p className="note" style={{ marginTop: 20, textAlign: "center" }}>
        This card was decoded on your device from the link itself — nothing was looked up on a
        server. <Link href="/">Create your own Byzcard</Link>
      </p>
    </div>
  );
}
