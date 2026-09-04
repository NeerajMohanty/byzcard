"use client";

import { useEffect, useState } from "react";
import type { CardFields } from "@/core/card/types";
import { encodeQrText, type QrSymbol } from "@/core/qr";
import { encodeSharePayload } from "@/core/share/codec";
import { analyzeShareSize, buildShareUrl, type ShareSize } from "@/core/share/url";
import { appOrigin } from "./appOrigin";

export interface ShareQrState {
  shareUrl: string;
  qr: QrSymbol;
  size: ShareSize;
}

interface Computed {
  key: string;
  state: ShareQrState | null;
  oversize: ShareSize | null;
}

/**
 * Derive the share URL, its QR symbol, and the size budget for a set of
 * card fields — all computed locally. `state` is null while disabled,
 * while computing, or when the payload exceeds the hard budget (the size
 * is then reported via `oversize` for error display).
 */
export function useShareQr(
  fields: CardFields | null,
  origin?: string,
): {
  state: ShareQrState | null;
  oversize: ShareSize | null;
} {
  const [computed, setComputed] = useState<Computed | null>(null);

  // Value-keyed so equal field values never recompute (object identity of
  // `fields` changes every editor keystroke).
  const key = fields === null ? null : JSON.stringify([fields, origin ?? null]);

  useEffect(() => {
    if (fields === null || key === null) return;
    let cancelled = false;
    void (async () => {
      const fragment = await encodeSharePayload(fields);
      if (cancelled) return;
      const shareUrl = buildShareUrl(origin ?? appOrigin(), fragment);
      const size = analyzeShareSize(shareUrl);
      if (size.level === "error") {
        setComputed({ key, state: null, oversize: size });
      } else {
        setComputed({
          key,
          state: { shareUrl, qr: encodeQrText(shareUrl, { ecl: "M" }), size },
          oversize: null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures fields by value
  }, [key]);

  // Results for a stale key are treated as "still computing".
  if (key === null || computed === null || computed.key !== key) {
    return { state: null, oversize: null };
  }
  return { state: computed.state, oversize: computed.oversize };
}
