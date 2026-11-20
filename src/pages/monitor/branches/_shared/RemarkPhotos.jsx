// src/pages/monitor/branches/_shared/RemarkPhotos.jsx
// Thumbnails of the photos attached to a receiving line that got a remark
// (line.remarkPhotos, written by _shared/ReceivingLogForm). Each opens the
// full picture in a new tab. Renders nothing when the line has none.
import React from "react";

export const remarkPhotosOf = (row) =>
  Array.isArray(row?.remarkPhotos) ? row.remarkPhotos.filter((x) => typeof x === "string" && x) : [];

export default function RemarkPhotos({ row, size = 40, style }) {
  const pics = remarkPhotosOf(row);
  if (!pics.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, justifyContent: "center", ...style }}>
      {pics.map((src, i) => (
        <a key={i} href={src} target="_blank" rel="noopener noreferrer" title={`Photo ${i + 1} of ${pics.length}`}>
          <img
            src={src}
            alt=""
            loading="lazy"
            crossOrigin="anonymous"
            style={{ width: size, height: size, objectFit: "cover", borderRadius: 6, border: "1px solid #cbd5e1", display: "block" }}
          />
        </a>
      ))}
    </div>
  );
}
