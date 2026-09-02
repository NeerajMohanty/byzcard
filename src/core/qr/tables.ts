/**
 * QR capacity tables per ISO/IEC 18004, indexed [version - 1] within each
 * error correction level. Values follow the standard's Table 9.
 */

export type EccLevel = "L" | "M" | "Q" | "H";

/** Format-information bit pattern for each ECC level. */
export const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

export const MIN_VERSION = 1;
export const MAX_VERSION = 40;

/** ECC codewords per block, per version (1..40). */
export const ECC_CODEWORDS_PER_BLOCK: Record<EccLevel, readonly number[]> = {
  // prettier-ignore
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // prettier-ignore
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  // prettier-ignore
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // prettier-ignore
  H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

/** Number of error-correction blocks, per version (1..40). */
export const NUM_ERROR_CORRECTION_BLOCKS: Record<EccLevel, readonly number[]> = {
  // prettier-ignore
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  // prettier-ignore
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  // prettier-ignore
  Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  // prettier-ignore
  H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** Total data modules available in a version's symbol (before ECC split). */
export function getNumRawDataModules(version: number): number {
  if (version < MIN_VERSION || version > MAX_VERSION) throw new RangeError("Invalid QR version");
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Data codewords (total codewords minus ECC codewords) for version+level. */
export function getNumDataCodewords(version: number, ecl: EccLevel): number {
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[ecl][version - 1];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][version - 1];
  if (eccPerBlock === undefined || numBlocks === undefined)
    throw new RangeError("Invalid QR version");
  return Math.floor(getNumRawDataModules(version) / 8) - eccPerBlock * numBlocks;
}

/** Max payload bytes in byte mode for a version+level. */
export function byteModeCapacity(version: number, ecl: EccLevel): number {
  const countBits = version <= 9 ? 8 : 16;
  const dataBits = getNumDataCodewords(version, ecl) * 8;
  return Math.floor((dataBits - 4 - countBits) / 8);
}

/** Alignment pattern center positions for a version. */
export function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}
