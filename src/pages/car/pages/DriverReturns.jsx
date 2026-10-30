// src/pages/car/pages/DriverReturns.jsx
// ↩️ Returns from drivers — every product a branch handed back to a driver,
// read from the driver trips (DriverTrip.jsx keeps them per destination).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLangState, hideSectionLangToggle } from "../../../utils/appLang";
import { flattenReturns, listTrips, todayISO } from "../driverTripApi";
import { mapsLink, reasonLabel, RETURN_REASONS } from "../carConstants";

const T = {
  ar: {
    title: "مرتجعات من السائقين", sub: "المنتجات التي استلمها السائقون من الفروع",
    from: "من", to: "إلى", search: "بحث: منتج، كود، سيارة، سائق…", branch: "الفرع", all: "الكل",
    reason: "السبب", vehicle: "السيارة", driver: "السائق", date: "التاريخ", time: "وقت الوصول",
    code: "الكود", product: "المنتج", qty: "الكمية", remark: "ملاحظة", loc: "الموقع",
    rows: "سطر", total: "المجموع", byBranch: "حسب الفرع", none: "لا يوجد مرتجعات في هذه الفترة",
    csv: "⬇️ CSV", refresh: "🔄 تحديث", back: "رجوع", loadErr: "تعذّر التحميل من السيرفر", loading: "عم يحمّل…",
  },
  en: {
    title: "Returns from Drivers", sub: "Products drivers collected back from the branches",
    from: "From", to: "To", search: "Search: product, code, vehicle, driver…", branch: "Branch", all: "All",
    reason: "Reason", vehicle: "Vehicle", driver: "Driver", date: "Date", time: "Arrival",
    code: "Code", product: "Product", qty: "Qty", remark: "Remark", loc: "Location",
    rows: "rows", total: "Total", byBranch: "By branch", none: "No returns in this period",
    csv: "⬇️ CSV", refresh: "🔄 Refresh", back: "Back", loadErr: "Could not load from the server", loading: "Loading…",
  },
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function DriverReturns() {
  const navigate = useNavigate();
  const [lang, setLang] = useLangState(() => {
    try { return localStorage.getItem("cars_hub_lang") || "en"; } catch { return "en"; }
  });
  const t = T[lang] || T.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayISO());
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    setRows(null);
    setError("");
    try {
      setRows(flattenReturns(await listTrips({ from, to })));
    } catch {
      setError(t.loadErr);
      setRows([]);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [from, to]);

  const branches = useMemo(() => [...new Set((rows || []).map((r) => r.branch).filter(Boolean))].sort(), [rows]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || [])
      .filter((r) => !branch || r.branch === branch)
      .filter((r) => !reason || r.reason === reason)
      .filter((r) => !s || [r.name, r.code, r.vehicleNo, r.driverName, r.branch, r.remark]
        .some((v) => String(v || "").toLowerCase().includes(s)))
      .sort((a, b) => String(b.reportDate).localeCompare(String(a.reportDate)) ||
        String(b.arrivalTime).localeCompare(String(a.arrivalTime)));
  }, [rows, q, branch, reason]);

  /* totals per branch and unit (kg and pieces never add up together) */
  const totals = useMemo(() => {
    const m = new Map();
    shown.forEach((r) => {
      const k = r.branch || "—";
      if (!m.has(k)) m.set(k, {});
      const u = r.uom || "";
      m.get(k)[u] = (m.get(k)[u] || 0) + (Number(r.qty) || 0);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  const exportCsv = () => {
    const head = ["Date", "Vehicle", "Driver", "Branch", "Arrival", "Code", "Product", "Qty", "UOM", "Reason", "Remark", "Location"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = shown.map((r) => [
      r.reportDate, r.vehicleNo, r.driverName, r.branch, r.arrivalTime, r.code, r.name, r.qty, r.uom,
      reasonLabel(r.reason, "en"), r.remark, mapsLink(r.location),
    ].map(esc).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `driver_returns_${from}_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const fmt = (n) => (Math.round(n * 100) / 100).toString();

  return (
    <main dir={dir} style={s.shell}>
      <div style={s.wrap}>
        <header style={s.header}>
          <div style={s.icon}>↩️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>{t.title}</div>
            <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12 }}>{t.sub}</div>
          </div>
          {!hideSectionLangToggle() && (
            <button type="button" style={s.btn} onClick={() => {
              const n = lang === "ar" ? "en" : "ar";
              setLang(n);
              try { localStorage.setItem("cars_hub_lang", n); } catch {}
            }}>{lang === "ar" ? "EN" : "ع"}</button>
          )}
          <button type="button" style={s.btn} onClick={() => navigate("/cars")}>{t.back}</button>
        </header>

        <section style={{ ...s.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label><span style={s.label}>{t.from}</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={s.input} /></label>
          <label><span style={s.label}>{t.to}</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={s.input} /></label>
          <label><span style={s.label}>{t.branch}</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={s.input}>
              <option value="">{t.all}</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label><span style={s.label}>{t.reason}</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={s.input}>
              <option value="">{t.all}</option>
              {RETURN_REASONS.map((r) => <option key={r.id} value={r.id}>{r[lang] || r.en}</option>)}
            </select>
          </label>
          <input placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} style={{ ...s.input, flex: 1, minWidth: 200 }} />
          <button type="button" onClick={load} style={s.btn}>{t.refresh}</button>
          <button type="button" onClick={exportCsv} disabled={!shown.length} style={s.btn}>{t.csv}</button>
        </section>

        {totals.length > 0 && (
          <section style={s.card}>
            <div style={{ ...s.label, marginBottom: 8 }}>{t.byBranch}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {totals.map(([b, units]) => (
                <button key={b} type="button" onClick={() => setBranch(branch === b ? "" : b)} style={s.tile(branch === b)}>
                  <div style={{ fontWeight: 900 }}>{b}</div>
                  <div style={{ color: "#9a3412", fontWeight: 800 }}>
                    {Object.entries(units).map(([u, n]) => `${fmt(n)} ${u}`).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section style={s.card}>
          {error && <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 8 }}>{error}</div>}
          {rows == null ? (
            <div style={{ padding: 20, textAlign: "center" }}>{t.loading}</div>
          ) : shown.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>{t.none}</div>
          ) : (
            <>
              <div style={{ fontWeight: 800, color: "#475569", marginBottom: 6 }}>{shown.length} {t.rows}</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr>
                      {[t.date, t.vehicle, t.driver, t.branch, t.time, t.code, t.product, t.qty, t.reason, t.remark, t.loc].map((h) => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r, i) => (
                      <tr key={`${r.tripId}-${r.id || i}`} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                        <td style={s.td}>{r.reportDate}</td>
                        <td style={{ ...s.td, fontWeight: 800 }}>{r.vehicleNo}</td>
                        <td style={s.td}>{r.driverName}</td>
                        <td style={s.td}>{r.branch}</td>
                        <td style={s.td}>{r.arrivalTime || "—"}</td>
                        <td style={s.td}>{r.code || "—"}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{r.name || "—"}</td>
                        <td style={{ ...s.td, fontWeight: 900 }}>{r.qty} {r.uom}</td>
                        <td style={s.td}>{reasonLabel(r.reason, lang)}</td>
                        <td style={s.td}>{r.remark || "—"}</td>
                        <td style={s.td}>
                          {r.location ? <a href={mapsLink(r.location)} target="_blank" rel="noreferrer">📍</a> : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const s = {
  shell: { minHeight: "100vh", background: "linear-gradient(180deg,#f0f9ff,#eef2ff)", padding: 14, color: "#0f172a", fontFamily: "Cairo, system-ui, Arial" },
  wrap: { maxWidth: 1240, margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 12, flexWrap: "wrap",
    background: "rgba(255,255,255,.92)", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 10px 26px rgba(2,132,199,.08)",
  },
  icon: { width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 22, background: "linear-gradient(135deg,#fb923c,#ea580c)", color: "#fff" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: "0 8px 22px rgba(2,132,199,.06)" },
  label: { display: "block", fontWeight: 800, color: "#0c4a6e", fontSize: 12, marginBottom: 4 },
  input: { minHeight: 40, padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontFamily: "inherit", background: "#fff", boxSizing: "border-box" },
  btn: { minHeight: 40, padding: "8px 14px", borderRadius: 10, border: "1.5px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" },
  tile: (on) => ({
    padding: "8px 12px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "start",
    border: on ? "2px solid #ea580c" : "1px solid #fed7aa", background: on ? "#ffedd5" : "#fff7ed",
  }),
  th: { background: "#e0f2fe", color: "#0c4a6e", padding: "9px 8px", textAlign: "start", fontWeight: 900, borderBottom: "1px solid #bae6fd", whiteSpace: "nowrap" },
  td: { padding: "8px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
};
