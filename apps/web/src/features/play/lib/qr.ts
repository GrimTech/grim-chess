// Minimal QR Code encoder (ISO/IEC 18004): byte mode, error-correction level M, versions 1-10
// (up to 213 bytes, plenty for a LAN URL). Written for Grim Chess; follows the structure of the
// public-domain reference algorithm description (Reed-Solomon over GF(256), 8 masks with penalty scoring).

// [data codewords per block, number of blocks] groups for level M, and EC codewords per block, versions 1..10
const EC_M: { ec: number; groups: [number, number][] }[] = [
  { ec: 10, groups: [[16, 1]] }, { ec: 16, groups: [[28, 1]] }, { ec: 26, groups: [[44, 1]] },
  { ec: 18, groups: [[32, 2]] }, { ec: 24, groups: [[43, 2]] }, { ec: 16, groups: [[27, 4]] },
  { ec: 18, groups: [[31, 4]] }, { ec: 22, groups: [[38, 2], [39, 2]] }, { ec: 22, groups: [[36, 3], [37, 2]] },
  { ec: 26, groups: [[43, 4], [44, 1]] },
];
const ALIGN: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z & 0xff;
}
function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0); r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gfMul(root, 2);
  }
  return r;
}
function rsRemainder(data: number[], div: number[]): number[] {
  const r = div.map(() => 0);
  for (const b of data) {
    const f = b ^ (r.shift() as number); r.push(0);
    div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

export interface QrMatrix { size: number; modules: boolean[][] }

export function encodeQr(text: string): QrMatrix {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const cap = EC_M[v - 1].groups.reduce((s, [n, c]) => s + n * c, 0);
    const bits = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
    if (bits <= cap * 8) { version = v; break; }
  }
  if (!version) throw new Error('Text too long for QR (max ~213 bytes)');
  const spec = EC_M[version - 1];
  const capBytes = spec.groups.reduce((s, [n, c]) => s + n * c, 0);

  // --- data bits ---
  const bits: number[] = [];
  const put = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4); put(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, capBytes * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < capBytes; pad ^= 0xec ^ 0x11) data.push(pad);

  // --- blocks + EC, interleave ---
  const div = rsDivisor(spec.ec);
  const blocks: number[][] = [], ecs: number[][] = [];
  let k = 0;
  for (const [n, count] of spec.groups) for (let c = 0; c < count; c++) { const b = data.slice(k, k + n); k += n; blocks.push(b); ecs.push(rsRemainder(b, div)); }
  const codewords: number[] = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) for (const b of blocks) if (i < b.length) codewords.push(b[i]);
  for (let i = 0; i < spec.ec; i++) for (const e of ecs) codewords.push(e[i]);

  // --- matrix ---
  const size = version * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = ALIGN[version - 1];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = (mask: number) => {
    const d = (0 << 3) | mask; // level M = 00
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3);
      set(a, c, dark); set(c, a, dark);
    }
  }
  // data placement (zigzag)
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vert : vert;
      if (!fn[y][x] && bi < codewords.length * 8) { mod[y][x] = ((codewords[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; }
    }
  }
  const maskFn = (m: number, x: number, y: number): boolean => {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };
  const applyMask = (m: number) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn(m, x, y)) mod[y][x] = !mod[y][x]; };
  let bestMask = 0, bestPen = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m);
    const p = penalty(mod, size);
    if (p < bestPen) { bestPen = p; bestMask = m; }
    applyMask(m); // undo (XOR)
  }
  applyMask(bestMask); drawFormat(bestMask);
  return { size, modules: mod };
}

function penalty(m: boolean[][], size: number): number {
  let p = 0;
  // N1: runs of 5+ same colour in rows/cols; N3: finder-like patterns
  const lines = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        if (get(i, j) === get(i, j - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1;
      }
      for (let j = 0; j + 10 < size + 4; j++) {
        const pat = [true, false, true, true, true, false, true];
        const at = (k: number) => (k >= 0 && k < size ? get(i, k) : false);
        let ok = true;
        for (let k = 0; k < 7 && ok; k++) if (at(j + k) !== pat[k]) ok = false;
        if (!ok) continue;
        const before = [1, 2, 3, 4].every((d) => !at(j - d)), after = [7, 8, 9, 10].every((d) => !at(j + d));
        if (before || after) p += 40;
      }
    }
  };
  lines((i, j) => m[i][j]);
  lines((i, j) => m[j][i]);
  // N2: 2x2 blocks
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  // N4: dark balance
  let dark = 0;
  for (const row of m) for (const c of row) if (c) dark++;
  const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
  p += Math.max(0, k) * 10;
  return p;
}

/** SVG path data ("M x y h1 v1 h-1 z" per dark module) with a 4-module quiet zone. */
export function qrSvgPath(q: QrMatrix, quiet = 4): { path: string; dim: number } {
  let d = '';
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y][x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  return { path: d, dim: q.size + quiet * 2 };
}
