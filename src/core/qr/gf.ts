/**
 * GF(2^8) arithmetic and Reed–Solomon error correction for QR encoding.
 * Field polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D) per ISO/IEC 18004.
 * Algorithm structure follows the public-domain-style reference approach of
 * Project Nayuki's QR Code generator (MIT), reimplemented for BYZCARD.
 */

/** Multiply two GF(2^8) field elements (Russian peasant method). */
export function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/**
 * Compute the Reed–Solomon generator polynomial for the given degree,
 * returned as its coefficients (excluding the leading 1 term).
 */
export function rsComputeDivisor(degree: number): number[] {
  if (degree < 1 || degree > 255) throw new RangeError("Invalid RS degree");
  const result: number[] = [];
  for (let i = 0; i < degree - 1; i++) result.push(0);
  result.push(1); // (x - r^0)(x - r^1)... starts as the monomial 1

  // Multiply by (x - r^i) for successive roots r^i.
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j] ?? 0, root);
      if (j + 1 < result.length) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** Polynomial division remainder: the ECC codewords for a data block. */
export function rsComputeRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result: number[] = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] = (result[i] ?? 0) ^ gfMultiply(coef, factor);
    });
  }
  return result;
}
