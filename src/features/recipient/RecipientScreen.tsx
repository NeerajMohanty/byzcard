"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { displayUrl } from "@/core/card/types";
import { decodeSharePayload, type SharePayloadV1, type ShareDecodeError } from "@/core/share/codec";
import { buildVcard, vcardFilename } from "@/core/vcard/build";
import { shareOrDownloadFile } from "@/adapters/share/webShare";
import { Avatar } from "@/components/Avatar";
import styles from "./RecipientScreen.module.css";

type State =
  | { kind: "loading" }
  | { kind: "ready"; payload: SharePayloadV1 }
  | { kind: "error"; error: ShareDecodeError };

const ERROR_MESSAGES: Record<ShareDecodeError, string> = {
  empty: "This link does not contain a card. Ask the sender to share it again.",
  format: "This card link is damaged or incomplete. Ask the sender to share it again.",
  "unsupported-version":
    "This card was made with a newer BYZCARD version. Update or open on another device.",
  "decompress-unavailable": "This browser is too old to open this card. Try a current browser.",
  "invalid-fields": "This card link is damaged or incomplete. Ask the sender to share it again.",
};

/**
 * Recipient viewer: decodes the card entirely from the URL fragment.
 * The fragment never reaches any server, no photo is fetched, and no
 * lookup of any kind occurs.
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
          What is BYZCARD?
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
      <article className={styles.card} aria-label={`Business card of ${card.fullName}`}>
        <div className={styles.top}>
          <Avatar fullName={card.fullName} photoUrl={null} size={76} />
          <div className={styles.identity}>
            <h1 className={styles.name}>{card.fullName}</h1>
            <p className={styles.role}>{card.role}</p>
            <p className={styles.company}>{card.company}</p>
          </div>
        </div>
        <dl className={styles.details}>
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${card.phone.replace(/[^+0-9]/gu, "")}`}>{card.phone}</a>
          </dd>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${card.email}`}>{card.email}</a>
          </dd>
          {card.website !== undefined && (
            <>
              <dt>Website</dt>
              <dd>
                <a href={card.website} rel="noopener noreferrer" target="_blank">
                  {displayUrl(card.website)}
                </a>
              </dd>
            </>
          )}
          {card.linkedin !== undefined && (
            <>
              <dt>LinkedIn</dt>
              <dd>
                <a href={card.linkedin} rel="noopener noreferrer" target="_blank">
                  {displayUrl(card.linkedin)}
                </a>
              </dd>
            </>
          )}
        </dl>
      </article>

      <div className="stack" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" type="button" onClick={() => void saveContact()}>
          Save contact
        </button>
        <a className="btn" href={`tel:${card.phone.replace(/[^+0-9]/gu, "")}`}>
          Call
        </a>
        <a className="btn" href={`mailto:${card.email}`}>
          Email
        </a>
      </div>

      <p className="note" style={{ marginTop: 20, textAlign: "center" }}>
        This card was decoded on your device from the link itself — nothing was looked up on a
        server. <Link href="/">Create your own BYZCARD</Link>
      </p>
    </div>
  );
}
