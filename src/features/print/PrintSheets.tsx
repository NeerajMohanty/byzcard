"use client";

/**
 * Print-only render targets for the two V1 formats. Each sheet is the same
 * ID card component the screen shows (dark profile + Quick Access), laid
 * out by its print variant at the exact physical size. Everything is built
 * from local data — printing uploads nothing and involves no server. The
 * dynamic @page rule gives the browser's Save-as-PDF the exact page size.
 */
import type { Card, PhotoCrop } from "@/core/card/types";
import type { QrSymbol } from "@/core/qr";
import { CardView } from "@/components/CardView";
import styles from "./print.module.css";

export type PrintFormat = "cr80" | "badge";

export const PRINT_PAGE_SIZES: Record<PrintFormat, string> = {
  cr80: "3.375in 2.125in",
  badge: "4in 6in",
};

interface PrintSheetsProps {
  format: PrintFormat;
  card: Card;
  photoUrl: string | null;
  qr: QrSymbol | null;
  photoCrop?: PhotoCrop;
  photoAspect?: number;
}

/** Rendered outside the screen UI; visible only under `@media print`. */
export function PrintSheets({
  format,
  card,
  photoUrl,
  qr,
  photoCrop,
  photoAspect,
}: PrintSheetsProps) {
  if (qr === null) return null;
  return (
    <div className="printOnly">
      <style>{`@page { size: ${PRINT_PAGE_SIZES[format]}; margin: 0; }`}</style>
      <div className={format === "cr80" ? styles.cr80 : styles.badge} data-print-format={format}>
        <CardView
          variant={format}
          fields={card}
          photoUrl={photoUrl}
          qr={qr}
          photoCrop={photoCrop}
          photoAspect={photoAspect}
        />
      </div>
    </div>
  );
}
