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
  return Array.from(byDate.values());
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
  // ملاحظة: نتركها كما هي (العربي) للحفاظ على التوافق مع البيانات القديمة
  return row?.action === "إجراء آخر..." ? row?.customAction || "" : row?.action || "";
}

/* ========== الصفحة (عرض فقط) ========== */
export default function BrowseReturns() {
  const [returnsData, setReturnsData] = useState([]); // [{reportDate, items}]
  const [changesData, setChangesData] = useState([]); // raw changes (type=returns_changes)

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // فتح/طي هرمية السنة والشهر
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({}); // key: YYYY-MM

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
      const normalized = normalizeReturns(rawReturns);
      setReturnsData(normalized);
      setChangesData(rawChanges);

      // اختيار أقدم تاريخ افتراضيًا وفتح سنته/شهره
      if (!selectedDate && normalized.length) {
        const oldest = [...normalized]
          .map((r) => r.reportDate)
          .sort((a, b) => a.localeCompare(b))[0];
        setSelectedDate(oldest);
        const y = oldest.slice(0, 4);
        const m = oldest.slice(5, 7);
        setOpenYears((p) => ({ ...p, [y]: true }));
        setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
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

  // فلترة حسب من/إلى (وتصاعدي)
  const filteredReportsAsc = useMemo(() => {
    const arr = returnsData.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
    arr.sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || "")); // الأقدم أولًا
    return arr;
  }, [returnsData, filterFrom, filterTo]);

  // تأكيد selectedDate ضمن النطاق
  useEffect(() => {
    if (!filteredReportsAsc.length) {
      setSelectedDate("");
      return;
    }
    const still = filteredReportsAsc.some((r) => r.reportDate === selectedDate);
    if (!still) {
      setSelectedDate(filteredReportsAsc[0].reportDate);
      const y = filteredReportsAsc[0].reportDate.slice(0, 4);
      const m = filteredReportsAsc[0].reportDate.slice(5, 7);
      setOpenYears((p) => ({ ...p, [y]: true }));
      setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    }
  }, [filteredReportsAsc, selectedDate]);

  const selectedReport =
    filteredReportsAsc.find((r) => r.reportDate === selectedDate) || null;

  /* ===== هرمية سنة → شهر → يوم (تصاعدي) ===== */
  const hierarchyAsc = useMemo(() => {
    const years = new Map(); // y -> Map(m -> array of days)
    filteredReportsAsc.forEach((rep) => {
      const d = rep.reportDate;
      const y = d.slice(0, 4);
      const m = d.slice(5, 7);
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(d);
    });
    years.forEach((months) => {
      months.forEach((days) => days.sort((a, b) => a.localeCompare(b))); // أيام تصاعديًا
    });
    const sortedYears = Array.from(years.keys()).sort((a, b) => a.localeCompare(b)); // سنوات تصاعديًا
    return sortedYears.map((y) => {
      const months = years.get(y);
      const sortedMonths = Array.from(months.keys()).sort((a, b) => a.localeCompare(b)); // شهور تصاعديًا
      return {
        year: y,
        months: sortedMonths.map((m) => ({ month: m, days: months.get(m) })),
      };
    });
  }, [filteredReportsAsc]);

  /* ================= KPIs ================= */
  const kpi = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;

    const posCountItems = {};
    const posKg = {};
    const posPcs = {};
    const byActionLatest = {};

    const isKgType = (t) => {
      const s = (t || "").toString().toLowerCase();
      return s.includes("kg") || s.includes("كيلو") || s.includes("كجم");
    };

    // Helper: أحدث إجراء لهذا الصنف في تاريخ معيّن
    const latestActionFor = (date, row) => {
      const inner = changeMapByDate.get(date) || new Map();
      const ch = inner.get(itemKey(row));
      return ch?.to ?? actionText(row);
    };

    filteredReportsAsc.forEach((rep) => {
      const date = rep.reportDate;
      totalItems += (rep.items || []).length;
      (rep.items || []).forEach((it) => {
        const q = Number(it.quantity || 0);
        totalQty += q;

        // POS
        const pos =
          it.butchery === "فرع آخر..." ? it.customButchery || "—" : it.butchery || "—";
        posCountItems[pos] = (posCountItems[pos] || 0) + 1;
        if (isKgType(it.qtyType)) posKg[pos] = (posKg[pos] || 0) + q;
        else posPcs[pos] = (posPcs[pos] || 0) + q;

        // أحدث إجراء فقط
        const act = latestActionFor(date, it);
        if (act) byActionLatest[act] = (byActionLatest[act] || 0) + 1;
      });
    });

    const pickMax = (obj) => {
      let bestK = "—";
      let bestV = -Infinity;
      for (const [k, v] of Object.entries(obj)) {
        if (v > bestV) {
          bestV = v;
          bestK = k;
        }
      }
      return { key: bestK, value: bestV > 0 ? bestV : 0 };
    };

    const topActionLatest = pickMax(byActionLatest);
    const topPosByItems = pickMax(posCountItems);

    // POS الأعلى حسب إجمالي الكمية (kg + pcs) مع عرض كل منهما
    const allPos = new Set([...Object.keys(posKg), ...Object.keys(posPcs)]);
    let bestKey = "—";
    let bestScore = -Infinity;
    allPos.forEach((p) => {
      const s = (posKg[p] || 0) + (posPcs[p] || 0);
      if (s > bestScore) {
        bestScore = s;
        bestKey = p;
      }
    });
    const topPosByQty = {
      key: bestKey,
      kg: Math.round((posKg[bestKey] || 0) * 1000) / 1000,
      pcs: Math.round((posPcs[bestKey] || 0) * 1000) / 1000,
    };

    return {
      totalReports: filteredReportsAsc.length,
      totalItems,
      totalQty,
      topActionLatest,
      topPosByItems,
      topPosByQty,
    };
  }, [filteredReportsAsc, changeMapByDate]);

  /* ========== PDF Export (الجدول فقط + شعار نصي أعلى يمين) ========== */
  async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }
  async function ensureAutoTable() {
    if (
      window.jspdf &&
      window.jspdf.jsPDF &&
      window.jspdf.jsPDF.API &&
      window.jspdf.jsPDF.API.autoTable
    ) {
      return;
    }
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF-AutoTable"));
      document.head.appendChild(s);
    });
  }

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      const JsPDF = await ensureJsPDF();
      await ensureAutoTable();

      // دعم بيانات قديمة/جديدة لـ Other...
      const isOther = (v) => v === "إجراء آخر..." || v === "Other...";
      const actionTextSafe = (row) =>
        isOther(row?.action) ? row?.customAction || "" : row?.action || "";

      // صفحة أفقية + توزيع أعمدة نسبي لمنع القص
      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

      const marginL = 30, marginR = 30;
      const pageWidth = doc.internal.pageSize.getWidth();
      const avail = pageWidth - marginL - marginR;

      // رأس الصفحة (يتكرر بكل صفحة)
      const drawHeader = () => {
        // يسار: عنوان وتاريخ
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Returns Report", marginL, 36);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Date: ${selectedReport.reportDate}`, marginL, 54);

        // يمين: "شعار" المواشي كنص
        const rightX = pageWidth - marginR;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 0, 0);
        doc.setFontSize(18);
        doc.text("AL MAWASHI", rightX, 30, { align: "right" });

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Trans Emirates Livestock Trading L.L.C.", rightX, 46, { align: "right" });
      };

      drawHeader();

      const head = [
        ["SL", "PRODUCT", "ORIGIN", "POS", "QTY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION"],
      ];

      const body = (selectedReport.items || []).map((row, i) => {
        const pos = row.butchery === "فرع آخر..." ? row.customButchery || "" : row.butchery || "";
        const qtyType = row.qtyType === "أخرى" ? row.customQtyType || "" : row.qtyType || "";
        return [
          String(i + 1),
          row.productName || "",
          row.origin || "",
          pos,
          String(row.quantity ?? ""),
          qtyType,
          row.expiry || "",
          row.remarks || "",
          actionTextSafe(row) || "",
        ];
      });

      // نسب عرض الأعمدة
      const frac = [0.05, 0.17, 0.12, 0.10, 0.07, 0.10, 0.10, 0.17, 0.12];
      const columnStyles = {};
      frac.forEach((f, idx) => (columnStyles[idx] = { cellWidth: Math.floor(avail * f) }));

      doc.autoTable({
        head,
        body,
        margin: { top: 80, left: marginL, right: marginR }, // نترك مساحة للهيدر
        tableWidth: avail,
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
          lineColor: [182, 200, 227],
          lineWidth: 0.5,
          halign: "center",
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [219, 234, 254],
          textColor: [17, 17, 17],
          fontStyle: "bold",
        },
        columnStyles,
        didDrawPage: () => {
          // ارسم الهيدر في كل صفحة
          drawHeader();
        },
      });

      doc.save(`returns_${selectedReport.reportDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("❌ تعذر إنشاء PDF. حاول مجددًا.");
    }
  };

  /* ========== أنماط ========== */
  const kpiBox = {
    background: "rgba(59,130,246,0.12)", // أزرق شفاف
    border: "1.5px solid #000",
    borderRadius: 16,
    padding: "1rem 1.2rem",
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    color: "#111",
  };
  const kpiTitle = { fontWeight: "bold", marginBottom: 6 };
  const kpiValue = { fontSize: "1.8em", fontWeight: 800 };

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
  const treeDay = (active) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 14px",
    cursor: "pointer",
    borderBottom: "1px dashed #e5e7eb",
    background: active ? "#e0f2fe" : "#fff",
    borderRight: active ? "5px solid #3b82f6" : "none",
    fontSize: "0.98em",
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

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "12px",
          marginBottom: 14,
        }}
      >
        {/* Top POS by Quantity */}
        <div style={kpiBox}>
          <div style={kpiTitle}>Top POS by Quantity / أكثر فرع إرجاعًا حسب الكمية</div>
          <div style={{ fontSize: "0.95em", marginTop: 6 }}>
            <div>PCS 🧮</div>
            <div style={{ fontWeight: 700 }}>
              {kpi.topPosByQty.key} — {kpi.topPosByQty.pcs || 0}
            </div>
            <div style={{ marginTop: 6 }}>KG ⚖️</div>
            <div style={{ fontWeight: 700 }}>
              {kpi.topPosByQty.key} — {kpi.topPosByQty.kg || 0} kg
            </div>
          </div>
        </div>

        {/* Top POS (Items) */}
        <div style={kpiBox}>
          <div style={kpiTitle}>Top POS (Items) / أكثر فرع إرجاعًا (عدد العناصر)</div>
          <div style={kpiValue}>{kpi.topPosByItems.value || 0}</div>
          <div style={{ opacity: 0.8 }}>POS {kpi.topPosByItems.key}</div>
        </div>

        {/* Total Reports */}
        <div style={kpiBox}>
          <div style={kpiTitle}>Total Reports / إجمالي التقارير</div>
          <div style={kpiValue}>{kpi.totalReports}</div>
        </div>

        {/* Total Items */}
        <div style={kpiBox}>
          <div style={kpiTitle}>Total Items / إجمالي العناصر</div>
          <div style={kpiValue}>{kpi.totalItems}</div>
        </div>

        {/* Total Qty */}
        <div style={kpiBox}>
          <div style={kpiTitle}>Total Qty / إجمالي الكميات</div>
          <div style={kpiValue}>{kpi.totalQty}</div>
        </div>

        {/* Top Action (Latest only) */}
        <div style={kpiBox}>
          <div style={kpiTitle}>Top Action (Latest) / أكثر إجراء (الأحدث فقط)</div>
          <div style={kpiValue}>{kpi.topActionLatest.value || 0}</div>
          <div style={{ opacity: 0.8 }}>{kpi.topActionLatest.key}</div>
        </div>
      </div>

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

      {/* تخطيط: يسار هرمية سنة→شهر→يوم (تصاعدي) + يمين تفاصيل اليوم المختار */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
        {/* يسار: شجرة التواريخ */}
        <div style={leftTree}>
          {hierarchyAsc.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: "1.03em" }}>
              لا يوجد تقارير للفترة المختارة.
            </div>
          ) : (
            hierarchyAsc.map(({ year, months }) => {
              const yOpen = !!openYears[year];
              const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
              return (
                <div key={year} style={{ marginBottom: 4 }}>
                  <div
                    style={{ ...treeHeader, background: yOpen ? "#e0f2fe" : "#eff6ff" }}
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
                        const key = `${year}-${month}`;
                        const mOpen = !!openMonths[key];
                        return (
                          <div key={key} style={{ margin: "4px 0 6px" }}>
                            <div
                              style={{ ...treeSubHeader, background: mOpen ? "#f0f9ff" : "#ffffff" }}
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
                                  const rep = filteredReportsAsc.find((r) => r.reportDate === d);
                                  return (
                                    <div
                                      key={d}
                                      style={treeDay(isSelected)}
                                      onClick={() => setSelectedDate(d)}
                                    >
                                      <div>📅 {d}</div>
                                      <div style={{ color: "#111", fontWeight: 700 }}>
                                        {(rep?.items?.length || 0)} صنف
                                      </div>
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
            })
          )}
        </div>

        {/* يمين: تفاصيل اليوم المختار (جدول) */}
        <div style={rightPanel}>
          {selectedReport ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: "bold", color: "#111", fontSize: "1.2em" }}>
                  تفاصيل تقرير المرتجعات ({selectedReport.reportDate})
                </div>
                <button
                  onClick={handleExportPDF}
                  style={{
                    background: "#111827",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                  title="تصدير PDF"
                >
                  ⬇️ تصدير PDF
                </button>
              </div>

              <table style={table}>
                <thead>
                  <tr style={{ background: "#dbeafe", color: "#111" }}>
                    <th style={th}>SL.NO</th>
                    <th style={th}>PRODUCT NAME</th>
                    <th style={th}>ORIGIN</th>
                    <th style={th}>POS</th>
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
