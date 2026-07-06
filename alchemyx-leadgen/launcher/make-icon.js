#!/usr/bin/env node
/**
 * make-icon.js — Genera l'icona dell'app Alchemyx senza alcuna dipendenza.
 *
 * - Disegna proceduralmente (pixel per pixel) un'icona 512x512:
 *   quadrato con angoli arrotondati, gradiente diagonale indaco→viola,
 *   una "A" stilizzata bianca al centro e una leggera ombra interna in basso.
 * - Codifica PNG "a mano" usando solo node:zlib (deflateSync) + CRC32 fatto in casa.
 * - Produce anche le versioni ridotte (256/128/32/16) con box-filter.
 * - Assembla icon.icns (macOS) e icon.ico (Windows) incapsulando i PNG.
 *
 * Uso:  node alchemyx-leadgen/launcher/make-icon.js
 * Output in: alchemyx-leadgen/launcher/assets/
 * Richiede Node 18+. Idempotente: riscrive sempre gli stessi file.
 */

// Modulo ES (il package.json del progetto usa "type": "module").
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'assets');

/* ----------------------------------------------------------------------- */
/* CRC32 (tabella calcolata a runtime, polinomio standard PNG 0xEDB88320)  */
/* ----------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ----------------------------------------------------------------------- */
/* Encoder PNG minimale (RGBA 8 bit, filtro 0 per ogni scanline)           */
/* ----------------------------------------------------------------------- */

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * rgba: Buffer/Uint8Array di size*size*4 byte.
 */
function encodePNG(rgba, width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR: larghezza, altezza, bit depth 8, color type 6 (RGBA),
  // compressione 0, filtro 0, interlacciamento 0.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Scanline: byte di filtro 0 + width*4 byte di pixel.
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filtro "None"
    rgba.copy
      ? rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
      : raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------------------------------------------------- */
/* Utility geometriche                                                     */
/* ----------------------------------------------------------------------- */

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

/** Distanza con segno da un rettangolo arrotondato centrato in (cx,cy). */
function roundedRectSDF(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - (halfW - radius);
  const qy = Math.abs(py - cy) - (halfH - radius);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const outside = Math.hypot(ox, oy);
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

/** Distanza di un punto da un segmento. */
function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : clamp((apx * abx + apy * aby) / lenSq, 0, 1);
  const dx = apx - t * abx;
  const dy = apy - t * aby;
  return Math.hypot(dx, dy);
}

/** Copertura anti-aliased di un tratto spesso (larghezza = 2*halfW). */
function strokeCoverage(dist, halfW, aa) {
  return clamp((halfW + aa / 2 - dist) / aa, 0, 1);
}

/* ----------------------------------------------------------------------- */
/* Disegno dell'icona 512x512                                              */
/* ----------------------------------------------------------------------- */

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const half = size / 2;
  const cornerRadius = Math.round(size * 110 / 512); // ~110px a 512
  const aa = 2; // spessore dell'anti-aliasing in pixel

  // Colori del gradiente: #4F46E5 (indaco) → #9333EA (viola)
  const c0 = { r: 0x4F, g: 0x46, b: 0xE5 };
  const c1 = { r: 0x93, g: 0x33, b: 0xEA };

  // Geometria della "A": apice in alto al centro, due gambe divaricate,
  // barra orizzontale. Coordinate pensate per 512 e scalate.
  const s = size / 512;
  const apexX = 256 * s, apexY = 132 * s;
  const legY = 384 * s;              // base delle gambe
  const leftX = 158 * s, rightX = 354 * s;
  const barY = 306 * s;              // altezza della barra orizzontale
  const halfStroke = 19 * s;         // spessore tratto ~38px → metà = 19

  // Estremi della barra: intersezione (approssimata) con le gambe a barY,
  // leggermente accorciata per restare "dentro" le gambe.
  const tBar = (barY - apexY) / (legY - apexY);
  const barLeftX = apexX + (leftX - apexX) * tBar + 6 * s;
  const barRightX = apexX + (rightX - apexX) * tBar - 6 * s;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      // --- Forma di sfondo: quadrato arrotondato ---
      const sd = roundedRectSDF(px, py, cx, cy, half, half, cornerRadius);
      const shapeAlpha = clamp(0.5 - sd, 0, 1); // AA di ~1px sul bordo
      const idx = (y * size + x) * 4;
      if (shapeAlpha <= 0) {
        // fuori: completamente trasparente
        rgba[idx] = 0; rgba[idx + 1] = 0; rgba[idx + 2] = 0; rgba[idx + 3] = 0;
        continue;
      }

      // --- Gradiente diagonale (alto-sx → basso-dx) ---
      const t = (px + py) / (2 * size);
      let r = c0.r + (c1.r - c0.r) * t;
      let g = c0.g + (c1.g - c0.g) * t;
      let b = c0.b + (c1.b - c0.b) * t;

      // --- Leggera ombra interna sul bordo inferiore ---
      // Scurisce gradualmente gli ultimi ~70px verso il basso.
      const shadowBand = 70 * s;
      const sh = clamp((py - (size - shadowBand)) / shadowBand, 0, 1);
      const darken = 1 - 0.16 * sh * sh; // quadratico: molto morbido
      r *= darken; g *= darken; b *= darken;

      // --- La "A": unione di tre tratti anti-aliased ---
      const dLeft = distToSegment(px, py, apexX, apexY, leftX, legY);
      const dRight = distToSegment(px, py, apexX, apexY, rightX, legY);
      const dBar = distToSegment(px, py, barLeftX, barY, barRightX, barY);
      const cov = Math.max(
        strokeCoverage(dLeft, halfStroke, aa),
        strokeCoverage(dRight, halfStroke, aa),
        strokeCoverage(dBar, halfStroke * 0.85, aa) // barra un filo più sottile
      );

      // Composizione della "A" bianca sopra il gradiente.
      r = r + (255 - r) * cov;
      g = g + (255 - g) * cov;
      b = b + (255 - b) * cov;

      rgba[idx] = Math.round(clamp(r, 0, 255));
      rgba[idx + 1] = Math.round(clamp(g, 0, 255));
      rgba[idx + 2] = Math.round(clamp(b, 0, 255));
      rgba[idx + 3] = Math.round(shapeAlpha * 255);
    }
  }

  return rgba;
}

/* ----------------------------------------------------------------------- */
/* Downscale con box-filter (media pesata sull'alpha)                      */
/* ----------------------------------------------------------------------- */

function downscale(src, srcSize, dstSize) {
  const factor = srcSize / dstSize;
  if (!Number.isInteger(factor)) {
    throw new Error(`Fattore di scala non intero: ${srcSize} -> ${dstSize}`);
  }
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const sx = x * factor + dx;
          const sy = y * factor + dy;
          const si = (sy * srcSize + sx) * 4;
          const a = src[si + 3];
          // Media pesata sull'alpha: evita bordi scuri sui pixel trasparenti.
          sumR += src[si] * a;
          sumG += src[si + 1] * a;
          sumB += src[si + 2] * a;
          sumA += a;
        }
      }
      const n = factor * factor;
      const di = (y * dstSize + x) * 4;
      if (sumA > 0) {
        dst[di] = Math.round(sumR / sumA);
        dst[di + 1] = Math.round(sumG / sumA);
        dst[di + 2] = Math.round(sumB / sumA);
      }
      dst[di + 3] = Math.round(sumA / n);
    }
  }
  return dst;
}

/* ----------------------------------------------------------------------- */
/* ICNS (macOS): magic + chunk "tipo + lunghezza + PNG"                    */
/* ----------------------------------------------------------------------- */

function buildICNS(entries) {
  // entries: [{ type: 'ic09', png: Buffer }, ...]
  const chunks = entries.map(({ type, png }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, 'ascii');
    header.writeUInt32BE(png.length + 8, 4); // lunghezza inclusa l'intestazione
    return Buffer.concat([header, png]);
  });
  const body = Buffer.concat(chunks);
  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 4, 'ascii');
  fileHeader.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([fileHeader, body]);
}

/* ----------------------------------------------------------------------- */
/* ICO (Windows): container con voci PNG (valido da Vista in poi)          */
/* ----------------------------------------------------------------------- */

function buildICO(entries) {
  // entries: [{ size: 256, png: Buffer }, ...]
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // riservato
  header.writeUInt16LE(1, 2); // tipo 1 = icona
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const blobs = [];
  let offset = 6 + count * 16;
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; // 0 significa 256
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;  // palette
    e[3] = 0;  // riservato
    e.writeUInt16LE(1, 4);   // piani colore
    e.writeUInt16LE(32, 6);  // bit per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    dirEntries.push(e);
    blobs.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...dirEntries, ...blobs]);
}

/* ----------------------------------------------------------------------- */
/* Main                                                                    */
/* ----------------------------------------------------------------------- */

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Disegno icona 512x512...');
  const base = drawIcon(512);

  const sizes = [512, 256, 128, 32, 16];
  const pngs = {};
  for (const size of sizes) {
    const rgba = size === 512 ? base : downscale(base, 512, size);
    const png = encodePNG(rgba, size, size);
    pngs[size] = png;
    const file = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(file, png);
    console.log(`  ${path.basename(file)}  (${png.length} byte)`);
  }

  // icon.icns per macOS: ic09=512, ic08=256, ic07=128 (tutti PNG).
  const icns = buildICNS([
    { type: 'ic09', png: pngs[512] },
    { type: 'ic08', png: pngs[256] },
    { type: 'ic07', png: pngs[128] },
  ]);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.icns'), icns);
  console.log(`  icon.icns  (${icns.length} byte)`);

  // icon.ico per Windows: 256 (voce "0"), 32, 16.
  const ico = buildICO([
    { size: 256, png: pngs[256] },
    { size: 32, png: pngs[32] },
    { size: 16, png: pngs[16] },
  ]);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);
  console.log(`  icon.ico  (${ico.length} byte)`);

  console.log('Fatto. Output in', OUT_DIR);
}

main();
