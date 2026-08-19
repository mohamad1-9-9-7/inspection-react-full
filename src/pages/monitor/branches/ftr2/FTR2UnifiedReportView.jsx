import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { canDelete } from "../../../../utils/perms";
import { getReportByDate, listReportDateIndex } from "../_shared/branchViewKit";
import "./FTR2UnifiedReportView.css";

const MAX_CELL_LENGTH = 140;

function getId(record) {
  return record?.id || record?._id || record?.payload?.id || record?.payload?._id || "";
}

function parseDate(value) {
  if (!value) return null;
  if (typeof value === "number") return new Date(value);
  const s = String(value).slice(0, 32);
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  if (/^[a-f0-9]{24}$/i.test(String(value))) {
    return new Date(parseInt(String(value).slice(0, 8), 16) * 1000);
  }
  return null;
}

function toYMD(value) {
  const d = parseDate(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getReportDate(record) {
  const p = record?.payload || record || {};
  return (
    toYMD(p.reportDate) ||
    toYMD(p.date) ||
    toYMD(p.inspectionDate) ||
    toYMD(p.checkDate) ||
    toYMD(p.createdAt) ||
    toYMD(record?.created_at) ||
    toYMD(record?.createdAt) ||
    toYMD(record?._id) ||
    "No date"
  );
}

function humanize(key) {
  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function isPrimitive(value) {
  return value === null || value === undefined || ["string", "number", "boolean"].includes(typeof value);
}

function isImageLike(value) {
  const s = String(value || "");
  return /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(s) || /^data:image\//i.test(s);
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function cleanValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  const s = String(value);
  if (s.length > MAX_CELL_LENGTH) return `${s.slice(0, MAX_CELL_LENGTH)}...`;
  return s;
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") return <span className="ftr2-empty-mark">-</span>;
  if (isImageLike(value)) {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer" className="ftr2-file-link">
        Open image
      </a>
    );
  }
  if (isUrl(value)) {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer" className="ftr2-file-link">
        Open file
      </a>
    );
  }
  return cleanValue(value);
}

function pickSummaryFields(payload) {
  const skip = new Set([
    "entries",
    "rows",
    "items",
    "products",
    "materials",
    "coolers",
    "images",
    "attachments",
    "files",
    "payload",
  ]);
  return Object.entries(payload || {})
    .filter(([key, value]) => !skip.has(key) && isPrimitive(value))
    .filter(([, value]) => !(typeof value === "string" && value.length > 500))
    .slice(0, 18);
}

function findTables(payload) {
  const preferred = ["entries", "rows", "coolers", "items", "products", "materials"];
  const out = [];
  const seen = new Set();

  preferred.forEach((key) => {
    if (Array.isArray(payload?.[key]) && payload[key].length) {
      out.push([key, payload[key]]);
      seen.add(key);
    }
  });

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (!seen.has(key) && Array.isArray(value) && value.length && value.some((item) => item && typeof item === "object")) {
      out.push([key, value]);
    }
  });

  return out.slice(0, 5);
}

function columnsForRows(rows) {
  const keys = [];
  rows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => {
      const value = row[key];
      if (isPrimitive(value) || isUrl(value)) {
        if (!keys.includes(key)) keys.push(key);
        return;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.keys(value).forEach((childKey) => {
          if (String(childKey).toLowerCase() === "corrective action") return;
          const childValue = value[childKey];
          const compoundKey = `${key}.${childKey}`;
          if (!keys.includes(compoundKey) && (isPrimitive(childValue) || isUrl(childValue))) {
            keys.push(compoundKey);
          }
        });
      }
    });
  });
  return keys.slice(0, 18);
}

function getCellValue(row, key) {
  if (!String(key).includes(".")) return row?.[key];
  return String(key)
    .split(".")
    .reduce((acc, part) => (acc && Object.prototype.hasOwnProperty.call(acc, part) ? acc[part] : undefined), row);
}

function columnLabel(key) {
  const parts = String(key).split(".");
  if (parts.length === 2 && parts[0] === "temps") return parts[1];
  return humanize(key);
}

function TableBlock({ name, rows }) {
  const columns = columnsForRows(rows);
  if (!columns.length) return null;

  return (
    <section className="ftr2-block">
      <div className="ftr2-block-head">
        <h4>{humanize(name)}</h4>
        <span>{rows.length} row{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="ftr2-table-wrap">
        <table className="ftr2-data-table">
          <thead>
            <tr>
              {columns.map((key) => <th key={key}>{columnLabel(key)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((key) => <td key={key}>{renderValue(getCellValue(row, key))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailsBlock({ payload }) {
  const nested = Object.entries(payload || {})
    .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
    .filter(([key]) => !["payload"].includes(key))
    .slice(0, 6);

  if (!nested.length) return null;

  return (
    <section className="ftr2-block">
      <div className="ftr2-block-head">
        <h4>Additional details</h4>
      </div>
      <div className="ftr2-nested-grid">
        {nested.map(([key, value]) => {
          const pairs = Object.entries(value || {}).filter(([, v]) => isPrimitive(v)).slice(0, 8);
          if (!pairs.length) return null;
          return (
            <div className="ftr2-nested-card" key={key}>
              <strong>{humanize(key)}</strong>
              {pairs.map(([childKey, childValue]) => (
                <div key={childKey}>
                  <span>{humanize(childKey)}</span>
                  <b>{renderValue(childValue)}</b>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildTree(reports) {
  const tree = {};
  reports.forEach((record) => {
    const date = getReportDate(record);
    const [year = "No date", month = ""] = date.split("-");
    const monthKey = month ? `${year}-${month}` : "No date";
    if (!tree[year]) tree[year] = {};
    if (!tree[year][monthKey]) tree[year][monthKey] = [];
    tree[year][monthKey].push(record);
  });
  Object.values(tree).forEach((months) => {
    Object.values(months).forEach((items) => {
      items.sort((a, b) => getReportDate(b).localeCompare(getReportDate(a)));
    });
  });
  return tree;
}

function monthLabel(monthKey) {
  if (monthKey === "No date") return "No date";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default function FTR2UnifiedReportView({
  type,
  title,
  documentTitle,
  accent = "#0f766e",
}) {
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  async function loadSelectedReport(reportDate) {
    if (!reportDate) {
      setSelectedReport(null);
      return;
    }
    setSelectedReport(await getReportByDate(type, reportDate));
  }

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const list = await listReportDateIndex(type);
      setReports(list);
      const firstDate = list[0]?.reportDate || "";
      setSelectedId(firstDate);
      await loadSelectedReport(firstDate);
    } catch (e) {
      setMessage(`Unable to load reports: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [type]);

  const payload = selectedReport?.payload || {};
  const summary = pickSummaryFields(payload);
  const tables = findTables(payload);
  const tree = useMemo(() => buildTree(reports), [reports]);
  const selectedDate = selectedReport ? getReportDate(selectedReport) : "";

  function exportJson() {
    const data = selectedReport || { type, items: reports };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type}_${selectedDate || "reports"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportCsv() {
    if (!selectedReport) return;
    const firstTable = tables[0];
    const rows = firstTable?.[1] || [payload];
    const columns = firstTable ? columnsForRows(rows) : pickSummaryFields(payload).map(([key]) => key);
    const csvRows = [
      columns.map(columnLabel),
      ...rows.map((row) => columns.map((key) => cleanValue(getCellValue(row, key)))),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type}_${selectedDate || "report"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function deleteSelected() {
    if (!selectedReport) return;
    const id = getId(selectedReport);
    if (!id) {
      setMessage("This record has no server id.");
      return;
    }
    if (!window.confirm(`Delete ${title} report for ${selectedDate}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage("Report deleted.");
      await load();
    } catch (e) {
      setMessage(`Delete failed: ${e?.message || e}`);
    }
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const queue = Array.isArray(parsed?.items)
        ? parsed.items
        : Array.isArray(parsed)
        ? parsed
        : [parsed?.payload ? parsed.payload : parsed];
      let ok = 0;
      for (const item of queue) {
        const payloadToSave = item?.payload || item;
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reporter: "admin", type, payload: payloadToSave }),
        });
        if (res.ok) ok += 1;
      }
      setMessage(`Imported ${ok} report(s).`);
      await load();
    } catch (e) {
      setMessage(`Import failed: ${e?.message || e}`);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="ftr2-report-view" style={{ "--ftr2-accent": accent }}>
      <aside className="ftr2-report-rail">
        <div className="ftr2-rail-head">
          <span>FTR 2</span>
          <h3>{title}</h3>
          <p>{reports.length} saved report{reports.length === 1 ? "" : "s"}</p>
        </div>

        <button className="ftr2-refresh" type="button" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh list"}
        </button>

        <div className="ftr2-date-tree">
          {loading && reports.length === 0 ? (
            <div className="ftr2-empty">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="ftr2-empty">No reports saved yet.</div>
          ) : (
            Object.entries(tree)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([year, months]) => (
                <details key={year} className="ftr2-tree-year">
                  <summary>
                    <span>{year}</span>
                    <b>{Object.values(months).reduce((sum, items) => sum + items.length, 0)}</b>
                  </summary>
                  {Object.entries(months)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([month, items]) => (
                      <details key={month} className="ftr2-tree-month">
                        <summary>
                          <span>{monthLabel(month)}</span>
                          <b>{items.length}</b>
                        </summary>
                        <div className="ftr2-tree-list">
                          {items.map((record) => {
                            const reportDate = getReportDate(record);
                            const active = reportDate === selectedId;
                            return (
                              <button
                                key={record.id || `${reportDate}-${items.indexOf(record)}`}
                                type="button"
                                className={active ? "active" : ""}
                                onClick={() => {
                                  setSelectedId(reportDate);
                                  loadSelectedReport(reportDate);
                                }}
                              >
                                <span>{reportDate}</span>
                                <small>Saved report</small>
                              </button>
                            );
                          })}
                        </div>
                      </details>
                    ))}
                </details>
              ))
          )}
        </div>
      </aside>

      <main className="ftr2-report-main">
        <div className="ftr2-report-card">
          <header className="ftr2-report-head">
            <div>
              <span className="ftr2-eyebrow">Report viewer</span>
              <h3>{documentTitle || title}</h3>
              <p>Unified view, consistent date tree, export tools, and clean data tables.</p>
            </div>
            <div className="ftr2-report-actions">
              <button type="button" onClick={exportCsv} disabled={!selectedReport}>CSV</button>
              <button type="button" onClick={exportJson} disabled={!selectedReport}>JSON</button>
              <button type="button" onClick={() => fileInputRef.current?.click()}>Import</button>
              {canDelete("daily") && (
                <button type="button" className="danger" onClick={deleteSelected} disabled={!selectedReport} data-delete-action="true">
                  Delete
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={importJson} />
            </div>
          </header>

          {message && <div className="ftr2-message">{message}</div>}

          {!selectedReport ? (
            <div className="ftr2-select-empty">
              <strong>Select a saved report</strong>
              <span>Choose a date from the unified tree to review report details.</span>
            </div>
          ) : (
            <>
              <section className="ftr2-doc-strip">
                <div>
                  <span>Document</span>
                  <strong>{payload.documentNo || payload.docNo || "-"}</strong>
                </div>
                <div>
                  <span>Report date</span>
                  <strong>{selectedDate}</strong>
                </div>
                <div>
                  <span>Branch</span>
                  <strong>{payload.branch || "FTR 2"}</strong>
                </div>
                <div>
                  <span>Verified by</span>
                  <strong>{payload.verifiedBy || payload.checkedBy || "-"}</strong>
                </div>
              </section>

              {summary.length > 0 && (
                <section className="ftr2-summary-grid">
                  {summary.map(([key, value]) => (
                    <div key={key}>
                      <span>{humanize(key)}</span>
                      <strong>{renderValue(value)}</strong>
                    </div>
                  ))}
                </section>
              )}

              {tables.map(([name, rows]) => <TableBlock key={name} name={name} rows={rows} />)}
              <DetailsBlock payload={payload} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
