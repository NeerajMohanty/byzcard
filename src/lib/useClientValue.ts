"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = (): (() => void) => () => {};

/**
 * A value that can only be known in the browser (feature detection,
 * platform sniffing). Renders `serverValue` during SSR/hydration, then the
 * real client value — without effect-driven setState.
 * `getValue` must be cheap and return a stable primitive.
 */
export function useClientValue<T>(getValue: () => T, serverValue: T): T {
  return useSyncExternalStore(emptySubscribe, getValue, () => serverValue);
}
