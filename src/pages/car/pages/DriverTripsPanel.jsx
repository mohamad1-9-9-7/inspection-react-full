// src/pages/car/pages/DriverTripsPanel.jsx
// The driver trips of one day, under the outbound checklist on
// /car/loading-reports: loading temperature, then every destination's
// arrival (time, temperature, photos, location) and its returns.

import React from "react";
import { thumbUrl } from "../../../utils/imageUpload";
import { mapsLink, reasonLabel } from "../carConstants";

const high = (t) => t !== "" && t != null && !isNaN(Number(t)) && Number(t) > 5;

function Photos({ list }) {
  if (!list?.length) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {list.map((p) => (
        <a key={p} href={p} target="_blank" rel="noreferrer">
          <img
            src={String(p).startsWith("http") ? thumbUrl(p, 120) : p}
            alt=""
            style={{ width: 42, height: 42, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", display: "block" }}
          />
        </a>
      ))}
    </span>
  );
}

const Loc = ({ v }) =>
  v ? <a href={mapsLink(v)} target="_blank" rel="noreferrer" title={`${v.lat}, ${v.lng}`}>📍 map</a> : <span style={{ color: "#94a3b8" }}>—</span>;

const Temp = ({ v }) => (
  <b style={{ color: high(v) ? "#b45309" : "#0369a1" }}>{v === "" || v == null ? "—" : `${v}°C`}{high(v) ? " ⚠" : ""}</b>
);

export default function DriverTripsPanel({ trips }) {
  if (!trips?.length) return null;
  const cell = { padding: "7px 8px", borderTop: "1px solid #e2e8f0", textAlign: "left", verticalAlign: "top" };
  const head = { ...cell, background: "#f1f5f9", fontWeight: 800, position: "static" };

  return (
    <div className="panel" style={{ overflow: "hidden", marginBottom: 16 }}>
      <div style={{ background: "#e0f2fe", padding: "10px 12px", fontWeight: 800, color: "#0c4a6e", borderBottom: "1px solid #bae6fd" }}>
        📷 Driver Trips ({trips.length}) — scanned by the drivers
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 12 }}>
        {trips.map((tr) => {
          const ret = (tr.destinations || []).reduce((n, d) => n + (d.returns?.length || 0), 0);
          return (
            <div key={tr.id || tr._outboxId} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "10px 12px", background: "#f8fafc" }}>
                <b style={{ border: "2px solid #0f172a", borderRadius: 6, padding: "1px 8px", background: "#fefce8" }}>{tr.vehicleNo}</b>
                <span>👤 {tr.driverName || "—"}</span>
                <span>🧊 Loading {tr.loading?.time || "—"} · <Temp v={tr.loading?.temp} /></span>
                <Photos list={tr.loading?.photos} />
                <Loc v={tr.loading?.location} />
                {ret > 0 && <span style={{ color: "#9a3412", fontWeight: 800 }}>↩️ {ret} returned item(s)</span>}
                <span style={{ marginLeft: "auto", fontWeight: 800, color: tr.status === "closed" ? "#475569" : "#16a34a" }}>
                  {tr.status === "closed" ? "🏁 Ended" : "🟢 On the road"}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={head}>Destination</th>
                      <th style={head}>Arrival</th>
                      <th style={head}>Temp</th>
                      <th style={head}>Photos</th>
                      <th style={head}>Location</th>
                      <th style={head}>Returns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tr.destinations || []).map((d) => (
                      <tr key={d.id}>
                        <td style={{ ...cell, fontWeight: 800 }}>{d.name}</td>
                        <td style={cell}>{d.arrival?.time || <span style={{ color: "#94a3b8" }}>not arrived</span>}</td>
                        <td style={cell}><Temp v={d.arrival?.temp} /></td>
                        <td style={cell}><Photos list={d.arrival?.photos} /></td>
                        <td style={cell}><Loc v={d.arrival?.location} /></td>
                        <td style={cell}>
                          {d.returns?.length
                            ? d.returns.map((r) => (
                                <div key={r.id}>
                                  {r.code ? `${r.code} · ` : ""}{r.name} — <b>{r.qty} {r.uom}</b> ({reasonLabel(r.reason)})
                                </div>
                              ))
                            : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tr.notes && <div style={{ padding: "6px 12px", color: "#475569" }}>📝 {tr.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
