"use client";

import { FIELD_LIMITS, PRONOUN_CHOICES, type CardFieldName } from "@/core/card/types";

export type RawFieldValues = Record<CardFieldName, string>;

interface FieldSpec {
  name: CardFieldName;
  label: string;
  required: boolean;
  type: "text" | "tel" | "email" | "url";
  autoComplete: string;
  placeholder: string;
}

const FIELDS_TOP: readonly FieldSpec[] = [
  {
    name: "fullName",
    label: "Full name",
    required: true,
    type: "text",
    autoComplete: "name",
    placeholder: "Ada Lovelace",
  },
  {
    name: "preferredName",
    label: "Preferred name (optional)",
    required: false,
    type: "text",
    autoComplete: "nickname",
    placeholder: "Ada",
  },
];

const FIELDS_REST: readonly FieldSpec[] = [
  {
    name: "role",
    label: "Role / title",
    required: true,
    type: "text",
    autoComplete: "organization-title",
    placeholder: "Chief Analyst",
  },
  {
    name: "headline",
    label: "Headline (optional)",
    required: false,
    type: "text",
    autoComplete: "off",
    placeholder: "Analytical Engines · Computing Pioneer",
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

/** Select labels for the preset pronoun values. */
const PRONOUN_LABELS: Record<string, string> = {
  "he/him": "He / him",
  "she/her": "She / her",
  "they/them": "They / them",
  "he/they": "He / they",
  "she/they": "She / they",
  "any pronouns": "Any pronouns",
};

interface CardFormProps {
  values: RawFieldValues;
  /** Free-text pronouns, used when the select is on "custom". */
  customPronouns: string;
  issues: Partial<Record<CardFieldName, string>>;
  onChange: (field: CardFieldName, value: string) => void;
  onCustomPronounsChange: (value: string) => void;
}

function Field({
  spec,
  value,
  issue,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  issue: string | undefined;
  onChange: (field: CardFieldName, value: string) => void;
}) {
  const inputId = `field-${spec.name}`;
  const errorId = `${inputId}-error`;
  return (
    <div className="field">
      <label htmlFor={inputId}>{spec.label}</label>
      <input
        id={inputId}
        name={spec.name}
        type={spec.type}
        required={spec.required}
        autoComplete={spec.autoComplete}
        placeholder={spec.placeholder}
        maxLength={FIELD_LIMITS[spec.name]}
        value={value}
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
}

export function CardForm({
  values,
  customPronouns,
  issues,
  onChange,
  onCustomPronounsChange,
}: CardFormProps) {
  const renderSpec = (spec: FieldSpec) => (
    <Field
      key={spec.name}
      spec={spec}
      value={values[spec.name]}
      issue={issues[spec.name]}
      onChange={onChange}
    />
  );
  return (
    <div>
      {FIELDS_TOP.map(renderSpec)}
      <div className="field">
        <label htmlFor="field-pronouns-select">Pronouns (optional)</label>
        <select
          id="field-pronouns-select"
          value={values.pronouns}
          onChange={(event) => onChange("pronouns", event.target.value)}
        >
          <option value="">Select pronouns</option>
          {PRONOUN_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {PRONOUN_LABELS[choice] ?? choice}
            </option>
          ))}
          <option value="custom">Custom</option>
          <option value="prefer-not">Prefer not to say</option>
        </select>
        {values.pronouns === "custom" && (
          <input
            id="field-custom-pronouns"
            type="text"
            aria-label="Your pronouns"
            placeholder="ze/zir"
            maxLength={FIELD_LIMITS.pronouns}
            value={customPronouns}
            onChange={(event) => onCustomPronounsChange(event.target.value)}
            style={{ marginTop: 6 }}
          />
        )}
        {issues.pronouns !== undefined && (
          <p className="error" role="alert">
            {issues.pronouns}
          </p>
        )}
      </div>
      {FIELDS_REST.map(renderSpec)}
    </div>
  );
}
