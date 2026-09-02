"use client";

/**
 * Print controls: choose one of the two V1 formats, then hand off to the
 * browser's native print dialog (which also provides Save as PDF).
 * Entirely local — no server, no PDF service.
 */
import type { PrintFormat } from "./PrintSheets";

const FORMATS: readonly { id: PrintFormat; name: string; dimensions: string }[] = [
  { id: "cr80", name: "Standard ID Card — CR80", dimensions: "3.375 × 2.125 in" },
  { id: "badge", name: "Event Badge", dimensions: "4 × 6 in" },
];

interface PrintPanelProps {
  format: PrintFormat;
  onFormatChange: (format: PrintFormat) => void;
  /** Printing needs the QR; disabled until it is ready. */
  ready: boolean;
}

export function PrintPanel({ format, onFormatChange, ready }: PrintPanelProps) {
  return (
    <div className="stack">
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend className="note" style={{ marginBottom: 8 }}>
          Choose format
        </legend>
        <div className="stack" role="radiogroup" aria-label="Print format">
          {FORMATS.map((option) => (
            <label
              key={option.id}
              className="btn"
              style={{
                justifyContent: "flex-start",
                gap: 12,
                borderColor: format === option.id ? "var(--text-dim)" : undefined,
              }}
            >
              <input
                type="radio"
                name="print-format"
                value={option.id}
                checked={format === option.id}
                onChange={() => onFormatChange(option.id)}
              />
              <span style={{ textAlign: "left" }}>
                {option.name}
                <span className="note" style={{ display: "block" }}>
                  {option.dimensions}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn" type="button" disabled={!ready} onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <p className="note">
        In the print dialog, set scale to 100% / Actual size and enable background graphics. Save as
        PDF is available there too. Printing happens entirely on this device.
      </p>
    </div>
  );
}
