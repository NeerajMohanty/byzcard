/**
 * QR codeword construction: byte-mode segment encoding, padding, block
 * splitting, Reed–Solomon ECC, and interleaving per ISO/IEC 18004.
 */
import { rsComputeDivisor, rsComputeRemainder } from "./gf";
import {
  ECC_CODEWORDS_PER_BLOCK,
  MAX_VERSION,
  MIN_VERSION,
  NUM_ERROR_CORRECTION_BLOCKS,
  byteModeCapacity,
  getNumDataCodewords,
  getNumRawDataModules,
  type EccLevel,
} from "./tables";

export class QrDataTooLongError extends Error {
  constructor(dataBytes: number, maxBytes: number) {
    super(`QR data too long: ${dataBytes} bytes exceeds ${maxBytes} byte capacity`);
    this.name = "QrDataTooLongError";
  }
}

class BitBuffer {
  readonly bits: number[] = [];

  appendBits(value: number, length: number): void {
    if (length < 0 || length > 31 || value >>> length !== 0)
      throw new RangeError("Bit value out of range");
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }
}

/** Choose the smallest version whose byte-mode capacity fits the data. */
export function selectVersion(dataLength: number, ecl: EccLevel, minVersion = MIN_VERSION): number {
  for (let version = minVersion; version <= MAX_VERSION; version++) {
    if (byteModeCapacity(version, ecl) >= dataLength) return version;
  }
  throw new QrDataTooLongError(dataLength, byteModeCapacity(MAX_VERSION, ecl));
}

/** Build the final interleaved codeword sequence for the symbol. */
export function buildCodewords(data: Uint8Array, version: number, ecl: EccLevel): Uint8Array {
  const capacityBytes = byteModeCapacity(version, ecl);
  if (data.length > capacityBytes) throw new QrDataTooLongError(data.length, capacityBytes);

  // Byte-mode segment: mode indicator 0100, then char count, then bytes.
  const buffer = new BitBuffer();
  buffer.appendBits(0b0100, 4);
  buffer.appendBits(data.length, version <= 9 ? 8 : 16);
  for (const b of data) buffer.appendBits(b, 8);

  // Terminator and byte alignment.
  const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
  buffer.appendBits(0, Math.min(4, dataCapacityBits - buffer.bits.length));
  buffer.appendBits(0, (8 - (buffer.bits.length % 8)) % 8);

  // Pad codewords 0xEC / 0x11 alternately.
  for (let pad = 0xec; buffer.bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
    buffer.appendBits(pad, 8);
  }

  // Pack bits into data codewords.
  const dataCodewords = new Uint8Array(buffer.bits.length / 8);
  buffer.bits.forEach((bit, i) => {
    const idx = i >>> 3;
    dataCodewords[idx] = (dataCodewords[idx] ?? 0) | (bit << (7 - (i & 7)));
  });

  return addEccAndInterleave(dataCodewords, version, ecl);
}

/** Split into blocks, append ECC, and interleave per the standard. */
function addEccAndInterleave(data: Uint8Array, version: number, ecl: EccLevel): Uint8Array {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][version - 1];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version - 1];
  if (numBlocks === undefined || blockEccLen === undefined)
    throw new RangeError("Invalid QR version");
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDivisor = rsComputeDivisor(blockEccLen);
  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const block = Array.from(data.subarray(offset, offset + dataLen));
    offset += dataLen;
    const ecc = rsComputeRemainder(block, rsDivisor);
    if (i < numShortBlocks) block.push(-1); // placeholder to align interleave
    blocks.push(block.concat(ecc));
  }

  const result: number[] = [];
  const blockLen = blocks[0]?.length ?? 0;
  for (let i = 0; i < blockLen; i++) {
    blocks.forEach((block, j) => {
      // Skip the alignment placeholder in short blocks.
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        const value = block[i];
        if (value !== undefined && value >= 0) result.push(value);
      }
    });
  }
  return Uint8Array.from(result);
}
