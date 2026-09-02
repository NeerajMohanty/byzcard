/**
 * QR module placement: function patterns, data placement, masking, and
 * penalty-based mask selection per ISO/IEC 18004. Structure follows the
 * reference approach of Project Nayuki's QR generator (MIT), reimplemented.
 */
import { ECC_FORMAT_BITS, getAlignmentPatternPositions, type EccLevel } from "./tables";

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

interface Grid {
  size: number;
  modules: boolean[][];
  isFunction: boolean[][];
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

function set(grid: Grid, x: number, y: number, dark: boolean): void {
  const row = grid.modules[y];
  const fnRow = grid.isFunction[y];
  if (row === undefined || fnRow === undefined) throw new RangeError("Module out of range");
  row[x] = dark;
  fnRow[x] = true;
}

function drawFinderPattern(grid: Grid, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && xx < grid.size && yy >= 0 && yy < grid.size) {
        set(grid, xx, yy, dist !== 2 && dist !== 4);
      }
    }
  }
}

function drawAlignmentPattern(grid: Grid, x: number, y: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      set(grid, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawFormatBits(grid: Grid, ecl: EccLevel, mask: number): void {
  const data = (ECC_FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  for (let i = 0; i <= 5; i++) set(grid, 8, i, getBit(bits, i));
  set(grid, 8, 7, getBit(bits, 6));
  set(grid, 8, 8, getBit(bits, 7));
  set(grid, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i++) set(grid, 14 - i, 8, getBit(bits, i));

  for (let i = 0; i < 8; i++) set(grid, grid.size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i++) set(grid, 8, grid.size - 15 + i, getBit(bits, i));
  set(grid, 8, grid.size - 8, true); // fixed dark module
}

function drawVersionInfo(grid: Grid, version: number): void {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const color = getBit(bits, i);
    const a = grid.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    set(grid, a, b, color);
    set(grid, b, a, color);
  }
}

function drawFunctionPatterns(grid: Grid, version: number, ecl: EccLevel): void {
  for (let i = 0; i < grid.size; i++) {
    set(grid, 6, i, i % 2 === 0);
    set(grid, i, 6, i % 2 === 0);
  }
  drawFinderPattern(grid, 3, 3);
  drawFinderPattern(grid, grid.size - 4, 3);
  drawFinderPattern(grid, 3, grid.size - 4);

  const alignPos = getAlignmentPatternPositions(version);
  const numAlign = alignPos.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      const skip =
        (i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0);
      if (!skip) drawAlignmentPattern(grid, alignPos[i] ?? 0, alignPos[j] ?? 0);
    }
  }
  drawFormatBits(grid, ecl, 0); // placeholder; overwritten after mask choice
  drawVersionInfo(grid, version);
}

function drawCodewords(grid: Grid, data: Uint8Array): void {
  let i = 0;
  for (let right = grid.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < grid.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? grid.size - 1 - vert : vert;
        const fnRow = grid.isFunction[y];
        const row = grid.modules[y];
        if (fnRow !== undefined && row !== undefined && !fnRow[x] && i < data.length * 8) {
          row[x] = getBit(data[i >>> 3] ?? 0, 7 - (i & 7));
          i++;
        }
      }
    }
  }
}

function maskCondition(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      throw new RangeError("Invalid mask");
  }
}

function applyMask(grid: Grid, mask: number): void {
  for (let y = 0; y < grid.size; y++) {
    const row = grid.modules[y];
    const fnRow = grid.isFunction[y];
    if (row === undefined || fnRow === undefined) continue;
    for (let x = 0; x < grid.size; x++) {
      if (!fnRow[x] && maskCondition(mask, x, y)) row[x] = !row[x];
    }
  }
}

function finderPenaltyCountPatterns(runHistory: readonly number[], size: number): number {
  const n = runHistory[1] ?? 0;
  if (n > size * 3) return 0;
  const core =
    n > 0 &&
    runHistory[2] === n &&
    runHistory[3] === n * 3 &&
    runHistory[4] === n &&
    runHistory[5] === n;
  return (
    (core && (runHistory[0] ?? 0) >= n * 4 && (runHistory[6] ?? 0) >= n ? 1 : 0) +
    (core && (runHistory[6] ?? 0) >= n * 4 && (runHistory[0] ?? 0) >= n ? 1 : 0)
  );
}

function finderPenaltyAddHistory(run: number, runHistory: number[], size: number): void {
  let length = run;
  if (runHistory[0] === 0) length += size; // light border counts as light run
  runHistory.pop();
  runHistory.unshift(length);
}

function penaltyLine(cells: readonly boolean[], size: number): number {
  let result = 0;
  let runColor = false;
  let run = 0;
  const runHistory = [0, 0, 0, 0, 0, 0, 0];
  for (const cell of cells) {
    if (cell === runColor) {
      run += 1;
      if (run === 5) result += PENALTY_N1;
      else if (run > 5) result += 1;
    } else {
      finderPenaltyAddHistory(run, runHistory, size);
      if (!runColor) result += finderPenaltyCountPatterns(runHistory, size) * PENALTY_N3;
      runColor = cell;
      run = 1;
    }
  }
  // Terminate: treat the border as light.
  if (runColor) {
    finderPenaltyAddHistory(run, runHistory, size);
    run = 0;
  }
  finderPenaltyAddHistory(run + size, runHistory, size);
  result += finderPenaltyCountPatterns(runHistory, size) * PENALTY_N3;
  return result;
}

function getPenaltyScore(grid: Grid): number {
  let result = 0;
  const { size, modules } = grid;

  for (let y = 0; y < size; y++) {
    result += penaltyLine(modules[y] ?? [], size);
  }
  for (let x = 0; x < size; x++) {
    const column: boolean[] = [];
    for (let y = 0; y < size; y++) column.push(modules[y]?.[x] ?? false);
    result += penaltyLine(column, size);
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y]?.[x];
      if (
        color === modules[y]?.[x + 1] &&
        color === modules[y + 1]?.[x] &&
        color === modules[y + 1]?.[x + 1]
      ) {
        result += PENALTY_N2;
      }
    }
  }

  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark += 1;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * PENALTY_N4;
  return result;
}

export interface QrSymbol {
  version: number;
  size: number;
  ecl: EccLevel;
  mask: number;
  /** modules[y][x] === true means a dark module. */
  modules: boolean[][];
}

/** Place codewords into a fully masked, format-annotated symbol. */
export function buildSymbol(codewords: Uint8Array, version: number, ecl: EccLevel): QrSymbol {
  const size = version * 4 + 17;
  const grid: Grid = {
    size,
    modules: Array.from({ length: size }, () => Array.from({ length: size }, () => false)),
    isFunction: Array.from({ length: size }, () => Array.from({ length: size }, () => false)),
  };
  drawFunctionPatterns(grid, version, ecl);
  drawCodewords(grid, codewords);

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(grid, mask);
    drawFormatBits(grid, ecl, mask);
    const penalty = getPenaltyScore(grid);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
    applyMask(grid, mask); // XOR is its own inverse
  }
  applyMask(grid, bestMask);
  drawFormatBits(grid, ecl, bestMask);

  return { version, size, ecl, mask: bestMask, modules: grid.modules };
}
