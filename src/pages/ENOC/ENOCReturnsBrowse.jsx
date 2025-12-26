// D:\inspection-react-full\src\pages\ENOC\ENOCReturnsBrowse.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ========= API BASE ========= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
let fromVite;
try {
  fromVite =
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL);
} catch {
  fromVite = undefined;
}
const fromCRA = process.env?.REACT_APP_API_URL;
export const API_BASE = String(fromVite || fromCRA || API_ROOT_DEFAULT).replace(
  /\/$/,
  ""
);

const TYPE = "enoc_returns";

/* ========= ENOC options (match input) ========= */
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Condemnation / Cooking",
  "Use in kitchen",
  "Send to market",
  "Disposed",
  "Separated expired shelf",
  "Other...",
];

const QTY_TYPES = ["KG", "PCS", "Other"];

/* ========= Helpers ========= */
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}
function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}
function toYMD(v) {
  if (!v) return "";
  if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
function fmt2(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}
function parseQty(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function extractItemCode(productName) {
  const s = String(productName || "");
  const m = s.match(/^\s*\[(\d+)\]/);
  return m ? m[1] : "";
}
function extractProductName(productName) {
  const s = String(productName || "");
  return s.replace(/^\s*\[\d+\]\s*/, "").trim();
}
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/* Try multiple list endpoints */
async function fetchReportsList() {
  const tries = [
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
    `${API_BASE}/api/reports?reportType=${encodeURIComponent(TYPE)}`,
    `${API_BASE}/api/reports/${encodeURIComponent(TYPE)}`,
  ];

  let lastErr = null;
  for (const url of tries) {
    try {
      const data = await jsonFetch(url);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data?.reports)) return data.reports;
      if (Array.isArray(data?.data)) return data.data;
      if (data && typeof data === "object") return [];
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to load reports.");
}

async function fetchReportById(id) {
  const tries = [
    `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
    `${API_BASE}/api/reports?id=${encodeURIComponent(id)}`,
  ];

  let lastErr = null;
  for (const url of tries) {
    try {
      const data = await jsonFetch(url);
      return data?.item || data?.report || data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to load report.");
}

/* Update report (PUT/PATCH tries) */
async function updateReportById(id, body) {
  const tries = [
    { method: "PUT", url: `${API_BASE}/api/reports/${encodeURIComponent(id)}` },
    {
      method: "PATCH",
      url: `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
    },
    { method: "PUT", url: `${API_BASE}/api/reports?id=${encodeURIComponent(id)}` },
    {
      method: "PATCH",
      url: `${API_BASE}/api/reports?id=${encodeURIComponent(id)}`,
    },
  ];

  let lastErr = null;
  for (const t of tries) {
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Update failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Update failed.");
}

/* Delete report */
async function deleteReportById(id) {
  const tries = [
    `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
    `${API_BASE}/api/reports?id=${encodeURIComponent(id)}`,
  ];
  let lastErr = null;
  for (const url of tries) {
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error || data?.message || `Delete failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Delete failed.");
}

/* ================= Date Tree ================= */
function buildDateTree(reports) {
  const tree = {};
  for (const r of safeArray(reports)) {
    const payload = r?.payload || {};
    const ymd = toYMD(payload?.reportDate || r?.reportDate);
    if (!ymd) continue;
    const [Y, M, D] = ymd.split("-");
    if (!tree[Y]) tree[Y] = {};
    if (!tree[Y][M]) tree[Y][M] = {};
    if (!tree[Y][M][D]) tree[Y][M][D] = { count: 0 };
    tree[Y][M][D].count += 1;
  }

  const years = Object.keys(tree).sort((a, b) => Number(b) - Number(a));
  return years.map((Y) => {
    const months = Object.keys(tree[Y]).sort((a, b) => Number(b) - Number(a));
    return {
      Y,
      months: months.map((M) => {
        const days = Object.keys(tree[Y][M]).sort(
          (a, b) => Number(b) - Number(a)
        );
        return {
          M,
          days: days.map((D) => ({ D, count: tree[Y][M][D].count })),
        };
      }),
    };
  });
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function locationText(it) {
  const loc =
    it?.butchery === "Other site..."
      ? it?.customButchery || "Other"
      : it?.butchery || "";
  return loc;
}

/* ================= Page ================= */
export default function ENOCReturnsBrowse() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState("");

  const [reports, setReports] = useState([]);

  // date filter
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // selected day
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  // tree expand
  const [openYears, setOpenYears] = useState(() => new Set());
  const [openMonths, setOpenMonths] = useState(() => new Set()); // "YYYY-MM"

  // edit report
  const [editMode, setEditMode] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState("");

  const reportsRef = useRef([]);
  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchReportsList();
      const filtered = safeArray(list).filter((r) => {
        const t = r?.type || r?.reportType;
        return t ? t === TYPE : true;
      });

      filtered.sort((a, b) => {
        const da = new Date(a?.createdAt || a?.payload?.reportDate || 0).getTime();
        const db = new Date(b?.createdAt || b?.payload?.reportDate || 0).getTime();
        return db - da;
      });

      setReports(filtered);

      // auto select latest day
      const tree = buildDateTree(filtered);
      if (tree.length) {
        const y = tree[0].Y;
        const m = tree[0]?.months?.[0]?.M;
        const d = tree[0]?.months?.[0]?.days?.[0]?.D;

        setOpenYears(new Set([y]));
        if (m) setOpenMonths(new Set([`${y}-${m}`]));

        if (m && d) {
          const ymd = `${y}-${m}-${d}`;
          await selectDay(ymd, filtered);
        }
      } else {
        setSelectedDate("");
        setSelectedReport(null);
        setEditMode(false);
        setDraftItems([]);
      }
    } catch (e) {
      setError(String(e?.message || e));
      setReports([]);
      setSelectedDate("");
      setSelectedReport(null);
      setEditMode(false);
      setDraftItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleReports = useMemo(() => {
    const f = from ? new Date(from).getTime() : null;
    const t = to ? new Date(to).getTime() : null;

    return safeArray(reports).filter((r) => {
      const payload = r?.payload || {};
      const ymd = toYMD(payload?.reportDate || r?.reportDate);
      if (!ymd) return false;
      const dt = new Date(ymd).getTime();
      if (f && dt < f) return false;
      if (t && dt > t) return false;
      return true;
    });
  }, [reports, from, to]);

  const dateTree = useMemo(() => buildDateTree(visibleReports), [visibleReports]);

  const metrics = useMemo(() => {
    const all = visibleReports;
    let totalItems = 0;
    let totalQty = 0;

    const actionCount = new Map();

    for (const r of all) {
      const items = safeArray(r?.payload?.items);
      totalItems += items.length;

      for (const it of items) {
        totalQty += parseQty(it?.quantity);
        const action =
          it?.action === "Other..." ? it?.customAction || "Other" : it?.action || "";
        if (action) actionCount.set(action, (actionCount.get(action) || 0) + 1);
      }
    }

    const topActions = Array.from(actionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { totalReports: all.length, totalItems, totalQty, topActions };
  }, [visibleReports]);

  const toggleYear = (Y) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(Y)) next.delete(Y);
      else next.add(Y);
      return next;
    });
  };

  const toggleMonth = (Y, M) => {
    const key = `${Y}-${M}`;
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function selectDay(ymd, sourceList = null) {
    const list = sourceList || reportsRef.current || [];
    setSelectedDate(ymd);
    setLoadingDay(true);
    setError("");
    setEditMode(false);

    try {
      const candidates = safeArray(list).filter((r) => {
        const payload = r?.payload || {};
        return toYMD(payload?.reportDate || r?.reportDate) === ymd;
      });

      if (!candidates.length) {
        setSelectedReport(null);
        setDraftItems([]);
        return;
      }

      candidates.sort((a, b) => {
        const da = new Date(a?.createdAt || 0).getTime();
        const db = new Date(b?.createdAt || 0).getTime();
        return db - da;
      });

      let chosen = candidates[0];

      if (!Array.isArray(chosen?.payload?.items)) {
        const id = getId(chosen);
        if (!id) throw new Error("Missing report id.");
        chosen = await fetchReportById(id);
      }

      setSelectedReport(chosen);

      const items = safeArray(chosen?.payload?.items);
      setDraftItems(deepClone(items));
    } catch (e) {
      setError(String(e?.message || e));
      setSelectedReport(null);
      setDraftItems([]);
    } finally {
      setLoadingDay(false);
    }
  }

  const dayItems = useMemo(() => safeArray(selectedReport?.payload?.items), [selectedReport]);
  const uiItems = editMode ? safeArray(draftItems) : dayItems;

  // ✅ Group by BOX CODE => each box shown separately
  const boxGroups = useMemo(() => {
    const items = uiItems;
    const map = new Map();
    const order = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const code = String(it?.boxCode || "").trim();
      const key = code ? `BOX:${code}` : `NOBOX:${i}`;

      if (!map.has(key)) {
        const g = {
          key,
          boxCode: code,
          boxName: String(it?.boxName || "").trim(),
          boxQty: it?.boxQty ?? "",
          location: locationText(it),
          items: [],
          idxs: [],
        };
        map.set(key, g);
        order.push(key);
      }

      const g = map.get(key);
      if (!g.boxName && it?.boxName) g.boxName = String(it.boxName).trim();
      if ((g.boxQty === "" || g.boxQty == null) && (it?.boxQty !== "" && it?.boxQty != null))
        g.boxQty = it.boxQty;
      if (!g.location && locationText(it)) g.location = locationText(it);

      g.items.push(it);
      g.idxs.push(i);
    }

    return order.map((k, idx) => ({ ...map.get(k), boxNo: idx + 1 }));
  }, [uiItems]);

  const dayQty = useMemo(() => {
    let q = 0;
    for (const it of uiItems) q += parseQty(it?.quantity);
    return q;
  }, [uiItems]);

  const showWarning = metrics.totalQty >= 10000;

  const exportAllJson = () => {
    downloadJson(`ENOC_RETURNS_ALL_${toYMD(new Date().toISOString())}.json`, {
      type: TYPE,
      exportedAt: new Date().toISOString(),
      reports: visibleReports,
    });
  };

  const exportDayJson = () => {
    if (!selectedDate || !selectedReport) return;
    downloadJson(`ENOC_RETURNS_${selectedDate}.json`, {
      type: TYPE,
      reportDate: selectedDate,
      report: selectedReport,
    });
  };

  const clearFilters = () => {
    setFrom("");
    setTo("");
  };

  /* ===== Edit handlers ===== */
  const startEdit = () => {
    if (!selectedReport) return;
    setDraftItems(deepClone(dayItems));
    setEditMode(true);
    showToast("Edit mode enabled.");
  };

  const cancelEdit = () => {
    setDraftItems(deepClone(dayItems));
    setEditMode(false);
    showToast("Changes discarded.");
  };

  const updateDraftItem = (globalIndex, field, value) => {
    setDraftItems((prev) => {
      const next = safeArray(prev).slice();
      const cur = next[globalIndex] || {};
      const updated = { ...cur, [field]: value };

      if (field === "action" && value !== "Other...") updated.customAction = "";
      if (field === "qtyType" && value !== "Other") updated.customQtyType = "";

      next[globalIndex] = updated;
      return next;
    });
  };

  const deleteDraftRow = (globalIndex) => {
    setDraftItems((prev) => {
      const next = safeArray(prev).slice();
      next.splice(globalIndex, 1);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!selectedReport) return;
    const id = getId(selectedReport);
    if (!id) {
      showToast("Missing report id.");
      return;
    }

    const ok = window.confirm("Save changes to this day report?");
    if (!ok) return;

    try {
      setSavingEdit(true);
      setError("");

      const payload = selectedReport?.payload || {};
      const reportDate = payload?.reportDate || selectedDate || "";

      const items = safeArray(draftItems).map((r) => ({
        ...r,
        boxCode: String(r?.boxCode || "").trim(),
        boxName: String(r?.boxName || "").trim(),
        boxQty: r?.boxQty === "" || r?.boxQty == null ? "" : Number(r.boxQty),
        productName: String(r?.productName || "").trim(),
        butchery: String(r?.butchery || "").trim(),
        customButchery: String(r?.customButchery || "").trim(),
        quantity:
          r?.quantity === "" || r?.quantity == null
            ? ""
            : Number.isFinite(Number(r.quantity))
            ? Number(r.quantity)
            : "",
        qtyType: String(r?.qtyType || "").trim(),
        customQtyType: String(r?.customQtyType || "").trim(),
        expiry: String(r?.expiry || "").trim(),
        remarks: String(r?.remarks || "").trim(),
        action: String(r?.action || "").trim(),
        customAction: String(r?.customAction || "").trim(),
        images: Array.isArray(r?.images) ? r.images : [],
      }));

      const body = {
        type: TYPE,
        payload: {
          ...(payload || {}),
          reportDate,
          items,
        },
      };

      await updateReportById(id, body);

      setEditMode(false);
      showToast("Saved successfully.");
      await load();
      if (selectedDate) await selectDay(selectedDate, reportsRef.current);
    } catch (e) {
      setError(String(e?.message || e));
      showToast("Save failed.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteDayReport = async () => {
    if (!selectedReport) return;
    const id = getId(selectedReport);
    if (!id) {
      showToast("Missing report id.");
      return;
    }

    const ok = window.confirm(`Delete this day report (${selectedDate}) permanently?`);
    if (!ok) return;

    try {
      setError("");
      await deleteReportById(id);
      showToast("Report deleted.");

      setSelectedReport(null);
      setSelectedDate("");
      setEditMode(false);
      setDraftItems([]);

      await load();
    } catch (e) {
      setError(String(e?.message || e));
      showToast("Delete failed.");
    }
  };

  return (
    <div style={pageWrap}>
      <div style={pageHeader}>
        <div style={pageTitle}>📋 ENOC Returns Reports</div>

        <div style={headerBtns}>
          <button style={btnGreen} onClick={() => navigate("/enoc-returns/input")}>
            ➕ New Report
          </button>
          <button style={btnBlue} onClick={exportAllJson}>
            ⬇ Export JSON (all)
          </button>
          <button style={btnGhost} onClick={() => navigate("/returns/menu")}>
            ⬅ Back
          </button>
        </div>
      </div>

      <div style={kpiGrid}>
        <div style={kpiCard}>
          <div style={kpiLabel}>Total Reports</div>
          <div style={kpiValue}>{metrics.totalReports}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>Total Items</div>
          <div style={kpiValue}>{metrics.totalItems}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>Total Quantity</div>
          <div style={kpiValue}>{fmt2(metrics.totalQty)}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>Top Actions</div>
          <div style={{ marginTop: 8 }}>
            {metrics.topActions.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 800 }}>—</div>
            ) : (
              metrics.topActions.map(([name, count]) => (
                <div key={name} style={topRow}>
                  <span style={{ fontWeight: 900 }}>{name}</span>
                  <span style={{ fontWeight: 900 }}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showWarning && <div style={warnBar}>⚠ The total quantity of returns is very high!</div>}

      <div style={filterBar}>
        <div style={{ fontWeight: 900, color: "#111827" }}>Filter by report date:</div>

        <div style={filterRow}>
          <label style={lbl}>
            From:
            <input type="date" style={dateInp} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>

          <label style={lbl}>
            To:
            <input type="date" style={dateInp} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          <button style={btn} onClick={clearFilters}>
            Clear
          </button>

          <button style={btn} onClick={load} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {toast && <div style={toastBox}>{toast}</div>}
      {error && <div style={errBox}>❌ {error}</div>}

      <div style={mainGrid}>
        <div style={treeCard}>
          <div style={treeHead}>
            <div style={{ fontWeight: 900 }}>📅 Date Tree</div>
            <div style={{ color: "#64748b", fontWeight: 900 }}>
              {visibleReports.length} report(s)
            </div>
          </div>

          <div style={treeScroll}>
            {loading ? (
              <div style={muted}>Loading…</div>
            ) : dateTree.length === 0 ? (
              <div style={muted}>No reports found.</div>
            ) : (
              dateTree.map((y) => {
                const yOpen = openYears.has(y.Y);
                return (
                  <div key={y.Y} style={treeBlock}>
                    <button style={treeYearBtn(yOpen)} onClick={() => toggleYear(y.Y)}>
                      <span>{yOpen ? "▼" : "▶"}</span>
                      <span style={{ fontWeight: 900 }}>Year {y.Y}</span>
                    </button>

                    {yOpen &&
                      y.months.map((m) => {
                        const mk = `${y.Y}-${m.M}`;
                        const mOpen = openMonths.has(mk);
                        return (
                          <div key={mk} style={treeMonthWrap}>
                            <button style={treeMonthBtn(mOpen)} onClick={() => toggleMonth(y.Y, m.M)}>
                              <span>{mOpen ? "▼" : "▶"}</span>
                              <span style={{ fontWeight: 900 }}>Month {m.M}</span>
                              <span style={{ fontWeight: 900, opacity: mOpen ? 1 : 0.7 }}>
                                {m.days.length} day(s)
                              </span>
                            </button>

                            {mOpen && (
                              <div style={treeDaysList}>
                                {m.days.map((d) => {
                                  const ymd = `${y.Y}-${m.M}-${d.D}`;
                                  const active = selectedDate === ymd;
                                  return (
                                    <button
                                      key={ymd}
                                      style={treeDayBtn(active)}
                                      onClick={() => selectDay(ymd)}
                                      title={`Reports: ${d.count}`}
                                    >
                                      <span style={{ fontWeight: 900 }}>{ymd}</span>
                                      <span style={{ fontWeight: 900 }}>{d.count}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={detailsCard}>
          <div style={detailsTopBar}>
            <div>
              <div style={detailsTitle}>
                ⛽ ENOC Returns Register {selectedDate ? `— ${selectedDate}` : ""}
              </div>
              <div style={detailsSub}>
                {selectedDate ? (
                  <>
                    Boxes: <b>{boxGroups.length}</b> | Items: <b>{uiItems.length}</b> | Day Qty:{" "}
                    <b>{fmt2(dayQty)}</b>
                    {editMode && <span style={editPill}>EDIT MODE</span>}
                  </>
                ) : (
                  <span style={{ color: "#64748b" }}>Select a date from the left tree.</span>
                )}
              </div>
            </div>

            <div style={detailsBtns}>
              <button style={btnBlue} onClick={exportDayJson} disabled={!selectedDate || !selectedReport}>
                ⬇ Export JSON (day)
              </button>

              {!editMode ? (
                <button style={btnPurple} onClick={startEdit} disabled={!selectedReport}>
                  ✏️ Edit This Day Report
                </button>
              ) : (
                <>
                  <button style={btnSave} onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? "Saving..." : "💾 Save Changes"}
                  </button>
                  <button style={btn} onClick={cancelEdit} disabled={savingEdit}>
                    Cancel
                  </button>
                </>
              )}

              <button style={btnRed} onClick={deleteDayReport} disabled={!selectedReport || savingEdit}>
                🗑 Delete This Day Report
              </button>
            </div>
          </div>

          {loadingDay ? (
            <div style={bigMsg}>Loading day report…</div>
          ) : !selectedDate ? (
            <div style={bigMsg}>Select a date from the left tree to display boxes automatically.</div>
          ) : boxGroups.length === 0 ? (
            <div style={bigMsg}>No items for this day.</div>
          ) : (
            <div style={boxesWrap}>
              {boxGroups.map((g) => {
                const title = g.boxCode ? `${g.boxCode} — ${g.boxName || "BOX"}` : `Manual Item (No Box)`;
                return (
                  <div key={g.key} style={boxCard}>
                    <div style={boxHeader}>
                      <div style={boxHeaderLeft}>
                        <div style={boxTitle}>
                          <span style={boxNoPill}>Box {g.boxNo}</span>
                          <span style={{ fontWeight: 900 }}>{title}</span>
                        </div>
                        <div style={boxMeta}>
                          <span>
                            <b>Box Qty:</b>{" "}
                            {g.boxQty !== "" && g.boxQty != null ? g.boxQty : "—"}
                          </span>
                          <span style={dot}>•</span>
                          <span>
                            <b>Location:</b> {g.location || "—"}
                          </span>
                          <span style={dot}>•</span>
                          <span>
                            <b>Items:</b> {g.items.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={boxTableWrap}>
                      <table style={boxTable}>
                        <thead>
                          <tr>
                            <th style={th}>SL.NO</th>
                            <th style={th}>ITEM CODE</th>
                            <th style={th}>PRODUCT</th>
                            <th style={th}>QUANTITY</th>
                            <th style={th}>QTY TYPE</th>
                            <th style={th}>EXPIRY</th>
                            <th style={th}>REMARKS</th>
                            <th style={th}>ACTION</th>
                            <th style={th}>IMAGES</th>
                            {editMode && <th style={th}>ROW</th>}
                          </tr>
                        </thead>

                        <tbody>
                          {g.items.map((it, i) => {
                            const globalIndex = g.idxs[i];
                            const code = extractItemCode(it?.productName);
                            const pname =
                              extractProductName(it?.productName || "") ||
                              it?.productName ||
                              "—";

                            const qtyType =
                              it?.qtyType === "Other"
                                ? it?.customQtyType || "Other"
                                : it?.qtyType || "";

                            const action =
                              it?.action === "Other..."
                                ? it?.customAction || "Other"
                                : it?.action || "";

                            const imgs = safeArray(it?.images);

                            return (
                              <tr
                                key={`${g.key}-${i}`}
                                style={{ background: i % 2 ? "#fbfbff" : "#fff" }}
                              >
                                <td style={td}>{i + 1}</td>
                                <td style={tdMono}>{code || "—"}</td>

                                <td style={tdLeft}>
                                  <div style={pill}>{pname}</div>
                                </td>

                                <td style={td}>
                                  {!editMode ? (
                                    it?.quantity ?? "—"
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      style={inpCell}
                                      value={it?.quantity ?? ""}
                                      onChange={(e) =>
                                        updateDraftItem(
                                          globalIndex,
                                          "quantity",
                                          e.target.value
                                        )
                                      }
                                    />
                                  )}
                                </td>

                                <td style={td}>
                                  {!editMode ? (
                                    qtyType || "—"
                                  ) : (
                                    <>
                                      <select
                                        style={inpCell}
                                        value={it?.qtyType || "PCS"}
                                        onChange={(e) =>
                                          updateDraftItem(
                                            globalIndex,
                                            "qtyType",
                                            e.target.value
                                          )
                                        }
                                      >
                                        {QTY_TYPES.map((q) => (
                                          <option key={q} value={q}>
                                            {q}
                                          </option>
                                        ))}
                                      </select>

                                      {it?.qtyType === "Other" && (
                                        <input
                                          style={{ ...inpCell, marginTop: 6 }}
                                          placeholder="Enter type"
                                          value={it?.customQtyType || ""}
                                          onChange={(e) =>
                                            updateDraftItem(
                                              globalIndex,
                                              "customQtyType",
                                              e.target.value
                                            )
                                          }
                                        />
                                      )}
                                    </>
                                  )}
                                </td>

                                <td style={td}>
                                  {!editMode ? (
                                    it?.expiry || "—"
                                  ) : (
                                    <input
                                      type="date"
                                      style={inpCell}
                                      value={it?.expiry || ""}
                                      onChange={(e) =>
                                        updateDraftItem(
                                          globalIndex,
                                          "expiry",
                                          e.target.value
                                        )
                                      }
                                    />
                                  )}
                                </td>

                                {/* ✅ FIXED: correct closing tag */}
                                <td style={tdLeft}>
                                  {!editMode ? (
                                    it?.remarks || "—"
                                  ) : (
                                    <input
                                      style={inpCell}
                                      value={it?.remarks || ""}
                                      onChange={(e) =>
                                        updateDraftItem(
                                          globalIndex,
                                          "remarks",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Remarks"
                                    />
                                  )}
                                </td>

                                <td style={td}>
                                  {!editMode ? (
                                    action || "—"
                                  ) : (
                                    <>
                                      <select
                                        style={inpCell}
                                        value={it?.action || ""}
                                        onChange={(e) =>
                                          updateDraftItem(
                                            globalIndex,
                                            "action",
                                            e.target.value
                                          )
                                        }
                                      >
                                        <option value="">Select action</option>
                                        {ACTIONS.map((a) => (
                                          <option key={a} value={a}>
                                            {a}
                                          </option>
                                        ))}
                                      </select>

                                      {it?.action === "Other..." && (
                                        <input
                                          style={{ ...inpCell, marginTop: 6 }}
                                          placeholder="Enter custom action"
                                          value={it?.customAction || ""}
                                          onChange={(e) =>
                                            updateDraftItem(
                                              globalIndex,
                                              "customAction",
                                              e.target.value
                                            )
                                          }
                                        />
                                      )}
                                    </>
                                  )}
                                </td>

                                <td style={td}>
                                  {imgs.length === 0 ? (
                                    <span style={{ color: "#64748b", fontWeight: 900 }}>
                                      Images (0)
                                    </span>
                                  ) : (
                                    <div style={imgsCell}>
                                      <span style={imgBadge}>Images ({imgs.length})</span>
                                      <div style={imgGrid}>
                                        {imgs.slice(0, 4).map((src, k) => (
                                          <a
                                            key={k}
                                            href={src}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Open image"
                                            style={imgLink}
                                          >
                                            <img
                                              src={src}
                                              alt={`img-${k}`}
                                              style={imgThumb}
                                            />
                                          </a>
                                        ))}
                                        {imgs.length > 4 && (
                                          <div style={moreImgs}>+{imgs.length - 4}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {editMode && (
                                  <td style={td}>
                                    <button
                                      style={btnRowDel}
                                      onClick={() => {
                                        const ok = window.confirm("Delete this row?");
                                        if (ok) deleteDraftRow(globalIndex);
                                      }}
                                      title="Delete row"
                                    >
                                      ✖
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const pageWrap = {
  fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  padding: 16,
  background: "#f4f6fa",
  minHeight: "100vh",
  width: "100%",
  overflowX: "hidden",
  boxSizing: "border-box",
  direction: "ltr",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const pageTitle = { fontWeight: 900, color: "#512e5f", fontSize: 18, letterSpacing: 0.2 };
const headerBtns = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" };

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 10,
};

const kpiCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
  textAlign: "center",
};

const kpiLabel = { fontWeight: 900, color: "#111827", fontSize: 13 };
const kpiValue = { marginTop: 6, fontWeight: 900, color: "#111827", fontSize: 22 };

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "2px 0",
  color: "#111827",
};

const warnBar = {
  marginTop: 8,
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontWeight: 900,
  textAlign: "center",
};

const filterBar = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const filterRow = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };

const lbl = { display: "flex", gap: 8, alignItems: "center", fontWeight: 900, color: "#334155" };

const dateInp = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1.5px solid #c7a8dc",
  background: "#fcf6ff",
  fontWeight: 900,
};

const toastBox = {
  background: "#ecfeff",
  border: "1px solid #67e8f9",
  color: "#0e7490",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: 12,
  textAlign: "center",
};

const errBox = {
  background: "#ffebee",
  border: "1px solid #ffcdd2",
  color: "#b71c1c",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 900,
  marginBottom: 12,
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gap: 12,
  alignItems: "start",
};

const treeCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 10,
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
  overflow: "hidden",
};

const treeHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "10px 10px",
  background: "#f1f5f9",
  borderRadius: 12,
  fontWeight: 900,
};

const treeScroll = { marginTop: 10, maxHeight: "75vh", overflow: "auto", paddingRight: 2 };
const treeBlock = { marginBottom: 10 };

const treeYearBtn = (open) => ({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  border: "none",
  borderRadius: 12,
  padding: "10px 10px",
  cursor: "pointer",
  fontWeight: 900,
  background: open ? "#111827" : "#e8daef",
  color: open ? "#fff" : "#512e5f",
});

const treeMonthWrap = { marginTop: 8, marginLeft: 8 };

const treeMonthBtn = (open) => ({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  border: "none",
  borderRadius: 12,
  padding: "9px 10px",
  cursor: "pointer",
  fontWeight: 900,
  background: open ? "#2563eb" : "#f3e8ff",
  color: open ? "#fff" : "#512e5f",
});

const treeDaysList = { marginTop: 8, display: "flex", flexDirection: "column", gap: 6 };

const treeDayBtn = (active) => ({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  borderRadius: 12,
  padding: "9px 10px",
  cursor: "pointer",
  fontWeight: 900,
  border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
  background: active ? "#dbeafe" : "#fff",
  color: "#111827",
});

const muted = { color: "#64748b", fontWeight: 900, padding: 10 };

const detailsCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
  overflow: "hidden",
};

const detailsTopBar = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
  padding: 12,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  marginBottom: 10,
};

const detailsTitle = { fontWeight: 900, color: "#512e5f", fontSize: 16 };

const detailsSub = {
  marginTop: 6,
  fontWeight: 900,
  color: "#334155",
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const editPill = {
  marginLeft: 8,
  background: "#111827",
  color: "#fff",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
};

const detailsBtns = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" };

const bigMsg = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 12,
  padding: 16,
  textAlign: "center",
  fontWeight: 900,
  color: "#475569",
};

const boxesWrap = { display: "flex", flexDirection: "column", gap: 12, marginTop: 10 };

const boxCard = {
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
};

const boxHeader = {
  background: "#e8daef",
  borderBottom: "2px solid #c7a8dc",
  padding: "12px 12px",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const boxHeaderLeft = { display: "flex", flexDirection: "column", gap: 4 };

const boxTitle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", color: "#512e5f" };

const boxNoPill = {
  background: "#111827",
  color: "#fff",
  padding: "4px 10px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
};

const boxMeta = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  color: "#334155",
  fontWeight: 800,
  fontSize: 13,
};

const dot = { color: "#64748b", fontWeight: 900 };

const boxTableWrap = { width: "100%", overflowX: "auto" };
const boxTable = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };

const th = {
  padding: "12px 8px",
  textAlign: "center",
  fontSize: 13,
  fontWeight: 900,
  color: "#512e5f",
  background: "#f4eefe",
  borderBottom: "1px solid #c7a8dc",
  wordBreak: "break-word",
};

const td = {
  padding: "10px 8px",
  textAlign: "center",
  verticalAlign: "middle",
  wordBreak: "break-word",
  whiteSpace: "normal",
  borderBottom: "1px solid #eef2f7",
  fontWeight: 700,
  color: "#111827",
};

const tdLeft = { ...td, textAlign: "left" };

const tdMono = {
  ...td,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontWeight: 900,
};

const pill = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 12,
  border: "1.5px solid #c7a8dc",
  background: "#fcf6ff",
  fontWeight: 900,
};

const inpCell = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1.5px solid #c7a8dc",
  background: "#fcf6ff",
  fontSize: 13,
  fontWeight: 800,
  outline: "none",
};

const imgsCell = { display: "flex", flexDirection: "column", gap: 6, alignItems: "center" };

const imgBadge = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 10,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
};

const imgGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 34px)",
  gap: 6,
  justifyContent: "center",
};

const imgLink = {
  width: 34,
  height: 34,
  display: "block",
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const imgThumb = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const moreImgs = { fontSize: 12, fontWeight: 900, color: "#111827", alignSelf: "center" };

/* Buttons */
const btn = {
  background: "#fff",
  border: "1px solid #c7a8dc",
  color: "#512e5f",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const btnGhost = {
  background: "transparent",
  border: "1px solid rgba(136,78,160,.55)",
  color: "#512e5f",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const btnBlue = {
  background: "#2563eb",
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 1px 6px rgba(37,99,235,.22)",
};

const btnGreen = {
  background: "#229954",
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(34,153,84,.25)",
};

const btnPurple = {
  background: "#884ea0",
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(136,78,160,.22)",
};

const btnSave = {
  background: "#229954",
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(34,153,84,.25)",
};

const btnRed = {
  background: "#c0392b",
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(192,57,43,.22)",
};

const btnRowDel = {
  width: "100%",
  background: "#c0392b",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 10px",
  cursor: "pointer",
};
