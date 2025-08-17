// src/pages/ReturnView.js

import React, { useEffect, useMemo, useState } from "react";

/* ========== ربط API السيرفر (صيغة CRA) ========== */
const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchReturns() {
  const res = await fetch(API_BASE + "/api/reports?type=returns", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json(); // { ok:true, data:[...] } أو Array حسب السيرفر
  return Array.isArray(json) ? json : (json && json.data ? json.data : []);
}

/* 🆕 حذف تقارير يوم معيّن من السيرفر (محسّنة مع fallback) */
// يحاول أكثر من مسار للحذف (لتفادي 404) ويتحمّل ردّ غير JSON
async function deleteReturnsByDate(reportDate) {
  const attempts = [
    API_BASE + "/api/reports?type=returns&reportDate=" + encodeURIComponent(reportDate), // المسار القديم
    API_BASE + "/api/reports/returns?reportDate=" + encodeURIComponent(reportDate),      // مسار بديل
    API_BASE + "/returns?reportDate=" + encodeURIComponent(reportDate)                   // مسار أبسط
  ];

  let lastErr = null;

  for (const url of attempts) {
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        // جرّب قراءة JSON؛ لو ما كان JSON (204 أو HTML) اعتبرها نجاح واحسب 1
        try {
          const json = await res.json();
          if (json && (json.ok === true || typeof json.deleted !== "undefined")) {
            return Number(json.deleted || 1);
          }
          return 1;
        } catch {
          // رد غير JSON (مثلاً 204 No Content) => نجاح
          return 1;
        }
      }
      // لو 404 جرّب المسار التالي
      if (res.status === 404) continue;

      const text = await res.text().catch(() => "");
      throw new Error(`DELETE failed ${res.status}: ${text}`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("No matching DELETE route on server");
}


/* توحيد الشكل: إن كانت البيانات بالفعل بالشكل [{reportDate, items:[]}] نُعيدها كما هي.
   وإلا نحوّل من شكل السيرفر [{ payload:{reportDate, items[]} ...}] إلى نفس الشكل المتوقع محليًا. */
function normalizeServerReturns(arr) {
  if (Array.isArray(arr) && arr.length && Array.isArray(arr[0] && arr[0].items)) {
    return arr;
  }
  // افرد العناصر مع تاريخ التقرير، ثم اجمعها حسب اليوم
  const flat = (arr || []).flatMap(function (rec) {
    const payload = (rec && rec.payload) ? rec.payload : {};
    const date = payload.reportDate || (rec && rec.reportDate) || "";
    const items = payload.items || [];
    return items.map(function (it) { return { reportDate: date, ...it }; });
  });
  const byDate = new Map();
  flat.forEach(function (row) {
    const d = row.reportDate || "";
    const rest = { ...row };
    delete rest.reportDate;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(rest);
  });
  return Array.from(byDate.entries()).map(function ([reportDate, items]) {
    return { reportDate: reportDate, items: items };
  });
}

// (اختياري) قوائم جاهزة إن احتجتها لاحقًا
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Use in kitchen",
  "Send to market",
  "إجراء آخر..."
];

export default function ReturnView() {
  const [reports, setReports] = useState([]);

  // فلاتر عامة من/إلى
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // تعديل الإجراء داخل جدول التفاصيل
  const [editActionIdx, setEditActionIdx] = useState(null);
  const [editActionVal, setEditActionVal] = useState("");
  const [editCustomActionVal, setEditCustomActionVal] = useState("");

  // (للواجهة أعلى الصفحة فقط)
  const [groupMode, setGroupMode] = useState("day"); // 'year' | 'month' | 'day'
  const [selectedGroupKey, setSelectedGroupKey] = useState("");

  // اختيار التاريخ لعرض التفاصيل
  const [selectedDate, setSelectedDate] = useState("");

  // طي/فتح الأقسام في القائمة اليسار
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({}); // المفتاح: `${year}-${month}`

  // رسائل الحالة
  const [serverErr, setServerErr] = useState("");
  const [loadingServer, setLoadingServer] = useState(false);

  // 🆕 رسالة عمليات (حذف… إلخ)
  const [opMsg, setOpMsg] = useState("");

  // تحميل التقارير من localStorage أولًا
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("returns_reports") || "[]");
    data.sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
    setReports(data);
  }, []);

  /* ========== جلب من السيرفر ثم توحيد الشكل ========== */
  async function reloadFromServer() {
    setServerErr("");
    setLoadingServer(true);
    try {
      const raw = await fetchReturns();
      const normalized = normalizeServerReturns(raw);
      normalized.sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
      setReports(function (prev) { return (normalized && normalized.length ? normalized : prev); });
    } catch (e) {
      setServerErr("تعذر الجلب من السيرفر الآن. (قد يكون السيرفر يستيقظ).");
      console.error(e);
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await reloadFromServer();
    })();
    return () => { mounted = false; };
  }, []);

  // أدوات تاريخ
  const parts = (dateStr) => {
    if (!dateStr || dateStr.length < 10) return { y: "", m: "", d: "" };
    return { y: dateStr.slice(0, 4), m: dateStr.slice(5, 7), d: dateStr.slice(8, 10) };
  };
  const monthKey = (dateStr) => {
    const p = parts(dateStr);
    const y = p.y, m = p.m;
    return y && m ? y + "-" + m : "";
  };
  const yearKey = (dateStr) => parts(dateStr).y || "";

  // فلترة بحسب من/إلى
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
  }, [reports, filterFrom, filterTo]);

  // اضبط selectedDate عند تغيّر البيانات/الفلتر
  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedDate("");
      return;
    }
    const stillExists = filteredReports.some((r) => r.reportDate === selectedDate);
    if (!stillExists) setSelectedDate(filteredReports[0].reportDate);
  }, [filteredReports, selectedDate]);

  // استرجاع التقرير المختار
  const selectedReportIndex = useMemo(
    () => filteredReports.findIndex((r) => r.reportDate === selectedDate),
    [filteredReports, selectedDate]
  );
  const selectedReport = selectedReportIndex >= 0 ? filteredReports[selectedReportIndex] : null;

  // KPIs عامة
  const kpi = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    const byAction = {};
    filteredReports.forEach((rep) => {
      totalItems += (rep.items || []).length;
      (rep.items || []).forEach((it) => {
        totalQty += Number(it.quantity || 0);
        const action = it.action === "إجراء آخر..." ? it.customAction : it.action;
        if (action) byAction[action] = (byAction[action] || 0) + 1;
      });
    });
    return {
      totalReports: filteredReports.length,
      totalItems: totalItems,
      totalQty: totalQty,
      byAction: byAction,
    };
  }, [filteredReports]);

  // شارة اليوم و تنبيه
  const today = new Date().toISOString().slice(0, 10);
  const newReportsCount = filteredReports.filter((r) => r.reportDate === today).length;
  const showAlert = kpi.totalQty > 50 || filteredReports.length > 50;
  const alertMsg =
    kpi.totalQty > 50
      ? "⚠️ الكمية الكلية للمرتجعات مرتفعة جداً!"
      : filteredReports.length > 50
      ? "⚠️ عدد تقارير المرتجعات كبير في هذه الفترة!"
      : "";

  // تجميع هرمي للسنة ← الشهر ← اليوم
  const hierarchy = useMemo(() => {
    const years = new Map(); // y -> Map(m -> array of dates DESC)
    filteredReports.forEach((rep) => {
      const y = yearKey(rep.reportDate);
      const mk = monthKey(rep.reportDate); // YYYY-MM
      const m = mk.slice(5, 7);
      if (!y || !m) return;
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(rep.reportDate);
    });
    years.forEach((months) => {
      months.forEach((days, m) => {
        days.sort((a, b) => b.localeCompare(a));
        months.set(m, days);
      });
    });
    const sortedYears = Array.from(years.keys()).sort((a, b) => b.localeCompare(a));
    return sortedYears.map((y) => {
      const months = years.get(y);
      const sortedMonths = Array.from(months.keys()).sort((a, b) => b.localeCompare(a));
      return { year: y, months: sortedMonths.map((m) => ({ month: m, days: months.get(m) })) };
    });
  }, [filteredReports]);

  // 🆕 حذف تقرير بحسب التاريخ (يحذف من السيرفر أولاً ثم يحدّث الحالة المحلية)
  const handleDeleteByDate = async (dateStr) => {
    if (!window.confirm("هل أنت متأكد من حذف تقرير " + dateStr + "؟")) return;

    try {
      setOpMsg("⏳ جاري حذف تقرير " + dateStr + " من السيرفر…");
      const deleted = await deleteReturnsByDate(dateStr); // ← حذف من السيرفر
      if (deleted > 0) {
        // حدّث الواجهة المحلية و localStorage
        const list = reports.filter((r) => r.reportDate !== dateStr);
        setReports(list);
        localStorage.setItem("returns_reports", JSON.stringify(list));
        if (selectedDate === dateStr) {
          const next = list
            .filter((r) => {
              const d = r.reportDate || "";
              if (filterFrom && d < filterFrom) return false;
              if (filterTo && d > filterTo) return false;
              return true;
            })
            .sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
          setSelectedDate(next[0] ? next[0].reportDate : "");
        }
        setOpMsg("✅ تم حذف تقرير " + dateStr + " (deleted=" + deleted + ")");
      } else {
        setOpMsg("ℹ️ لا توجد سجلات مطابقة لتاريخ " + dateStr + " لحذفها.");
      }

      // إعادة تحميل من السيرفر للتأكد 100%
      await reloadFromServer();
    } catch (err) {
      console.error(err);
      setOpMsg("❌ فشل حذف التقرير من السيرفر: " + (err && err.message ? err.message : "سبب غير معروف"));
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  // تعديل إجراء عنصر
  const handleActionEdit = (i) => {
    if (!selectedReport) return;
    const item = selectedReport.items[i];
    setEditActionIdx(i);
    setEditActionVal(item.action || "");
    setEditCustomActionVal(item.customAction || "");
  };
  const handleActionSave = (i) => {
    if (!selectedReport) return;
    const repIdxInAll = reports.findIndex((r) => r.reportDate === selectedReport.reportDate);
    if (repIdxInAll < 0) return;
    const updated = reports.slice();
    const items = updated[repIdxInAll].items.slice();
    items[i] = {
      ...items[i],
      action: editActionVal,
      customAction: editActionVal === "إجراء آخر..." ? editCustomActionVal : "",
    };
    updated[repIdxInAll] = { ...updated[repIdxInAll], items };
    setReports(updated);
    localStorage.setItem("returns_reports", JSON.stringify(updated));
    setEditActionIdx(null);
  };

  // UI
  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "linear-gradient(180deg, #f7f2fb 0%, #f4f6fa 100%)",
        minHeight: "100vh",
        direction: "rtl",
        color: "#111", // خط أسود
      }}
    >
      {/* العنوان */}
      <h2
        style={{
          textAlign: "center",
          color: "#1f2937",
          fontWeight: "bold",
          marginBottom: "1.2rem",
          letterSpacing: ".2px",
        }}
      >
        📋 جميع تقارير المرتجعات المحفوظة
        {newReportsCount > 0 && (
          <span
            style={{
              marginRight: 16,
              fontSize: "0.75em",
              color: "#b91c1c",
              background: "#fee2e2",
              borderRadius: "50%",
              padding: "4px 12px",
              fontWeight: "bold",
              verticalAlign: "top",
              boxShadow: "0 2px 6px #fee2e2",
            }}
          >
            🔴{newReportsCount}
          </span>
        )}
      </h2>

      {/* حالة الجلب من السيرفر */}
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
      {/* 🆕 رسالة عمليات */}
      {opMsg && (
        <div style={{ textAlign: "center", marginBottom: 10, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46", fontWeight: 700 }}>
          {opMsg}
        </div>
      )}

      {/* كروت KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: 18,
        }}
      >
        <KpiCard title="إجمالي التقارير" value={kpi.totalReports} emoji="📦" accent="#111" />
        <KpiCard title="إجمالي العناصر" value={kpi.totalItems} emoji="🔢" accent="#111" />
        <KpiCard title="إجمالي الكميات" value={kpi.totalQty} accent="#111" />
        <KpiList title="أكثر الإجراءات" entries={sortTop(kpi.byAction, 3)} color="#111" />
      </div>

      {/* تنبيه */}
      {showAlert && (
        <div
          style={{
            background: "#fff7ed",
            color: "#9a3412",
            border: "1.5px solid #f59e0b",
            fontWeight: "bold",
            borderRadius: 12,
            textAlign: "center",
            fontSize: "1.05em",
            marginBottom: 18,
            padding: "12px 10px",
            boxShadow: "0 2px 12px #fde68a",
          }}
        >
          {alertMsg}
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
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <TabButton active={groupMode === "year"} onClick={() => setGroupMode("year")} label="حسب السنة" />
          <TabButton active={groupMode === "month"} onClick={() => setGroupMode("month")} label="حسب الشهر" />
          <TabButton active={groupMode === "day"} onClick={() => setGroupMode("day")} label="حسب اليوم" />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 12,
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

      {/* تخطيط: يسار (هرمي) + يمين (تفاصيل) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
        {/* يسار: قائمة هرمية سنة ← شهر ← يوم */}
        <div style={leftTree}>
          {hierarchy.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: "1.03em" }}>
              لا يوجد تقارير مرتجعات محفوظة للفترة المختارة.
            </div>
          )}

          {hierarchy.map(({ year, months }) => {
            const yOpen = !!openYears[year];
            const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
            return (
              <div key={year} style={treeSection}>
                <div
                  style={{ ...treeHeader, background: yOpen ? "#e0f2fe" : "#eff6ff", color: "#111" }}
                  onClick={() =>
                    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))
                  }
                >
                  <span>{yOpen ? "▼" : "►"} سنة {year}</span>
                  <span style={{ color: "#111", fontWeight: 700 }}>{yearCount} يوم</span>
                </div>

                {yOpen && (
                  <div style={{ padding: "6px 0 6px 0" }}>
                    {months.map(({ month, days }) => {
                      const key = year + "-" + month;
                      const mOpen = !!openMonths[key];
                      return (
                        <div key={key} style={{ margin: "4px 0 6px" }}>
                          <div
                            style={{ ...treeSubHeader, background: mOpen ? "#f0f9ff" : "#ffffff", color: "#111" }}
                            onClick={() =>
                              setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                          >
                            <span>{mOpen ? "▾" : "▸"} شهر {month}</span>
                            <span style={{ color: "#111" }}>{days.length} يوم</span>
                          </div>

                          {mOpen && (
                            <div>
                              {days.map((d) => {
                                const isSelected = selectedDate === d;
                                return (
                                  <div
                                    key={d}
                                    style={{
                                      ...treeDay,
                                      background: isSelected ? "#e0f2fe" : "#fff",
                                      borderRight: isSelected ? "5px solid #3b82f6" : "none",
                                      color: "#111",
                                    }}
                                    onClick={() => setSelectedDate(d)}
                                  >
                                    <div>📅 {d}</div>
                                    <button
                                      title="حذف التقرير"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteByDate(d);
                                      }}
                                      style={deleteBtn}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* يمين: تفاصيل التقرير */}
        <div style={rightPanel}>
          {selectedReport ? (
            <div>
              <div style={{ fontWeight: "bold", color: "#111", fontSize: "1.2em", marginBottom: 8 }}>
                تفاصيل تقرير المرتجعات ({selectedReport.reportDate})
              </div>

              {/* جدول بنمط إكسل: أزرق فاتح + حدود واضحة + خط أسود */}
              <table style={detailTable}>
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
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.items.map((row, i) => (
                    <tr key={i}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{row.productName}</td>
                      <td style={td}>{row.origin}</td>
                      <td style={td}>
                        {row.butchery === "فرع آخر..." ? row.customButchery : row.butchery}
                      </td>
                      <td style={td}>{row.quantity}</td>
                      <td style={td}>{row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}</td>
                      <td style={td}>{row.expiry}</td>
                      <td style={td}>{row.remarks}</td>
                      <td style={td}>
                        {editActionIdx === i ? (
                          <div>
                            <select
                              value={editActionVal}
                              onChange={(e) => setEditActionVal(e.target.value)}
                              style={cellInputStyle}
                            >
                              {ACTIONS.map((act) => (
                                <option value={act} key={act}>
                                  {act}
                                </option>
                              ))}
                            </select>
                            {editActionVal === "إجراء آخر..." && (
                              <input
                                value={editCustomActionVal}
                                onChange={(e) => setEditCustomActionVal(e.target.value)}
                                placeholder="حدد الإجراء..."
                                style={cellInputStyle}
                              />
                            )}
                            <button onClick={() => handleActionSave(i)} style={saveBtn}>
                              حفظ
                            </button>
                            <button onClick={() => setEditActionIdx(null)} style={cancelBtn}>
                              إلغاء
                            </button>
                          </div>
                        ) : row.action === "إجراء آخر..." ? (
                          row.customAction
                        ) : (
                          row.action
                        )}
                      </td>
                      <td style={td}>
                        {editActionIdx !== i && (
                          <button onClick={() => handleActionEdit(i)} style={editBtn}>
                            ✏️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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

/* ========== مكونات صغيرة ========== */
function KpiCard({ title, value, emoji, accent = "#111" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.2rem", textAlign: "center", boxShadow: "0 2px 12px #e8daef66", color: "#111" }}>
      {emoji && <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>}
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: "1.7em", fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}
function KpiList({ title, entries = [], color = "#111" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.2rem", boxShadow: "0 2px 12px #e8daef66", color: "#111" }}>
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>{title}</div>
      {entries.length === 0 ? (
        <div style={{ color: "#6b7280" }}>—</div>
      ) : (
        entries.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{k}</span>
            <b style={{ color }}>{v}</b>
          </div>
        ))
      )}
    </div>
  );
}
function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 12,
        border: "1px solid #bfdbfe",
        cursor: "pointer",
        fontWeight: 800,
        background: active ? "#60a5fa" : "#ffffff",
        color: active ? "#111" : "#111",
        boxShadow: active ? "0 2px 8px #bfdbfe" : "none",
        minWidth: 120,
      }}
    >
      {label}
    </button>
  );
}

/* ========== أدوات/أنماط مساعدة ========== */
function sortTop(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

const leftTree = {
  minWidth: 280,
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 1px 10px #e8daef66",
  padding: "6px 0",
  border: "1px solid #e5e7eb",
  maxHeight: "70vh",
  overflow: "auto",
  color: "#111",
};
const treeSection = { marginBottom: 4 };
const treeHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 800,
  color: "#111",
  borderBottom: "1px solid #e5e7eb",
};
const treeSubHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 14px",
  cursor: "pointer",
  color: "#111",
  borderBottom: "1px dashed #e5e7eb",
};
const treeDay = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 14px",
  cursor: "pointer",
  borderBottom: "1px dashed #e5e7eb",
  fontSize: "0.98em",
  color: "#111",
};

const rightPanel = {
  flex: 1,
  background: "#fff",
  borderRadius: 15,
  boxShadow: "0 1px 12px #e8daef44",
  minHeight: 320,
  padding: "25px 28px",
  marginRight: 0,
  color: "#111",
};

/* === جدول بنمط إكسل === */
const detailTable = {
  width: "100%",
  background: "#fff",
  borderRadius: 8,
  borderCollapse: "collapse",      // دمج الحدود مثل الإكسل
  border: "1px solid #b6c8e3",     // ✅ تم تصحيح السطر
  marginTop: 6,
  minWidth: 800,
  color: "#111",
};
const th = {
  padding: "10px 8px",
  textAlign: "center",
  fontSize: "0.98em",
  fontWeight: "bold",
  border: "1px solid #b6c8e3",     // حدود كل خلية
  background: "#dbeafe",           // أزرق أغمق للترويسة
  color: "#111",
};
const td = {
  padding: "9px 8px",
  textAlign: "center",
  minWidth: 90,
  border: "1px solid #b6c8e3",     // حدود مثل الإكسل
  background: "#eef6ff",           // أزرق فاتح للخلايا
  color: "#111",                   // خط أسود
};

/* مدخلات داخل خلايا الجدول بنفس الستايل */
const cellInputStyle = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #b6c8e3",
  background: "#eef6ff",
  color: "#111",
  minWidth: 140,
};

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
const deleteBtn = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  padding: "2px 10px",
  cursor: "pointer",
};
const saveBtn = {
  marginRight: 5,
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "2px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};
const cancelBtn = {
  background: "#9ca3af",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "2px 8px",
  marginRight: 4,
  fontWeight: "bold",
  cursor: "pointer",
};
const editBtn = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  padding: "2px 8px",
  cursor: "pointer",
};
