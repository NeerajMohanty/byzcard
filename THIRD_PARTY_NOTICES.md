# Third-party notices

Licensing hygiene for BYZCARD. The application ships **no third-party
runtime code** beyond its framework dependencies (Next.js, React,
React DOM — MIT). The notices below cover reference material and material
development-time dependencies.

## QR Code generator — Project Nayuki (reference implementation)

- **Project**: QR Code generator library, by Project Nayuki
- **Upstream**: https://www.nayuki.io/page/qr-code-generator-library /
  https://github.com/nayuki/QR-Code-generator
- **License**: MIT
- **Relationship**: BYZCARD's QR encoder (`src/core/qr/`) is a
  **reimplementation written for this project** that follows the
  algorithmic structure and table layout of Nayuki's generator
  (ISO/IEC 18004 byte-mode encoding, Reed–Solomon ECC, mask penalty
  scoring). No upstream source code is imported or executed at runtime;
  the capacity/ECC tables are the standard's published constants. Nayuki's
  MIT license text for the reference work:

  > Copyright © Project Nayuki. (MIT License)
  > Permission is hereby granted, free of charge, to any person obtaining
  > a copy of this software and associated documentation files (the
  > "Software"), to deal in the Software without restriction, including
  > without limitation the rights to use, copy, modify, merge, publish,
  > distribute, sublicense, and/or sell copies of the Software, and to
  > permit persons to whom the Software is furnished to do so, subject to
  > the conditions of the MIT License.

## Material development-only dependencies (never shipped)

| Package                            | License          | Use in BYZCARD                                         |
| ---------------------------------- | ---------------- | ------------------------------------------------------ |
| `jsqr`                             | Apache-2.0       | Independent QR decoding to verify our encoder in tests |
| `fake-indexeddb`                   | Apache-2.0       | IndexedDB implementation for storage tests             |
| `@playwright/test`                 | Apache-2.0       | Browser E2E verification (Chromium + WebKit)           |
| `vitest`, `@vitejs/plugin-react`   | MIT              | Unit/integration test runner                           |
| `@testing-library/react`, `jsdom`  | MIT              | Component tests                                        |
| `typescript`, `eslint`, `prettier` | Apache-2.0 / MIT | Toolchain                                              |

Test certificates under `test/fixtures/` are self-signed artifacts
generated for this repository (see `test/fixtures/README.md`); they are
not third-party material.
