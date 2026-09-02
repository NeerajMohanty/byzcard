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

/**
 * Derive the share URL, its QR symbol, and the size budget for a set of
 * card fields — all computed locally. Returns null while disabled, while
 * computing, or when the payload exceeds the hard budget (size still
 * reported via the second tuple slot for error display).
 */
export function useShareQr(fields: CardFields | null): {
  state: ShareQrState | null;
  oversize: ShareSize | null;
} {
  const [state, setState] = useState<ShareQrState | null>(null);
  const [oversize, setOversize] = useState<ShareSize | null>(null);

  const key = fields === null ? null : JSON.stringify(fields);
  useEffect(() => {
    let cancelled = false;
    if (fields === null || key === null) {
      setState(null);
      setOversize(null);
      return;
    }
    void (async () => {
      const fragment = await encodeSharePayload(fields);
      if (cancelled) return;
      const shareUrl = buildShareUrl(appOrigin(), fragment);
      const size = analyzeShareSize(shareUrl);
      if (size.level === "error") {
        setState(null);
        setOversize(size);
        return;
      }
      setState({ shareUrl, qr: encodeQrText(shareUrl, { ecl: "M" }), size });
      setOversize(null);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures fields by value
  }, [key]);

  return { state, oversize };
}
