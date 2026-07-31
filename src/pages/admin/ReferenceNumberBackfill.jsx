// src/pages/admin/ReferenceNumberBackfill.jsx
//
// 🔖 Assigns reference numbers (AM-RET-000087) to reports saved before the
// feature existed. New reports get theirs from the server automatically on
// save; this tool is only for the historical backlog.
//
// The work happens server-side in POST /api/reports/backfill-refs, inside one
// transaction that walks the records in created_at order — so the sequence
// mirrors the order records entered the system, and a half-finished run can
// never leave gaps. Re-running is safe: records that already carry a reference
// are skipped and do not consume a number.

import React, { useState } from "react";
import {
  FiHash, FiEye, FiCheck, FiAlertTriangle, FiLoader, FiRefreshCw,
} from "react-icons/fi";
import API_BASE from "../../config/api";
import { REF_PREFIX, backfillRefs } from "../../utils/reportRef";

const TYPES = [
  { type: "returns", label: "Branch Returns", ar: "مرتجعات الفروع" },
  { type: "returns_customers", label: "Customer Returns", ar: "مرتجعات العملاء" },
  { type: "destruction_record", label: "Condemnation & Disposal", ar: "الإعدام والتخلص" },
];

export default function ReferenceNumberBackfill() {
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  const run = async (type, dryRun) => {
    setBusy(`${type}:${dryRun ? "preview" : "apply"}`);
    setErrors((e) => ({ ...e, [type]: "" }));
    try {
      const data = await backfillRefs(API_BASE, type, { dryRun });
      setResults((r) => ({ ...r, [type]: data }));
    } catch (e) {
      setErrors((er) => ({ ...er, [type]: String(e?.message || e) }));
      setResults((r) => ({ ...r, [type]: null }));
    } finally {
      setBusy("");
    }
  };

  const applyAfterPreview = async (type) => {
    const preview = results[type];
    const count = preview?.assigned ?? 0;
    if (!count) return;
    const ok = window.confirm(
      `Assign ${count} reference number(s) to "${type}"?\n\n` +
        `This writes to the database and cannot be undone — a reference number ` +
        `is permanent once assigned.`
    );
    if (!ok) return;
    await run(type, false);
  };

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={headIcon}><FiHash size={20} /></div>
        <div>
          <h2 style={h2}>Reference Numbers</h2>
          <p style={sub}>
            Give older reports a permanent reference number — أرقام مرجعية للتقارير القديمة
          </p>
        </div>
      </div>

      <div style={noteBox}>
        <FiAlertTriangle size={15} style={{ flex: "0 0 auto", marginTop: 2 }} />
        <div>
          Numbers are handed out in the order records were <b>created</b>, not by report
          date, so a reference never changes once assigned. New reports are numbered
          automatically on save — this tool only fills the historical backlog.
          <br />
          Always run <b>Preview</b> first; it reports exactly what would be written
          without touching anything.
        </div>
      </div>

      <div style={grid}>
        {TYPES.map(({ type, label, ar }) => {
          const res = results[type];
          const err = errors[type];
          const previewing = busy === `${type}:preview`;
          const applying = busy === `${type}:apply`;
          const anyBusy = !!busy;
          const isDry = res?.dryRun;

          return (
            <div key={type} style={card}>
              <div style={cardHead}>
                <div>
                  <div style={cardTitle}>{label}</div>
                  <div style={cardAr} dir="rtl">{ar}</div>
                </div>
                <span style={prefixPill}>AM-{REF_PREFIX[type]}-000000</span>
              </div>

              <div style={btnRow}>
                <button
                  style={anyBusy ? { ...btnGhost, opacity: 0.6, cursor: "wait" } : btnGhost}
                  onClick={() => run(type, true)}
                  disabled={anyBusy}
                >
                  {previewing ? <FiLoader size={14} /> : <FiEye size={14} />}
                  {previewing ? " Checking..." : " Preview"}
                </button>

                <button
                  style={
                    !res || !isDry || !res.assigned || anyBusy
                      ? { ...btnApply, opacity: 0.45, cursor: "not-allowed" }
                      : btnApply
                  }
                  onClick={() => applyAfterPreview(type)}
                  disabled={!res || !isDry || !res.assigned || anyBusy}
                  title={
                    !res || !isDry
                      ? "Run Preview first"
                      : !res.assigned
                      ? "Nothing to assign"
                      : "Write the reference numbers"
                  }
                >
                  {applying ? <FiLoader size={14} /> : <FiCheck size={14} />}
                  {applying ? " Applying..." : " Apply"}
                </button>

                {res && (
                  <button style={btnGhost} onClick={() => run(type, true)} disabled={anyBusy}>
                    <FiRefreshCw size={13} /> Re-check
                  </button>
                )}
              </div>

              {err && <div style={errBox}>❌ {err}</div>}

              {res && (
                <>
                  <div style={statRow}>
                    <Stat label="Records" value={res.total} />
                    <Stat label="Already numbered" value={res.alreadyHadRef} />
                    <Stat
                      label={isDry ? "Would assign" : "Assigned"}
                      value={res.assigned}
                      accent={res.assigned > 0}
                    />
                  </div>

                  {isDry && res.assigned > 0 && (
                    <div style={pendingBar}>
                      Preview only — nothing written yet. Press <b>Apply</b> to commit.
                    </div>
                  )}
                  {!isDry && res.assigned > 0 && (
                    <div style={doneBar}>
                      ✅ {res.assigned} reference number(s) written.
                    </div>
                  )}
                  {res.assigned === 0 && (
                    <div style={doneBar}>
                      ✅ Every record of this type already has a reference number.
                    </div>
                  )}

                  {res.preview?.length > 0 && (
                    <div style={tableWrap}>
                      <table style={table}>
                        <thead>
                          <tr>
                            <th style={th}>REPORT DATE</th>
                            <th style={th}>REFERENCE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {res.preview.map((p) => (
                            <tr key={p.id}>
                              <td style={td}>{p.reportDate || "—"}</td>
                              <td style={tdMono}>{p.refNo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {res.assigned > res.preview.length && (
                        <div style={moreNote}>
                          + {res.assigned - res.preview.length} more (preview caps at 200)
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={stat}>
      <div style={statLabel}>{label}</div>
      <div style={{ ...statValue, color: accent ? "#0f766e" : "#0f172a" }}>{value}</div>
    </div>
  );
}

/* ───────── styles ───────── */
const wrap = { fontFamily: "Cairo, system-ui, Segoe UI, Arial, sans-serif", color: "#0f172a" };

const head = { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 };

const headIcon = {
  width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center",
  background: "linear-gradient(135deg,#0f766e,#14b8a6)", color: "#fff",
  boxShadow: "0 8px 18px rgba(15,118,110,.28)",
};

const h2 = { margin: 0, fontSize: 18, fontWeight: 900 };
const sub = { margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#64748b" };

const noteBox = {
  display: "flex", gap: 10, alignItems: "flex-start",
  background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e",
  borderRadius: 12, padding: "12px 14px", fontSize: 13, fontWeight: 700,
  lineHeight: 1.6, marginBottom: 16,
};

const grid = { display: "grid", gap: 14 };

const card = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
  padding: 16, boxShadow: "0 2px 12px rgba(15,23,42,.05)",
};

const cardHead = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 10, flexWrap: "wrap", marginBottom: 12,
};

const cardTitle = { fontSize: 15, fontWeight: 900 };
const cardAr = { fontSize: 13, fontWeight: 700, color: "#64748b", marginTop: 2 };

const prefixPill = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12, fontWeight: 800, color: "#0f766e",
  background: "#f0fdfa", border: "1px solid #99f6e4",
  borderRadius: 999, padding: "5px 10px",
};

const btnRow = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 };

const btnBase = {
  display: "inline-flex", alignItems: "center", gap: 6,
  border: "none", borderRadius: 10, padding: "9px 14px",
  fontWeight: 900, fontSize: 13, cursor: "pointer",
  fontFamily: "inherit",
};

const btnGhost = { ...btnBase, background: "#fff", border: "1px solid #cbd5e1", color: "#334155" };
const btnApply = { ...btnBase, background: "#0f766e", color: "#fff" };

const statRow = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 };

const stat = {
  flex: "1 1 120px", background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: 10, padding: "9px 12px",
};

const statLabel = { fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase" };
const statValue = { fontSize: 19, fontWeight: 900, marginTop: 2 };

const pendingBar = {
  background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af",
  borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 800, marginBottom: 10,
};

const doneBar = {
  background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534",
  borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 800, marginBottom: 10,
};

const errBox = {
  background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
  borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 800, marginBottom: 10,
};

const tableWrap = {
  maxHeight: 280, overflow: "auto",
  border: "1px solid #e2e8f0", borderRadius: 10,
};

const table = { width: "100%", borderCollapse: "collapse", fontSize: 13 };

const th = {
  position: "sticky", top: 0, background: "#f1f5f9", textAlign: "left",
  padding: "9px 12px", fontSize: 11.5, fontWeight: 900, color: "#475569",
  borderBottom: "1px solid #e2e8f0",
};

const td = { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontWeight: 700 };

const tdMono = {
  ...td,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontWeight: 800, color: "#0f766e",
};

const moreNote = {
  padding: "8px 12px", fontSize: 12, fontWeight: 800,
  color: "#64748b", background: "#f8fafc",
};
