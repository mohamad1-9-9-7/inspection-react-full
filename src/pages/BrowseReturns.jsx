// src/pages/BrowseReturns.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========== ربط API السيرفر (صيغة CRA) ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch " + type);
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data ?? [];
}

/* ========== أدوات تطبيع ========== */
function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function bestTs(rec) {
  return (
    toTs(rec?.createdAt) ||
    toTs(rec?.updatedAt) ||
    toTs(rec?.timestamp) ||
    toTs(rec?._id) ||
    toTs(rec?.payload?._clientSavedAt) ||
    0
  );
}
function normalizeReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec) => {
      const payload = rec?.payload || {};
      return {
        ts: bestTs(rec),
        reportDate: payload.reportDate || rec?.reportDate || "",
        items: Array.isArray(payload.items) ? payload.items : [],
      };
    })
    .filter((e) => e.reportDate);
  // أخذ أحدث نسخة لكل يوم
  const byDate = new Map();
  for (const e of entries) {
    const prev = byDate.get(e.reportDate);
    if (!prev || e.ts > prev.ts) byDate.set(e.reportDate, e);
  }
  const arr = Array.from(byDate.values());
  arr.sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
  return arr;
}
function safeButchery(row) {
  return row?.butchery === "فرع آخر..." ? row?.customButchery || "" : row?.butchery || "";
}
function itemKey(row) {
  return [
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}
function actionText(row) {
  return row?.action === "إجراء آخر..." ? row?.customAction || "" : row?.action || "";
}

/* ========== الصفحة (عرض فقط) ========== */
export default function BrowseReturns() {
  const [returnsData, setReturnsData] = useState([]); // [{reportDate, items}]
  const [changesData, setChangesData] = useState([]); // raw changes (type=returns_changes)

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");

  async function reload() {
    setServerErr("");
    setLoadingServer(true);
    try {
      const [rawReturns, rawChanges] = await Promise.all([
        fetchByType("returns"),
        fetchByType("returns_changes"),
      ]);
      setReturnsData(normalizeReturns(rawReturns));
      setChangesData(rawChanges);
      if (!selectedDate) {
        const n = normalizeReturns(rawReturns);
        if (n.length) setSelectedDate(n[0].reportDate);
      }
    } catch (e) {
      console.error(e);
      setServerErr("تعذر الجلب من السيرفر الآن. (قد يكون السيرفر يستيقظ).");
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  // خريطة تغييرات حسب التاريخ → key → آخر {from,to,at}
  const changeMapByDate = useMemo(() => {
    const map = new Map(); // date -> Map(key -> {from,to,at,ts})
    for (const rec of changesData) {
      const d = rec?.payload?.reportDate || rec?.reportDate || "";
      if (!d) continue;
      const items = Array.isArray(rec?.payload?.items) ? rec.payload.items : [];
      if (!map.has(d)) map.set(d, new Map());
      const inner = map.get(d);
      for (const ch of items) {
        const k = ch?.key;
        if (!k) continue;
        const ts = toTs(ch?.at) || 0;
        const prev = inner.get(k);
        if (!prev || ts > prev.ts) inner.set(k, { from: ch.from, to: ch.to, at: ch.at, ts });
      }
    }
    return map;
  }, [changesData]);

  // فلترة حسب من/إلى
  const filteredReports = useMemo(() => {
    return returnsData.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
  }, [returnsData, filterFrom, filterTo]);

  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedDate("");
      return;
    }
    const still = filteredReports.some((r) => r.reportDate === selectedDate);
    if (!still) setSelectedDate(filteredReports[0].reportDate);
  }, [filteredReports, selectedDate]);

  const selectedReport =
    filteredReports.find((r) => r.reportDate === selectedDate) || null;

  /* ========== أنماط ========== */
  const dateInputStyle = {
    borderRadius: 8,
    border: "1.5px solid #93c5fd",
    background: "#eff6ff",
    padding: "7px 13px",
    fontSize: "1em",
    minWidth: 120,
    color: "#111",
  };
  const clearBtn = {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "7px 18px",
    fontWeight: "bold",
    fontSize: "1em",
    cursor: "pointer",
    boxShadow: "0 1px 6px #bfdbfe",
  };
  const leftList = {
    minWidth: 260,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 1px 10px #e8daef66",
    padding: "6px 0",
    border: "1px solid #e5e7eb",
    maxHeight: "70vh",
    overflow: "auto",
    color: "#111",
  };
  const dayItem = (active) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px dashed #e5e7eb",
    background: active ? "#e0f2fe" : "#fff",
    borderRight: active ? "5px solid #3b82f6" : "none",
    color: "#111",
  });
  const rightPanel = {
    flex: 1,
    background: "#fff",
    borderRadius: 15,
    boxShadow: "0 1px 12px #e8daef44",
    minHeight: 320,
    padding: "25px 28px",
    color: "#111",
  };
  const table = {
    width: "100%",
    background: "#fff",
    borderRadius: 8,
    borderCollapse: "collapse",
    border: "1px solid #b6c8e3",
    marginTop: 6,
    minWidth: 800,
    color: "#111",
  };
  const th = {
    padding: "10px 8px",
    textAlign: "center",
    fontSize: "0.98em",
    fontWeight: "bold",
    border: "1px solid #b6c8e3",
    background: "#dbeafe",
    color: "#111",
  };
  const td = {
    padding: "9px 8px",
    textAlign: "center",
    minWidth: 90,
    border: "1px solid #b6c8e3",
    background: "#eef6ff",
    color: "#111",
  };

  const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();

  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "linear-gradient(180deg, #f7f2fb 0%, #f4f6fa 100%)",
        minHeight: "100vh",
        direction: "rtl",
        color: "#111",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#1f2937",
          fontWeight: "bold",
          marginBottom: "1.2rem",
          letterSpacing: ".2px",
        }}
      >
        📂 تصفّح تقارير المرتجعات (عرض فقط)
      </h2>

      {loadingServer && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#1f2937" }}>
          ⏳ جاري الجلب من السيرفر…
        </div>
      )}
      {serverErr && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#b91c1c" }}>
          {serverErr}
        </div>
      )}

      {/* شريط تحكم */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "12px",
          marginBottom: 16,
          boxShadow: "0 2px 14px #e8daef66",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700 }}>فلترة حسب تاريخ التقرير:</span>
          <label>
            من:
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={dateInputStyle}
            />
          </label>
          <label>
            إلى:
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={dateInputStyle}
            />
          </label>
          {(filterFrom || filterTo) && (
            <button
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
              }}
              style={clearBtn}
            >
              🧹 مسح التصفية
            </button>
          )}
        </div>
      </div>

      {/* تخطيط: يسار تواريخ + يمين تفاصيل اليوم المختار */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
        {/* يسار: قائمة أيام */}
        <div style={leftList}>
          {filteredReports.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: "1.03em" }}>
              لا يوجد تقارير للفترة المختارة.
            </div>
          ) : (
            filteredReports.map((r) => (
              <div
                key={r.reportDate}
                style={dayItem(selectedDate === r.reportDate)}
                onClick={() => setSelectedDate(r.reportDate)}
              >
                <div>📅 {r.reportDate}</div>
                <div style={{ color: "#111", fontWeight: 700 }}>
                  {r.items?.length || 0} صنف
                </div>
              </div>
            ))
          )}
        </div>

        {/* يمين: تفاصيل اليوم المختار (جدول) */}
        <div style={rightPanel}>
          {selectedReport ? (
            <div>
              <div
                style={{ fontWeight: "bold", color: "#111", fontSize: "1.2em", marginBottom: 8 }}
              >
                تفاصيل تقرير المرتجعات ({selectedReport.reportDate})
              </div>
              <table style={table}>
                <thead>
                  <tr style={{ background: "#dbeafe", color: "#111" }}>
                    <th style={th}>SL.NO</th>
                    <th style={th}>PRODUCT NAME</th>
                    <th style={th}>ORIGIN</th>
                    <th style={th}>BUTCHERY</th>
                    <th style={th}>QUANTITY</th>
                    <th style={th}>QTY TYPE</th>
                    <th style={th}>EXPIRY DATE</th>
                    <th style={th}>REMARKS</th>
                    <th style={th}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.items.map((row, i) => {
                    const curr = actionText(row);
                    const k = itemKey(row);
                    const ch = changeMap.get(k);
                    const showChange = ch && ch.to === curr; // آخر تغيير يطابق الحالة الحالية

                    return (
                      <tr key={i}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{row.productName}</td>
                        <td style={td}>{row.origin}</td>
                        <td style={td}>
                          {row.butchery === "فرع آخر..." ? row.customButchery : row.butchery}
                        </td>
                        <td style={td}>{row.quantity}</td>
                        <td style={td}>
                          {row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}
                        </td>
                        <td style={td}>{row.expiry}</td>
                        <td style={td}>{row.remarks}</td>
                        <td style={{ ...td, background: showChange ? "#e9fce9" : td.background }}>
                          {showChange ? (
                            <div style={{ lineHeight: 1.2 }}>
                              <div>
                                <span style={{ opacity: 0.8 }}>{ch.from}</span>
                                <span style={{ margin: "0 6px" }}>→</span>
                                <b>{ch.to}</b>
                              </div>
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "#16a34a",
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                تم التغيير
                              </span>
                            </div>
                          ) : (
                            curr
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#6b7280", padding: 80, fontSize: "1.05em" }}>
              اختر تاريخًا من القائمة لعرض تفاصيله.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
