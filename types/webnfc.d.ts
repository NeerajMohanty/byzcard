/**
 * Ambient type declarations for the Web NFC API (Chrome on Android).
 * TypeScript's DOM lib does not ship these; declaring them locally avoids
 * `any` and `@ts-ignore`. Runtime feature detection is still mandatory.
 * https://w3c.github.io/web-nfc/
 */

interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: string | BufferSource;
}

interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

declare class NDEFReader {
  constructor();
  write(
    message: string | BufferSource | NDEFMessageInit,
    options?: NDEFWriteOptions,
  ): Promise<void>;
  scan(options?: { signal?: AbortSignal }): Promise<void>;
}
