// src/pages/car/pages/DriverQrStickers.jsx
// 🏷️ One QR sticker per truck. The QR is the driver page's public link with
// the plate in it, so the phone camera (or the in-app 📷) opens that truck's
// trip straight away. Plates come from the loading checklist's vehicle list.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { buildPublicUrl } from "../../../config/publicOrigin";
import { listReports, payloadOf } from "../../monitor/branches/_shared/reportApi";
import { DRIVER_PATH, LOOKUP_VEHICLES_TYPE } from "../carConstants";

export const driverLinkOf = (plate) => buildPublicUrl(`${DRIVER_PATH}/${encodeURIComponent(plate)}`);

export default function DriverQrStickers() {
  const navigate = useNavigate();
  const [plates, setPlates] = useState(null);
  const [picked, setPicked] = useState(() => new Set());

  useEffect(() => {
    listReports(LOOKUP_VEHICLES_TYPE)
      .then((rows) => {
        const list = [...new Set(rows.map((r) => String(payloadOf(r)?.value || "").trim()).filter(Boolean))].sort();
        setPlates(list);
        setPicked(new Set(list));
      })
      .catch(() => setPlates([]));
  }, []);

  const toggle = (p) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(p)) n.delete(p); else n.add(p);
    return n;
  });

  const shown = (plates || []).filter((p) => picked.has(p));

  return (
    <main style={{ minHeight: "100vh", background: "#f0f9ff", padding: 16, fontFamily: "Cairo, system-ui, Arial", color: "#0f172a" }}>
      <style>{`
        @media print {
          .qr-noprint { display: none !important; }
          body, main { background: #fff !important; }
          .qr-sheet { gap: 6mm !important; }
          .qr-card { box-shadow: none !important; break-inside: avoid; }
        }
      `}</style>

      <div className="qr-noprint" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ margin: 0, flex: 1 }}>🏷️ Truck QR stickers</h2>
        <button type="button" onClick={() => window.print()} disabled={!shown.length} style={btn("#2563eb", "#fff")}>🖨️ Print</button>
        <button type="button" onClick={() => navigate(DRIVER_PATH)} style={btn("#fff", "#0f172a")}>← Driver page</button>
      </div>

      {plates == null && <div>Loading…</div>}
      {plates && plates.length === 0 && (
        <div className="qr-noprint">No vehicle numbers yet — add them from the loading checklist (+ Add vehicle no.).</div>
      )}

      {plates && plates.length > 0 && (
        <div className="qr-noprint" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {plates.map((p) => (
            <button key={p} type="button" onClick={() => toggle(p)} style={btn(picked.has(p) ? "#0284c7" : "#fff", picked.has(p) ? "#fff" : "#334155")}>
              {picked.has(p) ? "✓ " : ""}{p}
            </button>
          ))}
        </div>
      )}

      <div className="qr-sheet" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
        {shown.map((p) => (
          <div key={p} className="qr-card" style={{
            background: "#fff", border: "2px solid #0f172a", borderRadius: 14, padding: 14, textAlign: "center",
            boxShadow: "0 8px 20px rgba(2,132,199,.08)",
          }}>
            <div style={{ fontWeight: 1000, letterSpacing: ".06em", fontSize: 12, color: "#0369a1" }}>DRIVER TRIP · رحلة السائق</div>
            <div style={{ margin: "10px auto", width: 170 }}>
              <QRCodeSVG value={driverLinkOf(p)} size={170} level="M" includeMargin={false} />
            </div>
            <div style={{ fontWeight: 1000, fontSize: 20, border: "2px solid #0f172a", borderRadius: 8, display: "inline-block", padding: "2px 12px", background: "#fefce8" }}>
              {p}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6, fontWeight: 700 }}>
              Scan → temperature · destinations · returns
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const btn = (bg, color) => ({
  minHeight: 40, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontFamily: "inherit",
  background: bg, color, border: "1.5px solid #cbd5e1",
});
