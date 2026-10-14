/**
 * Ein kleiner PNG-Leser und -Schreiber für Node - ohne Zusatzpakete.
 *
 * Kann genau das, was die Werkzeuge brauchen: 8-Bit-Bilder mit Palette
 * (wie Timos Originale), RGB und RGBA (wie Bilder aus dem Browser). Geschrieben
 * wird mit Palette, solange höchstens 256 Farben vorkommen - so bleiben die
 * Dateien klein wie die Originale.
 *
 * Pixel kommen und gehen als { width, height, data } mit RGBA-Bytes - dieselbe
 * Form wie ImageData im Browser, damit js/core/outfit.js hier wie dort läuft.
 */

import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATUR = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/* ---------- Lesen ---------- */

export function pngLesen(puffer) {
  if (!puffer.subarray(0, 8).equals(SIGNATUR)) throw new Error('Keine PNG-Datei');
  let pos = 8;
  let kopf = null;
  let palette = null;
  let transparenz = null;
  const daten = [];
  while (pos < puffer.length) {
    const laenge = puffer.readUInt32BE(pos);
    const typ = puffer.toString('ascii', pos + 4, pos + 8);
    const inhalt = puffer.subarray(pos + 8, pos + 8 + laenge);
    if (typ === 'IHDR') {
      kopf = {
        width: inhalt.readUInt32BE(0),
        height: inhalt.readUInt32BE(4),
        tiefe: inhalt[8],
        farbtyp: inhalt[9],
        verschachtelt: inhalt[12],
      };
    } else if (typ === 'PLTE') palette = inhalt;
    else if (typ === 'tRNS') transparenz = inhalt;
    else if (typ === 'IDAT') daten.push(inhalt);
    else if (typ === 'IEND') break;
    pos += 12 + laenge;
  }
  const { width: w, height: h, tiefe, farbtyp, verschachtelt } = kopf;
  if (tiefe !== 8 || verschachtelt) throw new Error(`PNG-Art nicht unterstützt (Tiefe ${tiefe}, verschachtelt ${verschachtelt})`);
  const kanaele = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[farbtyp];
  if (!kanaele) throw new Error(`Farbtyp ${farbtyp} nicht unterstützt`);

  const roh = inflateSync(Buffer.concat(daten));
  const zeile = w * kanaele;
  const pixel = Buffer.alloc(h * zeile);
  for (let y = 0; y < h; y++) {
    const filter = roh[y * (zeile + 1)];
    const quelle = roh.subarray(y * (zeile + 1) + 1, (y + 1) * (zeile + 1));
    const ziel = pixel.subarray(y * zeile, (y + 1) * zeile);
    const oben = y > 0 ? pixel.subarray((y - 1) * zeile, y * zeile) : null;
    for (let x = 0; x < zeile; x++) {
      const a = x >= kanaele ? ziel[x - kanaele] : 0;
      const b = oben ? oben[x] : 0;
      const c = oben && x >= kanaele ? oben[x - kanaele] : 0;
      let wert = quelle[x];
      if (filter === 1) wert += a;
      else if (filter === 2) wert += b;
      else if (filter === 3) wert += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        wert += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      ziel[x] = wert & 255;
    }
  }

  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (farbtyp === 3) {
      const index = pixel[i];
      data[o] = palette[index * 3];
      data[o + 1] = palette[index * 3 + 1];
      data[o + 2] = palette[index * 3 + 2];
      data[o + 3] = transparenz && index < transparenz.length ? transparenz[index] : 255;
    } else if (farbtyp === 6) {
      data.set(pixel.subarray(i * 4, i * 4 + 4), o);
    } else if (farbtyp === 2) {
      data.set(pixel.subarray(i * 3, i * 3 + 3), o);
      data[o + 3] = 255;
    } else if (farbtyp === 0) {
      data[o] = data[o + 1] = data[o + 2] = pixel[i];
      data[o + 3] = 255;
    } else {
      data[o] = data[o + 1] = data[o + 2] = pixel[i * 2];
      data[o + 3] = pixel[i * 2 + 1];
    }
  }
  return { width: w, height: h, data };
}

/** Eine data:-Adresse (wie aus dem Skin-Paket) lesen. */
export function pngAusAdresse(adresse) {
  const base64 = String(adresse).replace(/^data:image\/png;base64,/, '');
  return pngLesen(Buffer.from(base64, 'base64'));
}

/* ---------- Schreiben ---------- */

const CRC_TABELLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc(puffer) {
  let c = 0xffffffff;
  for (const byte of puffer) c = CRC_TABELLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function block(typ, inhalt) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(inhalt.length);
  const typUndInhalt = Buffer.concat([Buffer.from(typ, 'ascii'), inhalt]);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc(typUndInhalt));
  return Buffer.concat([laenge, typUndInhalt, pruef]);
}

/**
 * Pixel als PNG. Halbdurchsichtige Pixel werden voll oder leer
 * (Pixelgrafik). Bis 255 Farben mit Palette, sonst RGBA.
 */
export function pngSchreiben({ width: w, height: h, data }) {
  const farben = new Map();
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const schluessel = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
    if (!farben.has(schluessel) && farben.size < 256) farben.set(schluessel, farben.size + 1);
    if (farben.size >= 256) break;
  }
  const mitPalette = farben.size < 256;

  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(w, 0);
  kopf.writeUInt32BE(h, 4);
  kopf[8] = 8;
  kopf[9] = mitPalette ? 3 : 6;

  const kanaele = mitPalette ? 1 : 4;
  const roh = Buffer.alloc(h * (w * kanaele + 1));
  for (let y = 0; y < h; y++) {
    roh[y * (w * kanaele + 1)] = 0; // kein Filter
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = y * (w * kanaele + 1) + 1 + x * kanaele;
      const sichtbar = data[i + 3] >= 128;
      if (mitPalette) {
        roh[o] = sichtbar ? farben.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) : 0;
      } else {
        roh[o] = data[i]; roh[o + 1] = data[i + 1]; roh[o + 2] = data[i + 2]; roh[o + 3] = sichtbar ? 255 : 0;
      }
    }
  }

  const teile = [SIGNATUR, block('IHDR', kopf)];
  if (mitPalette) {
    const palette = Buffer.alloc((farben.size + 1) * 3);
    farben.forEach((index, rgb) => {
      palette[index * 3] = rgb >> 16;
      palette[index * 3 + 1] = (rgb >> 8) & 255;
      palette[index * 3 + 2] = rgb & 255;
    });
    teile.push(block('PLTE', palette), block('tRNS', Buffer.from([0])));
  }
  teile.push(block('IDAT', deflateSync(roh, { level: 9 })), block('IEND', Buffer.alloc(0)));
  return Buffer.concat(teile);
}
