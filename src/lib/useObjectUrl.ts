"use client";

import { useEffect, useMemo } from "react";

/**
 * Object URL for a Blob, revoked when the blob changes or on unmount.
 * The URL is derived in render (memo) rather than mirrored into state;
 * the effect exists purely for revocation. (In development StrictMode a
 * discarded first render can leak one URL until page unload — harmless.)
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob === null ? null : URL.createObjectURL(blob)), [blob]);
  useEffect(() => {
    if (url === null) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
