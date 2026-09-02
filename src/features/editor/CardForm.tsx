"use client";

import { FIELD_LIMITS, type CardFieldName } from "@/core/card/types";

export type RawFieldValues = Record<CardFieldName, string>;

interface FieldSpec {
  name: CardFieldName;
  label: string;
  required: boolean;
  type: "text" | "tel" | "email" | "url";
  autoComplete: string;
  placeholder: string;
}

const FIELDS: readonly FieldSpec[] = [
  {
    name: "fullName",
    label: "Full name",
    required: true,
    type: "text",
    autoComplete: "name",
    placeholder: "Ada Lovelace",
  },
  {
    name: "role",
    label: "Role / title",
    required: true,
    type: "text",
    autoComplete: "organization-title",
    placeholder: "Chief Analyst",
  },
  {
    name: "company",
    label: "Company",
    required: true,
    type: "text",
    autoComplete: "organization",
    placeholder: "Analytical Engines Ltd",
  },
  {
    name: "phone",
    label: "Phone",
    required: true,
    type: "tel",
    autoComplete: "tel",
    placeholder: "+1 647 000 0000",
  },
  {
    name: "email",
    label: "Email",
    required: true,
    type: "email",
    autoComplete: "email",
    placeholder: "you@example.com",
  },
  {
    name: "website",
    label: "Website (optional)",
    required: false,
    type: "text",
    autoComplete: "url",
    placeholder: "example.com",
  },
  {
    name: "linkedin",
    label: "LinkedIn (optional)",
    required: false,
    type: "text",
    autoComplete: "off",
    placeholder: "linkedin.com/in/you or a handle",
  },
];

interface CardFormProps {
  values: RawFieldValues;
  issues: Partial<Record<CardFieldName, string>>;
  onChange: (field: CardFieldName, value: string) => void;
}

export function CardForm({ values, issues, onChange }: CardFormProps) {
  return (
    <div>
      {FIELDS.map((spec) => {
        const issue = issues[spec.name];
        const inputId = `field-${spec.name}`;
        const errorId = `${inputId}-error`;
        return (
          <div className="field" key={spec.name}>
            <label htmlFor={inputId}>{spec.label}</label>
            <input
              id={inputId}
              name={spec.name}
              type={spec.type}
              required={spec.required}
              autoComplete={spec.autoComplete}
              placeholder={spec.placeholder}
              maxLength={FIELD_LIMITS[spec.name]}
              value={values[spec.name]}
              aria-invalid={issue !== undefined}
              aria-describedby={issue !== undefined ? errorId : undefined}
              onChange={(event) => onChange(spec.name, event.target.value)}
            />
            {issue !== undefined && (
              <p className="error" id={errorId} role="alert">
                {issue}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
