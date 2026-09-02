import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": true,
        },
      ],
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // The service worker is plain JS running in a worker scope.
    files: ["public/sw.js"],
    languageOptions: {
      globals: { self: "readonly", caches: "readonly", fetch: "readonly" },
    },
  },
];

export default eslintConfig;
