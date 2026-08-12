// src/pages/haccp and iso/ProductWithdrawal/TraceLinkPicker.jsx
// Links a Product Withdrawal to a REAL traceability record instead of a free-text
// reference: either a Mock Recall / Traceability Drill, or a branch traceability
// log. Only a compact summary is stored on the withdrawal so the record stays
// self-contained even if the source is later edited.

import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../../config/api";

/* Sources scanned when the picker opens. */
const SOURCES = [
  { type: "mock_recall_drill",     kind: "mock_recall", icon: "🔄" },
  { type: "pos10_traceability_log", kind: "trace_log",  icon: "🧬" },
  { type: "pos11_traceability_log", kind: "trace_log",  icon: "🧬" },
  { type: "pos15_traceability_log", kind: "trace_log",  icon: "🧬" },
  { type: "pos19_traceability_log", kind: "trace_log",  icon: "🧬" },
  { type: "prd_traceability_log",   kind: "trace_log",  icon: "🧬" },
];

const BRANCH_OF_TYPE = {
  pos10_traceability_log: "POS 10",
  pos11_traceability_log: "POS 11",
  pos15_traceability_log: "POS 15",
  pos19_traceability_log: "Al Warqa Kitchen",
  prd_traceability_log: "PRODUCTION",
};

/* Row containers differ per branch form — accept any of them. */
function rowsOf(payload) {
  const p = payload || {};
  const rows = p.rows || p.products || p.items || p.lines || p.details || [];
  return Array.isArray(rows) ? rows : [];
}

/* Flatten a record to searchable text so batch/lot search works regardless of
   which field name a particular branch form used. */
function searchTextOf(rec) {
  const p = rec?.payload || {};
  const parts = [
    p.product?.name, p.product?.batch, p.product?.branch, p.drillDate,
    p.branch, p.reportDate, p.date,
  ];
  rowsOf(p).forEach((r) => {
    Object.values(r || {}).forEach((v) => {
      if (v == null) return;
      if (typeof v === "object") return;
      parts.push(String(v));
    });
  });
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/* Compact, self-contained summary written onto the withdrawal record. */
export function summarizeSource(rec, src) {
  const p = rec?.payload || {};
  const id = rec?.id || rec?._id || "";
  if (src.kind === "mock_recall") {
    return {
      kind: "mock_recall",
      type: src.type,
      id,
      date: p.drillDate || "",
      branch: p.product?.branch || "",
      product: p.product?.name || "",
      batch: p.product?.batch || "",
      drillName: p.drillName || "mock_recall",
      tracedPct: typeof p.autoKpi?.tracedPct === "number" ? p.autoKpi.tracedPct : null,
      rowsCount: (Array.isArray(p.backwardTrace) ? p.backwardTrace.length : 0)
               + (Array.isArray(p.forwardTrace) ? p.forwardTrace.length : 0),
      linkedAt: new Date().toISOString(),
    };
  }
  return {
    kind: "trace_log",
    type: src.type,
    id,
    date: p.reportDate || p.date || "",
    branch: p.branch || BRANCH_OF_TYPE[src.type] || "",
    product: "",
    batch: "",
    rowsCount: rowsOf(p).length,
    linkedAt: new Date().toISOString(),
  };
}

export function traceLinkTitle(link, t) {
  if (!link) return "";
  if (link.kind === "mock_recall") {
    return `${t("pwTraceKindDrill")} · ${link.product || "—"}${link.batch ? ` · Lot ${link.batch}` : ""}`;
  }
  return `${t("pwTraceKindLog")} · ${link.branch || "—"}`;
}

export default function TraceLinkPicker({ open, onClose, onPick, t, lang, dir }) {
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const results = await Promise.all(
          SOURCES.map(async (src) => {
            try {
              const res = await fetch(
                `${API_BASE}/api/reports?type=${encodeURIComponent(src.type)}`,
                { cache: "no-store" }
              );
              if (!res.ok) return [];
              const json = await res.json().catch(() => null);
              const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
              return arr.map((rec) => ({ rec, src }));
            } catch {
              return [];
            }
          })
        );
        if (cancelled) return;
        const flat = results.flat().map(({ rec, src }) => ({
          rec,
          src,
          summary: summarizeSource(rec, src),
          search: searchTextOf(rec),
        }));
        flat.sort((a, b) => (a.summary.date < b.summary.date ? 1 : -1));
        setRecords(flat);
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (kindFilter !== "all" && r.src.kind !== kindFilter) return false;
      if (q && !r.search.includes(q)) return false;
      return true;
    });
  }, [records, query, kindFilter]);

  if (!open) return null;

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.panel, direction: dir }} onClick={(e) => e.stopPropagation()}>
        <div style={S.head}>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900 }}>{t("pwTraceLinkTitle")}</div>
            <div style={{ fontSize: "0.82rem", opacity: 0.85, marginTop: 2 }}>{t("pwTraceLinkHint")}</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✖</button>
        </div>

        <div style={S.toolbar}>
          <input
            style={{ ...S.input, flex: 1, minWidth: 200 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("pwTraceSearchPh")}
            autoFocus
          />
          <select style={S.input} value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            <option value="all">{t("pwTraceAllSources")}</option>
            <option value="mock_recall">🔄 {t("pwTraceKindDrill")}</option>
            <option value="trace_log">🧬 {t("pwTraceKindLog")}</option>
          </select>
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 800 }}>
            {filtered.length} / {records.length}
          </span>
        </div>

        <div style={S.body}>
          {loading && <div style={S.empty}>{t("loading")}</div>}
          {!loading && err && <div style={S.errBox}>❌ {err}</div>}
          {!loading && !err && filtered.length === 0 && (
            <div style={S.empty}>{t("pwTraceNoSources")}</div>
          )}

          {!loading && filtered.map(({ src, summary }) => (
            <button
              key={`${src.type}_${summary.id || Math.random()}`}
              type="button"
              style={S.item}
              onClick={() => { onPick?.(summary); onClose?.(); }}
            >
              <div style={{ flex: 1, minWidth: 0, textAlign: isAr ? "right" : "left" }}>
                <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "0.94rem" }}>
                  {src.icon} {summary.kind === "mock_recall"
                    ? `${summary.product || "—"}${summary.batch ? ` · Lot ${summary.batch}` : ""}`
                    : `${t("pwTraceKindLog")} — ${summary.branch || BRANCH_OF_TYPE[src.type] || "—"}`}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, marginTop: 3 }}>
                  📅 {summary.date || "—"}
                  {summary.branch ? ` · 🏭 ${summary.branch}` : ""}
                  {summary.rowsCount ? ` · ${summary.rowsCount} ${t("pwTraceRows")}` : ""}
                  {summary.tracedPct != null ? ` · ${summary.tracedPct.toFixed(1)}%` : ""}
                </div>
              </div>
              <span style={S.pickBtn}>{t("pwTracePick")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px 12px",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  panel: {
    background: "#fff", borderRadius: 14, width: "100%", maxWidth: 720,
    maxHeight: "85vh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 60px rgba(0,0,0,0.35)", overflow: "hidden",
  },
  head: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff", padding: "16px 20px",
    display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer",
    fontWeight: 900, flexShrink: 0,
  },
  toolbar: {
    display: "flex", gap: 8, padding: 12, flexWrap: "wrap", alignItems: "center",
    borderBottom: "1px solid #e5e7eb", background: "#f8fafc",
  },
  input: {
    padding: "8px 11px", border: "1px solid #d1d5db", borderRadius: 8,
    fontSize: "0.9rem", fontWeight: 600, background: "#fff", fontFamily: "inherit",
    boxSizing: "border-box",
  },
  body: { overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  item: {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
    padding: "10px 12px", cursor: "pointer", fontFamily: "inherit",
    textAlign: "start",
  },
  pickBtn: {
    background: "#eef2ff", color: "#1e40af", border: "1px solid #c7d2fe",
    padding: "5px 12px", borderRadius: 8, fontWeight: 800, fontSize: "0.8rem",
    whiteSpace: "nowrap", flexShrink: 0,
  },
  empty: { textAlign: "center", padding: 30, color: "#64748b", fontWeight: 700 },
  errBox: {
    background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b",
    padding: 10, borderRadius: 8, fontWeight: 700,
  },
};
