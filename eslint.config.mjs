import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "artifacts/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
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
