// src/pages/car/pages/VehicleDayCards.jsx
// The day on /car/loading-reports as one card per truck. A click opens a
// popup with everything recorded for that truck on the day: the outbound
// checklist row(s), the driver trips (destinations, arrivals, returns,
// photos, locations) and the expiry date of the truck's approval.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { thumbUrl } from "../../../utils/imageUpload";
import { listReports, payloadOf } from "../../monitor/branches/_shared/reportApi";
import { mapsLink, reasonLabel } from "../carConstants";

const APPROVALS_TYPE = "car_approvals";

const plateKey = (s) => String(s ?? "").toLowerCase().replace(/[\s\-_/]+/g, "");
const high = (t) => t !== "" && t != null && !isNaN(Number(t)) && Number(t) > 5;

function parseDate(s) {
  const str = String(s || "").trim();
  let m;
  if ((m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
function daysLeft(s) {
  const d = parseDate(s);
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
const fmtDate = (s) => {
  const d = parseDate(s);
  return d ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d) : s || "—";
};

/* Plates are written two ways: the approvals register carries the plate
   code ("14298-E") while the drivers and the checklist often type only the
   number ("14298"). Same plate = same key; or the same number when one side
   has no letter code. Two different codes ("14298-E" / "14298-D") never match. */
const plateDigits = (s) => String(s ?? "").replace(/\D/g, "");
const plateLetters = (s) => String(s ?? "").replace(/[^a-z]/gi, "").toLowerCase();
function samePlate(a, b) {
  if (plateKey(a) && plateKey(a) === plateKey(b)) return true;
  const da = plateDigits(a);
  return !!da && da === plateDigits(b) && (!plateLetters(a) || !plateLetters(b));
}

/* One permit = one emirate + food type (a truck can hold Dubai and Abu Dhabi,
   or chiller and frozen, at once). The latest expiry of each is the one in
   force; older entries of the same permit are its history. */
const permitKey = (c) => `${String(c.emirate || "").trim().toLowerCase()}|${String(c.foodType || "").trim().toLowerCase()}`;

/** Every DM card in the approvals register (/car/approvals-view: one record, items[]). */
function useApprovals() {
  const [all, setAll] = useState([]);
  useEffect(() => {
    let alive = true;
    listReports(APPROVALS_TYPE)
      .then((rows) => {
        if (!alive) return;
        const out = [];
        const seen = new Set();
        rows.forEach((r) => {
          const p = payloadOf(r);
          const items = p?.items || p?.payload?.items || [];
          (Array.isArray(items) ? items : []).forEach((it) => {
            if (!plateKey(it?.vehicleNo)) return;
            const dup = `${plateKey(it.vehicleNo)}|${it.tradeLicense}|${it.issueDate}|${it.expiryDate}|${permitKey(it)}`;
            if (seen.has(dup)) return;
            seen.add(dup);
            const imageUrls = Array.isArray(it.imageUrls)
              ? it.imageUrls.filter(Boolean)
              : it.imageUrl ? [it.imageUrl] : [];
            out.push({ ...it, imageUrls });
          });
        });
        setAll(out);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* plate → { current: [one per permit], previous: [...] }, latest expiry first */
  return useCallback((plate) => {
    const mine = all
      .filter((c) => samePlate(c.vehicleNo, plate))
      .sort((a, b) => (parseDate(b.expiryDate) || 0) - (parseDate(a.expiryDate) || 0));
    const seenPermit = new Set();
    const current = [];
    const previous = [];
    mine.forEach((c) => {
      const k = permitKey(c);
      if (seenPermit.has(k)) previous.push(c);
      else { seenPermit.add(k); current.push(c); }
    });
    return { current, previous };
  }, [all]);
}

function expiryTone(days) {
  if (days == null) return { bg: "#f1f5f9", fg: "#475569", bd: "#cbd5e1", text: "" };
  if (days < 0) return { bg: "#fee2e2", fg: "#991b1b", bd: "#fca5a5", text: `Expired ${-days} d ago` };
  if (days <= 30) return { bg: "#fef3c7", fg: "#92400e", bd: "#fcd34d", text: `${days} d left` };
  return { bg: "#dcfce7", fg: "#166534", bd: "#86efac", text: `${days} d left` };
}

const permitName = (c) => [c.emirate, c.foodType].filter(Boolean).join(" · ") || "DM card";

/* One badge per permit in force. */
function ExpiryBadges({ cards }) {
  if (!cards?.current?.length) {
    return <span className="vdc-badge" style={badge("#f1f5f9", "#64748b", "#cbd5e1")}>No DM card on file</span>;
  }
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      {cards.current.map((c, i) => {
        const tone = expiryTone(daysLeft(c.expiryDate));
        return (
          <span key={i} className="vdc-badge vdc-permit" style={{ ...badge(tone.bg, tone.fg, tone.bd), ...wrapBadge }}>
            <span>🪪 {cards.current.length > 1 ? permitName(c) : "DM card"}</span>
            <span>expires {fmtDate(c.expiryDate)}{tone.text ? ` · ${tone.text}` : ""}</span>
          </span>
        );
      })}
    </div>
  );
}

/* Everything /car/approvals-view keeps about the truck's DM card(s). */
function DmCards({ cards, onPhoto }) {
  const list = [
    ...(cards?.current || []).map((c) => ({ c, old: false })),
    ...(cards?.previous || []).map((c) => ({ c, old: true })),
  ];
  if (!list.length) {
    return <div style={{ color: "#64748b", fontWeight: 700 }}>No DM card on file for this vehicle — add it in Approvals.</div>;
  }
  return list.map(({ c, old }, i) => {
    const tone = expiryTone(daysLeft(c.expiryDate));
    return (
      <div key={i} style={{ border: `1.5px solid ${old ? "#e2e8f0" : tone.bd}`, borderRadius: 12, padding: 12, marginBottom: 10, background: old ? "#f8fafc" : tone.bg + "66", opacity: old ? 0.85 : 1 }}>
        <div style={{ fontWeight: 900, color: "#475569", marginBottom: 8 }}>
          {old ? "Previous · " : "In force · "}{permitName(c)} · plate {c.vehicleNo}
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 8 }}>
          {kv("Company", c.company)}
          {kv("Emirate", c.emirate)}
          {kv("Trade license", c.tradeLicense)}
          {kv("Permit type", c.permitType)}
          {kv("Food type", c.foodType)}
          {kv("Issue date", fmtDate(c.issueDate))}
          {kv("Expiry date", fmtDate(c.expiryDate), tone.fg)}
          {kv("Days left", tone.text || "—", tone.fg)}
        </div>
        {c.remarks && <div style={{ color: "#475569", marginBottom: 8 }}>📝 {c.remarks}</div>}
        {c.imageUrls.length > 0 && (
          <Thumbs photos={c.imageUrls.map((src) => ({ src, label: `DM card ${c.vehicleNo || ""}` }))} onPhoto={onPhoto} />
        )}
      </div>
    );
  });
}

const badge = (bg, fg, bd) => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
  background: bg, color: fg, border: `1px solid ${bd}`, fontWeight: 800, whiteSpace: "nowrap",
});
/* a permit badge: two lines (permit / expiry) that wrap inside the card */
const wrapBadge = {
  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
  whiteSpace: "normal", borderRadius: 10, padding: "5px 10px", maxWidth: "100%", boxSizing: "border-box",
  overflowWrap: "anywhere",
};

/* ───────────── truck picture (no image files: inline SVG) ───────────── */
function TruckIcon({ color }) {
  return (
    <svg viewBox="0 0 64 40" width="64" height="40" aria-hidden="true">
      <rect x="2" y="6" width="38" height="22" rx="3" fill={color} />
      <path d="M40 12h12l8 9v7H40z" fill={color} opacity=".85" />
      <rect x="44" y="15" width="8" height="6" rx="1" fill="#e0f2fe" />
      <circle cx="14" cy="31" r="5" fill="#0f172a" /><circle cx="14" cy="31" r="2" fill="#cbd5e1" />
      <circle cx="50" cy="31" r="5" fill="#0f172a" /><circle cx="50" cy="31" r="2" fill="#cbd5e1" />
    </svg>
  );
}

/* ───────────── the popup ───────────── */
function Section({ title, children, tone = "#0c4a6e", bg = "#f0f9ff" }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ background: bg, color: tone, fontWeight: 900, padding: "8px 12px" }}>{title}</div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

const kv = (k, v, color) => (
  <div key={k} style={{ minWidth: 120 }}>
    <div style={{ color: "#64748b", fontWeight: 700, fontSize: ".85em" }}>{k}</div>
    <div style={{ fontWeight: 900, color: color || "#0f172a" }}>{v === "" || v == null ? "—" : v}</div>
  </div>
);

function Thumbs({ photos, onPhoto }) {
  if (!photos?.length) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {photos.map((p, i) => (
        <button key={p.src + i} type="button" title={p.label} onClick={() => onPhoto(photos, i)}
          style={{ padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", cursor: "zoom-in" }}>
          <img src={String(p.src).startsWith("http") ? thumbUrl(p.src, 260) : p.src} alt={p.label}
            style={{ width: 128, height: 128, objectFit: "cover", borderRadius: 7, display: "block" }} />
        </button>
      ))}
    </div>
  );
}

const Loc = ({ loc, label }) =>
  loc ? (
    <a href={mapsLink(loc)} target="_blank" rel="noreferrer" style={{ color: "#0369a1", fontWeight: 800, textDecoration: "none" }}
      title={`${loc.lat}, ${loc.lng}${loc.accuracy ? ` (±${loc.accuracy} m)` : ""}`}>
      📍 {label || "Open map"}
    </a>
  ) : <span style={{ color: "#94a3b8" }}>—</span>;

function VehicleModal({ car, cards, viParams, normYesNo, durationOf, onPhoto, onDeleteTrip, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const checklist = car.rows.filter((r) => !r.__trip);
  const trips = car.rows.filter((r) => r.__trip).map((r) => r.__tripRaw);

  /* into <body>: the reports page's .panel has backdrop-filter, which would
     make a fixed layer inside it fill only the panel instead of the screen */
  return createPortal(
    <div className="vdm" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9000, fontFamily: "Inter, ui-sans-serif, system-ui, Arial", color: "#0f172a", background: "rgba(2,6,23,.55)", display: "grid", placeItems: "center", padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(1960px, 98vw)", maxHeight: "96vh", overflow: "auto", background: "#fff", borderRadius: 18,
        boxShadow: "0 30px 60px rgba(2,6,23,.35)", textAlign: "left",
      }}>
        <div style={{ position: "sticky", top: 0, zIndex: 2, background: "linear-gradient(135deg,#e0f2fe,#eef2ff)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid #e2e8f0" }}>
          <TruckIcon color="#0284c7" />
          <span style={{ fontWeight: 1000, fontSize: "1.6em", border: "2px solid #0f172a", borderRadius: 8, padding: "2px 12px", background: "#fefce8" }}>{car.plate}</span>
          <ExpiryBadges cards={cards} />
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer" }}>✕ Close</button>
        </div>

        <div style={{ padding: 16 }}>
          <Section title="🪪 DM card (Approvals)" bg="#f0fdf4" tone="#166534">
            <DmCards cards={cards} onPhoto={onPhoto} />
          </Section>

          {checklist.map((r, i) => {
            const dur = durationOf(r);
            return (
              <Section key={`c${i}`} title={`🧾 Outbound checklist${checklist.length > 1 ? ` #${i + 1}` : ""}`}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                  {kv("Driver", r.driverName)}
                  {kv("Time start", r.timeStart)}
                  {kv("Time end", r.timeEnd)}
                  {kv("Duration", dur == null ? "—" : `${Math.max(0, dur)} min`)}
                  {kv("Truck temp", r.tempCheck === "" || r.tempCheck == null ? "—" : `${r.tempCheck}°C`, high(r.tempCheck) ? "#b45309" : "#0369a1")}
                  {kv("Destination", r.destination)}
                  {r.informedTo ? kv("Informed to", r.informedTo) : null}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 6 }}>
                  {viParams.map((p) => {
                    const n = normYesNo(r[p.id]);
                    return (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontWeight: 700, fontSize: ".85em" }}>{p.en}</span>
                        <b style={{ color: n === "yes" ? "#16a34a" : n === "no" ? "#dc2626" : "#94a3b8" }}>{n ? n.toUpperCase() : "—"}</b>
                      </div>
                    );
                  })}
                </div>
                {r.remarks && <div style={{ marginTop: 8, color: "#475569" }}>📝 {r.remarks}</div>}
              </Section>
            );
          })}

          {trips.map((tr, i) => {
            const photos = [
              ...(tr.loading?.photos || []).map((src) => ({ src, label: "Loading" })),
              ...(tr.destinations || []).flatMap((d) => (d.arrival?.photos || []).map((src) => ({ src, label: d.name }))),
            ];
            const t0 = tr.loading?.time, t1 = tr.loading?.endTime;
            const dur = durationOf({ timeStart: t0, timeEnd: t1 });
            return (
              <Section key={`t${i}`} bg="#ecfeff" tone="#155e75"
                title={`📷 Driver trip${trips.length > 1 ? ` #${i + 1}` : ""} · ${tr.status === "closed" ? "🏁 Ended" : "🟢 On the road"}`}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                  {kv("Driver", `${tr.driverName || "—"}${tr.driverEmpNo ? ` (${tr.driverEmpNo})` : ""}`)}
                  {kv("Loading start", t0)}
                  {kv("Loading end", t1)}
                  {kv("Duration", dur == null ? "—" : `${Math.max(0, dur)} min`)}
                  {kv("Loading temp", tr.loading?.temp === "" || tr.loading?.temp == null ? "—" : `${tr.loading.temp}°C`, high(tr.loading?.temp) ? "#b45309" : "#0369a1")}
                  <div style={{ minWidth: 120 }}>
                    <div style={{ color: "#64748b", fontWeight: 700, fontSize: ".85em" }}>Loading location</div>
                    <Loc loc={tr.loading?.location} />
                  </div>
                </div>

                <div style={{ overflowX: "auto", marginBottom: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                    <thead>
                      <tr>
                        {["Destination", "Arrival", "Temp", "Location", "Returns"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "7px 8px", background: "#f1f5f9", fontWeight: 900, position: "static", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(tr.destinations || []).map((d) => (
                        <tr key={d.id}>
                          <td style={td}><b>{d.name}</b></td>
                          <td style={td}>{d.arrival?.time || <span style={{ color: "#94a3b8" }}>not arrived</span>}</td>
                          <td style={{ ...td, fontWeight: 900, color: high(d.arrival?.temp) ? "#b45309" : "#0369a1" }}>
                            {d.arrival?.temp === "" || d.arrival?.temp == null ? "—" : `${d.arrival.temp}°C${high(d.arrival.temp) ? " ⚠" : ""}`}
                          </td>
                          <td style={td}><Loc loc={d.arrival?.location} label="map" /></td>
                          <td style={td}>
                            {d.returns?.length
                              ? d.returns.map((r) => (
                                  <div key={r.id}>{r.code ? `${r.code} · ` : ""}{r.name} — <b>{r.qty} {r.uom}</b> ({reasonLabel(r.reason)})</div>
                                ))
                              : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ color: "#64748b", fontWeight: 700, fontSize: ".85em", marginBottom: 6 }}>Photos</div>
                <Thumbs photos={photos} onPhoto={onPhoto} />
                {tr.notes && <div style={{ marginTop: 8, color: "#475569" }}>📝 {tr.notes}</div>}
                {onDeleteTrip && tr.id && (
                  <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button
                      type="button"
                      data-delete-action="true"
                      onClick={() => onDeleteTrip(tr)}
                      style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontWeight: 900, cursor: "pointer" }}
                    >
                      🗑 Delete this trip
                    </button>
                  </div>
                )}
              </Section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
const td ={ padding: "7px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "left", verticalAlign: "top" };

/* ───────────── the cards ───────────── */
/* Bigger type. Under #root every element is forced to 14px !important
   (globals.css); a more specific selector wins, and --app-fs keeps the
   user's text-size slider working. The popup sits in <body>, outside it. */
const CSS = `
#root .vdc, #root .vdc * { font-size: calc(16px * var(--app-fs, 1)) !important; }
#root .vdc .vdc-plate { font-size: calc(20px * var(--app-fs, 1)) !important; }
#root .vdc .vdc-badge, #root .vdc .vdc-badge * { font-size: calc(14px * var(--app-fs, 1)) !important; }
#root .vdc > button { min-width: 0; overflow: hidden; }
#root .vdc .vdc-permit { width: 100%; }
.vdm { font-size: calc(18px * var(--app-fs, 1)); font-weight: 700; }
.vdm .vdc-badge { font-size: calc(16px * var(--app-fs, 1)); }
.vdm img { max-width: none; }
`;

export default function VehicleDayCards({ vehicles, viParams, normYesNo, durationOf, onPhoto, onDeleteTrip }) {
  const cardsOf = useApprovals();
  const [open, setOpen] = useState(null); // car key

  /* one card per truck: "14298" and "14298-E" are the same truck (samePlate);
     the card shows the fuller spelling */
  const cars = useMemo(() => {
    const list = [];
    (vehicles || []).forEach((v) => {
      const plate = String(v.vehicleNo || "").trim();
      const car = plate ? list.find((c) => samePlate(c.plate, plate)) : null;
      if (car) {
        if (plateLetters(plate) && !plateLetters(car.plate)) car.plate = plate;
        car.rows.push(v);
      } else {
        list.push({ key: plateKey(plate) || `?${v.__docId}`, plate: plate || "—", rows: [v] });
      }
    });
    return list.sort((a, b) => String(a.plate).localeCompare(String(b.plate), undefined, { numeric: true }));
  }, [vehicles]);

  const current = cars.find((c) => c.key === open) || null;

  if (!cars.length) {
    return <div style={{ textAlign: "center", color: "#6b7280", padding: 16 }}>No vehicles for this day.</div>;
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="vdc" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 12, padding: 12, alignItems: "start" }}>
        {cars.map((c) => {
          const trips = c.rows.filter((r) => r.__trip);
          const checks = c.rows.filter((r) => !r.__trip);
          const temps = c.rows.map((r) => r.tempCheck).filter((t) => t !== "" && t != null);
          const anyHigh = temps.some(high) || trips.some((r) => (r.__tripRaw?.destinations || []).some((d) => high(d.arrival?.temp)));
          const deviations = checks.reduce((n, r) => n + viParams.filter((p) => {
            const v = normYesNo(r[p.id]);
            return v && v !== (p.id === "pestActivites" || p.id === "badOdour" ? "no" : "yes");
          }).length, 0);
          const returns = trips.reduce((n, r) => n + (r.__tripRaw?.destinations || []).reduce((s, d) => s + (d.returns?.length || 0), 0), 0);
          const exp = cardsOf(c.plate);
          const anyExpired = exp.current.some((x) => { const d = daysLeft(x.expiryDate); return d != null && d < 0; });
          const color = anyExpired ? "#dc2626" : anyHigh || deviations ? "#d97706" : "#0284c7";
          const drivers = [...new Set(c.rows.map((r) => r.__tripRaw?.driverName || r.driverName).filter(Boolean))];
          return (
            <button key={c.key} type="button" onClick={() => setOpen(c.key)} style={{
              textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: 12, borderRadius: 16,
              background: "#fff", border: `2px solid ${color}55`, boxShadow: "0 8px 20px rgba(2,132,199,.08)",
              display: "grid", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TruckIcon color={color} />
                <span className="vdc-plate" style={{ fontWeight: 1000, border: "2px solid #0f172a", borderRadius: 7, padding: "1px 10px", background: "#fefce8", color: "#0f172a" }}>
                  {c.plate}
                </span>
              </div>
              <div style={{ color: "#334155", fontWeight: 700, minHeight: 20 }}>👤 {drivers.join(" · ") || "—"}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {checks.length > 0 && <span style={badge("#eef2ff", "#3730a3", "#c7d2fe")}>🧾 {checks.length}</span>}
                {trips.length > 0 && <span style={badge("#ecfeff", "#155e75", "#a5f3fc")}>📷 {trips.length} trip{trips.length > 1 ? "s" : ""}</span>}
                {temps.length > 0 && <span style={badge(anyHigh ? "#fef3c7" : "#f0f9ff", anyHigh ? "#92400e" : "#0369a1", anyHigh ? "#fcd34d" : "#bae6fd")}>🌡 {temps.join(" / ")}°C</span>}
                {deviations > 0 && <span style={badge("#fff7ed", "#9a3412", "#fdba74")}>⚠ {deviations}</span>}
                {returns > 0 && <span style={badge("#fff7ed", "#9a3412", "#fdba74")}>↩️ {returns}</span>}
              </div>
              <ExpiryBadges cards={exp} />
            </button>
          );
        })}
      </div>

      {current && (
        <VehicleModal
          car={current}
          cards={cardsOf(current.plate)}
          viParams={viParams}
          normYesNo={normYesNo}
          durationOf={durationOf}
          onPhoto={onPhoto}
          onDeleteTrip={onDeleteTrip}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
