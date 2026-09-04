"use client";

import {
  LINK_SERVICES,
  LINK_VALUE_LIMIT,
  OPTIONAL_LINK_LIMITS,
  type LinkEntry,
  type LinkGroup,
} from "@/core/card/types";

interface LinkGroupEditorProps {
  group: LinkGroup;
  title: string;
  addLabel: string;
  entries: LinkEntry[];
  error?: string;
  onChange: (entries: LinkEntry[]) => void;
}

/**
 * Collapsed-by-default editor for one optional link group: a compact
 * service dropdown + URL input per entry, with Add/Remove and a small cap
 * that protects the QR payload budget.
 */
export function LinkGroupEditor({
  group,
  title,
  addLabel,
  entries,
  error,
  onChange,
}: LinkGroupEditorProps) {
  const services = LINK_SERVICES[group];
  const max = OPTIONAL_LINK_LIMITS[group];

  const update = (index: number, patch: Partial<LinkEntry>): void => {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <details className="disclosure" open={entries.length > 0 || undefined}>
      <summary className="disclosure-summary">{title}</summary>
      <div className="disclosure-body">
        <div className="stack">
          {entries.map((entry, index) => (
            <div key={index} className="stack" style={{ gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="control"
                  style={{ flex: "0 0 138px", width: "auto" }}
                  aria-label={`${title} ${index + 1} service`}
                  value={entry.service}
                  onChange={(event) => update(index, { service: event.target.value })}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.label}
                    </option>
                  ))}
                </select>
                <input
                  className="control"
                  style={{ flex: 1, minWidth: 0 }}
                  type="text"
                  inputMode="url"
                  placeholder="https://…"
                  maxLength={LINK_VALUE_LIMIT}
                  aria-label={`${title} ${index + 1} URL`}
                  value={entry.value}
                  onChange={(event) => update(index, { value: event.target.value })}
                />
              </div>
              <button
                type="button"
                className="btn btn-danger"
                style={{ minHeight: 40 }}
                aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}
                onClick={() => onChange(entries.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            disabled={entries.length >= max}
            onClick={() =>
              onChange([...entries, { service: services[0]?.id ?? "custom", value: "" }])
            }
          >
            + {addLabel}
          </button>
          <p className="note" style={{ margin: 0 }}>
            Up to {max} entries. Shown as tap-to-open links on your shared card.
          </p>
          {error !== undefined && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
