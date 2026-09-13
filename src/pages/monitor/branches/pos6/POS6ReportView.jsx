// src/pages/monitor/branches/pos6/POS6ReportView.jsx
//
// One viewer driving all five POS 6 sheets, because they differ only in their
// columns — a per-report copy would be the same 200 lines five times over.
// Reads through useReportIndex, so the date tree costs a metadata index and a
// record only loads when its date is clicked.
//
// Actions (print / edit / delete) follow the same house rules as the POS 15
// viewers: edit and delete are gated on the account's crudPerms for the
// "daily" section, delete additionally carries `data-delete-action` so the
// global security switch in globals.css can hide it outright, and the write
// buttons carry `data-write-action` so read-only mode hides them too.

import React, { useCallback, useMemo, useRef, useState } from "react";
import useReportIndex, { invalidateReportIndex } from "../_shared/useReportIndex";
import {
  ActionBar,
  ActionButton,
  DateTreeSidebar,
  EmptyState,
  GlassShell,
  ResponsiveReportLayout,
  ResponsiveTableWrap,
  formatDMY,
} from "../_shared/branchViewKit";
import { payloadOf, reportId } from "../_shared/reportApi";
import { canDelete, canEdit } from "../../../../utils/perms";
import API_BASE from "../../../../config/api";
import { REPORTER } from "./pos6Api";
import { useLang } from "./pos6I18n";

/* Values a sheet stores that should read as pass / fail rather than plain text. */
const GOOD = new Set(["C", "Yes", "√"]);
const BAD = new Set(["NC", "No", "✗"]);

/* What a verdict cell offers while editing. Columns override it with their own
   `options`, because the sheets do not all speak the same verdict: the hygiene
   and cleaning sheets use C / NC, the equipment sheet uses Yes / No for the
   condition columns and √ / ✗ for the sanitizing rounds — exactly the values
   its input screen writes. */
const DEFAULT_VERDICT_OPTIONS = ["C", "NC"];

function Verdict({ value }) {
  const v = String(value ?? "").trim();
  if (!v) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (GOOD.has(v)) return <span style={S.good}>{v}</span>;
  if (BAD.has(v)) return <span style={S.bad}>{v}</span>;
  return <>{v}</>;
}

/**
 * A reading judged against a range, so a viewer sees the same red the person
 * filling the sheet saw. `ok` is decided by the caller — only the sheet knows
 * what range its own unit is held to.
 * @param {*} value
 * @param {boolean|null} ok  false = out of range, true = inside, null = no verdict
 */
export function Reading({ value, ok }) {
  const v = String(value ?? "").trim();
  if (!v) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (ok === false) return <span style={S.bad}>{v}</span>;
  if (ok === true) return <span style={S.good}>{v}</span>;
  return <>{v}</>;
}

/* The default write-back: the row the table drew IS `payload.entries[i]`, so a
   corrected cell goes straight back where it came from. Sheets whose rows are
   derived rather than stored (the coolers log builds a row per unit out of a
   temps map) pass their own. */
const entriesWriteBack = (payload, rowIndex, key, value) => {
  const entries = [...(payload.entries || [])];
  entries[rowIndex] = { ...entries[rowIndex], [key]: value };
  return { ...payload, entries };
};

/**
 * @param {string}  type     report type on the server
 * @param {string}  title    heading (English)
 * @param {string}  titleAr  heading (Arabic)
 * @param {string}  icon     emoji for the shell
 * @param {Array}   columns  [{ key, label, labelAr, kind, render, options, readOnly }] —
 *                           kind "verdict" renders C/NC chips and edits as a dropdown,
 *                           kind "date" reads DD/MM/YYYY and edits as a date picker,
 *                           `render(value, row)` overrides the cell, `readOnly` keeps
 *                           the cell out of editing (a derived label, not data)
 * @param {function} [columnsOf] payload → columns, for sheets whose shape the branch chooses
 * @param {function} [rows]  payload → array of row objects (defaults to payload.entries)
 * @param {function} [meta]  (payload, isAr) → [{ label, value }] shown above the table
 * @param {function} [writeBack] (payload, rowIndex, key, value) → payload, for sheets
 *                           whose rows are derived (see entriesWriteBack)
 */
export default function POS6ReportView({
  type,
  title,
  titleAr,
  icon = "📄",
  columns = [],
  columnsOf,
  rows: rowsOf = (p) => p.entries || [],
  meta: metaOf,
  writeBack = entriesWriteBack,
}) {
  const { isAr, dir } = useLang();
  const { treeItems, selected, selectedKey, loading, opening, open, rowForKey, reload } =
    useReportIndex(type);

  /* While editing, the screen draws from `draft` — a working copy — so a
     half-finished correction is never mistaken for what the server holds, and
     Cancel is simply throwing the copy away. */
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);
  const editing = draft !== null;

  /* A date is no longer always one sheet — the receiving log files one record
     per delivery, so a busy day shows up as several entries. Repeats are
     numbered oldest-first, otherwise the tree offers identical-looking rows. */
  const items = useMemo(() => {
    const total = new Map();
    treeItems.forEach((it) => total.set(it.dateISO, (total.get(it.dateISO) || 0) + 1));
    const seen = new Map();
    return treeItems.map((it) => {
      const n = total.get(it.dateISO) || 0;
      if (n < 2) return it;
      const i = (seen.get(it.dateISO) || 0) + 1;
      seen.set(it.dateISO, i);
      // The index is newest first, so counting down gives the earliest sheet #1.
      return { ...it, label: `${it.label} · #${n - i + 1}` };
    });
  }, [treeItems]);

  const stored = selected ? payloadOf(selected) : null;
  const payload = draft || stored;
  const rows = payload ? rowsOf(payload) : [];
  const cols = payload && columnsOf ? columnsOf(payload) : columns;
  const metaRows = payload && metaOf ? metaOf(payload, isAr) : [];

  const pick = useCallback(
    (item) => {
      // Leaving the record with an edit open would silently discard it, so ask.
      if (draft && !window.confirm(isAr ? "تجاهل التعديلات غير المحفوظة؟" : "Discard unsaved changes?")) return;
      setDraft(null);
      open(rowForKey(item.key) || item.row);
    },
    [draft, isAr, open, rowForKey]
  );

  const setCell = (rowIndex, key, value) =>
    setDraft((prev) => writeBack(prev || stored, rowIndex, key, value));

  const saveEdit = async () => {
    const id = reportId(selected);
    if (!id || !draft) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reporter: REPORTER, type, payload: { ...draft, savedAt: Date.now() } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDraft(null);
      invalidateReportIndex(type);
      await reload();
      alert(isAr ? "✅ تم حفظ التعديلات." : "✅ Changes saved.");
    } catch (e) {
      console.error("[POS 6] edit save failed:", e);
      alert((isAr ? "❌ فشل الحفظ: " : "❌ Save failed: ") + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const id = reportId(selected);
    if (!id) return;
    const when = formatDMY(stored?.reportDate) || "";
    if (!window.confirm(isAr ? `⚠️ حذف تقرير ${when} نهائياً؟` : `⚠️ Permanently delete the ${when} report?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      setDraft(null);
      invalidateReportIndex(type);
      await reload();
      alert(isAr ? "✅ تم حذف التقرير." : "✅ Report deleted.");
    } catch (e) {
      console.error("[POS 6] delete failed:", e);
      alert((isAr ? "❌ فشل الحذف: " : "❌ Delete failed: ") + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  /* Printing opens the sheet in its own window rather than going through
     html2canvas: the canvas route rasterises the page (heavy, and Arabic comes
     out unshaped), while a plain print window keeps the table as real text the
     printer can lay out across pages. */
  const handlePrint = () => {
    if (!sheetRef.current) return;
    const css = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; color: #0f172a; }
      /* The edit banner and any other on-screen-only chrome travel with the
         markup; the print sheet is the record, not the tooling around it. */
      .no-print { display: none !important; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #94a3b8; padding: 6px; font-size: 11px; text-align: center; }
      thead th { background: #0f172a; color: #fff; font-weight: 800; }
      input, select { border: none; background: transparent; font: inherit; color: inherit; text-align: center; width: 100%; }
    `;
    const heading = `<h2 style="margin:0 0 10px;font-size:16px">${title} — POS 6 · ${formatDMY(stored?.reportDate) || ""}</h2>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(
      `<html><head><meta charset="utf-8"/><title>${title} - ${stored?.reportDate || ""}</title>` +
        `<style>${css}</style></head><body>${heading}${sheetRef.current.innerHTML}</body></html>`
    );
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 120);
  };

  const mayEdit = canEdit("daily");
  const mayDelete = canDelete("daily");
  const T = (en, ar) => (isAr ? ar : en);

  return (
    <div dir={dir}>
      <GlassShell
        icon={icon}
        title={isAr ? titleAr : title}
        actions={
          <ActionBar>
            <ActionButton tone="refresh" onClick={reload} disabled={loading || busy}>
              {loading ? T("Loading…", "جارٍ التحميل…") : T("Refresh", "تحديث")}
            </ActionButton>
            <ActionButton tone="cancel" onClick={handlePrint} disabled={!stored}>
              🖨 {T("Print", "طباعة")}
            </ActionButton>
            {mayEdit && !editing && (
              <ActionButton
                tone="edit"
                onClick={() => setDraft(stored)}
                disabled={!stored || busy}
                data-write-action="true"
              >
                ✏️ {T("Edit", "تعديل")}
              </ActionButton>
            )}
            {mayEdit && editing && (
              <>
                <ActionButton tone="save" onClick={saveEdit} disabled={busy} data-write-action="true">
                  {busy ? T("Saving…", "جارٍ الحفظ…") : T("Save changes", "حفظ التعديلات")}
                </ActionButton>
                <ActionButton tone="cancel" onClick={() => setDraft(null)} disabled={busy}>
                  {T("Cancel", "إلغاء")}
                </ActionButton>
              </>
            )}
            {mayDelete && (
              <ActionButton
                tone="delete"
                onClick={handleDelete}
                disabled={!stored || busy || editing}
                data-delete-action="true"
              >
                🗑 {T("Delete", "حذف")}
              </ActionButton>
            )}
          </ActionBar>
        }
      >
        <ResponsiveReportLayout
          sidebar={
            <DateTreeSidebar
              items={items}
              activeKey={selectedKey}
              loading={loading}
              onPick={pick}
              title={isAr ? "📅 شجرة التواريخ" : "📅 Date Tree"}
              emptyText={isAr ? "لا توجد تقارير محفوظة." : "No saved reports yet."}
            />
          }
        >
          {opening ? (
            <EmptyState text={isAr ? "جارٍ الفتح…" : "Opening…"} />
          ) : !payload ? (
            <EmptyState text={isAr ? "اختر تاريخاً من الشجرة." : "Pick a date from the tree."} />
          ) : (
            <div ref={sheetRef}>
              {editing && (
                <div style={S.editBanner} className="no-print">
                  ✏️ {T(
                    "Editing — the record is not changed until you press Save changes.",
                    "وضع التعديل — السجل ما بيتغيّر إلا لما تضغط حفظ التعديلات."
                  )}
                </div>
              )}
              <div style={S.metaGrid}>
                <div style={S.metaCell}>
                  <div style={S.metaLabel}>{isAr ? "التاريخ" : "Date"}</div>
                  <div style={S.metaValue}>{formatDMY(payload.reportDate)}</div>
                </div>
                <div style={S.metaCell}>
                  <div style={S.metaLabel}>{isAr ? "الفرع" : "Branch"}</div>
                  <div style={S.metaValue}>{payload.branch || "POS 6"}</div>
                </div>
                {metaRows.map((m) => (
                  <div key={m.label} style={S.metaCell}>
                    <div style={S.metaLabel}>{m.label}</div>
                    <div style={S.metaValue}>{m.value || "—"}</div>
                  </div>
                ))}
                <div style={S.metaCell}>
                  <div style={S.metaLabel}>{isAr ? "فحص بواسطة" : "Checked by"}</div>
                  <div style={S.metaValue}>{payload.checkedBy || "—"}</div>
                </div>
                <div style={S.metaCell}>
                  <div style={S.metaLabel}>{isAr ? "اعتمده" : "Verified by"}</div>
                  <div style={S.metaValue}>{payload.verifiedBy || "—"}</div>
                </div>
              </div>

              {rows.length === 0 ? (
                <EmptyState text={isAr ? "التقرير فارغ." : "This report has no rows."} />
              ) : (
                <ResponsiveTableWrap>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, width: 46 }}>#</th>
                        {/* Keyed by position, not by column key: the coolers sheet lets
                            the branch name its own reading times, and two rounds set to
                            the same time would otherwise collide on one React key. */}
                        {cols.map((c, ci) => (
                          <th key={`${c.key}_${ci}`} style={S.th}>{isAr && c.labelAr ? c.labelAr : c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) =>
                        r.isSection ? (
                          <tr key={i}>
                            <td style={S.sectionCell} colSpan={cols.length + 1}>
                              {r.sectionNo}. {r.section}
                            </td>
                          </tr>
                        ) : (
                          <tr key={i} style={i % 2 ? S.rowAlt : undefined}>
                            <td style={S.tdNum}>{r.letter || i + 1}</td>
                            {cols.map((c, ci) => (
                              <td key={`${c.key}_${ci}`} style={S.td}>
                                {editing && !c.readOnly ? (
                                  <EditCell
                                    column={c}
                                    value={r[c.key]}
                                    onChange={(v) => setCell(i, c.key, v)}
                                  />
                                ) : typeof c.render === "function" ? (
                                  c.render(r[c.key], r)
                                ) : c.kind === "verdict" ? (
                                  <Verdict value={r[c.key]} />
                                ) : (r[c.key] ?? "") === "" ? (
                                  <span style={{ color: "#cbd5e1" }}>—</span>
                                ) : // Dates are stored ISO and read DD/MM/YYYY everywhere else.
                                c.kind === "date" ? (
                                  formatDMY(String(r[c.key]))
                                ) : (
                                  String(r[c.key])
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </ResponsiveTableWrap>
              )}
            </div>
          )}
        </ResponsiveReportLayout>
      </GlassShell>
    </div>
  );
}

/* One cell in edit mode. The control matches the column's kind so a correction
   can only produce a value the input screen could have produced — a verdict
   stays a dropdown of that sheet's own marks, a date stays a date. */
function EditCell({ column, value, onChange }) {
  const v = value ?? "";
  if (column.kind === "verdict") {
    const options = column.options || DEFAULT_VERDICT_OPTIONS;
    return (
      <select value={v} onChange={(e) => onChange(e.target.value)} style={S.editInput}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={column.kind === "date" ? "date" : "text"}
      value={v}
      onChange={(e) => onChange(e.target.value)}
      style={S.editInput}
    />
  );
}

const S = {
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  metaCell: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "9px 13px",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 900,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: ".06em",
  },
  metaValue: { fontSize: 14.5, fontWeight: 800, color: "#0f172a", marginTop: 3 },

  editBanner: {
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#3730a3",
    borderRadius: 10,
    padding: "9px 13px",
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 12,
  },
  editInput: {
    width: "100%",
    minWidth: 70,
    padding: "5px 7px",
    border: "1px solid #c7d2fe",
    borderRadius: 7,
    background: "#fff",
    font: "inherit",
    fontSize: 13,
    textAlign: "center",
  },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    background: "#0f172a",
    color: "#fff",
    padding: "13px 10px",
    fontSize: 12,
    fontWeight: 800,
    textAlign: "center",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #f1f5f9",
    borderRight: "1px solid #f1f5f9",
    textAlign: "center",
    verticalAlign: "middle",
  },
  tdNum: {
    padding: "12px 8px",
    borderBottom: "1px solid #f1f5f9",
    textAlign: "center",
    color: "#94a3b8",
    fontWeight: 800,
  },
  rowAlt: { background: "#fafbfc" },
  sectionCell: {
    background: "#0f172a",
    color: "#fff",
    padding: "10px 12px",
    fontWeight: 900,
    fontSize: 12.5,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  good: {
    display: "inline-block", minWidth: 34, padding: "3px 9px", borderRadius: 6,
    background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 900,
  },
  bad: {
    display: "inline-block", minWidth: 34, padding: "3px 9px", borderRadius: 6,
    background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 900,
  },
};
