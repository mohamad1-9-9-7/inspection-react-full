// src/utils/qrSvg.js
//
// QR code → SVG markup string, using the ZXing encoder already in the bundle.
// A string (not a React component) because labels are printed from their own
// iframe document, away from globals.css.

import { QRCodeEncoder, QRCodeDecoderErrorCorrectionLevel, EncodeHintType } from "@zxing/library";

/** "<svg …>" with one user unit per module and a 2-module quiet zone. */
export function qrSvg(text, { ec = "M", quiet = 2 } = {}) {
  const hints = new Map([[EncodeHintType.CHARACTER_SET, "UTF-8"]]);
  const qr = QRCodeEncoder.encode(String(text || " "), QRCodeDecoderErrorCorrectionLevel.fromString(ec), hints);
  const m = qr.getMatrix();
  const n = m.getWidth();
  let path = "";
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (m.get(x, y) === 1) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  const size = n + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" style="display:block;width:100%;height:100%"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
