// src/pages/monitor/branches/pos6/POS6ReportView.jsx
//
// One viewer driving all five POS 6 sheets, because they differ only in their
// columns — a per-report copy would be the same 200 lines five times over.
// Reads through useReportIndex, so the date tree costs a metadata index and a
// record only loads when its date is clicked.

import React from "react";
import useReportIndex from "../_shared/useReportIndex";
import {
  DateTreeSidebar,
  EmptyState,
  GlassShell,
  ResponsiveReportLayout,
  ResponsiveTableWrap,
  formatDMY,
} from "../_shared/branchViewKit";
import { payloadOf } from "../_shared/reportApi";
import { useLang } from "./pos6I18n";

/* Values a sheet stores that should read as pass / fail rather than plain text. */
const GOOD = new Set(["C", "Yes", "√"]);
const BAD = new Set(["NC", "No", "✗"]);

function Verdict({ value }) {
  const v = String(value ?? "").trim();
  if (!v) return <span style={{ color: "#cbd5e1" }}>—</span>;
  if (GOOD.has(v)) return <span style={S.good}>{v}</span>;
  if (BAD.has(v)) return <span style={S.bad}>{v}</span>;
  return <>{v}</>;
}

/**
 * @param {string}  type     report type on the server
 * @param {string}  title    heading (English)
 * @param {string}  titleAr  heading (Arabic)
 * @param {string}  icon     emoji for the shell
 * @param {Array}   columns  [{ key, label, labelAr, kind }] — kind "verdict" renders C/NC chips
 * @param {function} [columnsOf] payload → columns, for sheets whose shape the branch chooses
 * @param {function} [rows]  payload → array of row objects (defaults to payload.entries)
 * @param {function} [meta]  payload → [{ label, value }] shown above the table
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
}) {
  const { isAr, dir } = useLang();
  const { treeItems, selected, selectedKey, loading, opening, open, rowForKey } =
    useReportIndex(type);

  const payload = selected ? payloadOf(selected) : null;
  const rows = payload ? rowsOf(payload) : [];
  const cols = payload && columnsOf ? columnsOf(payload) : columns;
  const metaRows = payload && metaOf ? metaOf(payload) : [];

  return (
    <div dir={dir}>
      <GlassShell icon={icon} title={isAr ? titleAr : title}>
        <ResponsiveReportLayout
          sidebar={
            <DateTreeSidebar
              items={treeItems}
              activeKey={selectedKey}
              loading={loading}
              onPick={(item) => open(rowForKey(item.key) || item.row)}
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
            <>
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
                        {cols.map((c) => (
                          <th key={c.key} style={S.th}>{isAr && c.labelAr ? c.labelAr : c.label}</th>
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
                            {cols.map((c) => (
                              <td key={c.key} style={S.td}>
                                {c.kind === "verdict"
                                  ? <Verdict value={r[c.key]} />
                                  : (r[c.key] ?? "") === "" ? <span style={{ color: "#cbd5e1" }}>—</span> : String(r[c.key])}
                              </td>
                            ))}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </ResponsiveTableWrap>
              )}
            </>
          )}
        </ResponsiveReportLayout>
      </GlassShell>
    </div>
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
