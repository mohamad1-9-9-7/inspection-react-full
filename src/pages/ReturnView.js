// src/pages/ReturnView.js
import React, { useEffect, useMemo, useState, useRef } from "react";

/* ========== ربط API السيرفر (صيغة CRA) ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchReturns() {
  const res = await fetch(API_BASE + "/api/reports?type=returns", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json(); // { ok:true, data:[...] } أو Array حسب السيرفر
  return Array.isArray(json) ? json : (json && json.data ? json.data : []);
}

/* ========== تحديث التقرير على السيرفر (PUT فقط) ========== */
async function saveReportToServer(reportDate, items) {
  const payload = {
    reporter: "anonymous",
    type: "returns",
    payload: { reportDate, items, _clientSavedAt: Date.now() },
  };

  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/returns?reportDate=${encodeURIComponent(reportDate)}`,
      method: "PUT",
      body: JSON.stringify({ items, _clientSavedAt: payload.payload._clientSavedAt }),
    },
  ];

  let lastErr = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { "Content-Type": "application/json" },
        body: a.body,
      });
      if (res.ok) {
        try {
          return await res.json();
        } catch {
          return { ok: true };
        }
      }
      lastErr = new Error(`${a.method} ${a.url} -> ${res.status} ${await res
        .text()
        .catch(() => "")}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Save failed");
}

/* ========== مساعدات متعلقة بمقارنة الإصدارات/التواريخ ========== */
function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function newer(a, b) {
  const ta =
    toTs(a?.createdAt) ||
    toTs(a?.updatedAt) ||
    toTs(a?.timestamp) ||
    toTs(a?._id) ||
    toTs(a?.payload?._clientSavedAt) ||
    0;
  const tb =
    toTs(b?.createdAt) ||
    toTs(b?.updatedAt) ||
    toTs(b?.timestamp) ||
    toTs(b?._id) ||
    toTs(b?.payload?._clientSavedAt) ||
    0;
  return tb >= ta ? b : a;
}
function normalizeServerReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec, idx) => {
      const payload = rec?.payload || rec || {};
      return {
        _idx: idx,
        createdAt: rec?.createdAt,
        updatedAt: rec?.updatedAt,
        timestamp: rec?.timestamp,
        _id: rec?._id,
        payload,
        reportDate: payload.reportDate || rec?.reportDate || "",
        items: Array.isArray(payload.items) ? payload.items : [],
      };
    })
    .filter((e) => e.reportDate);

  const latest = new Map();
  for (const e of entries) {
    const prev = latest.get(e.reportDate);
    latest.set(e.reportDate, prev ? newer(prev, e) : e);
  }

  return Array.from(latest.values())
    .map((e) => ({ reportDate: e.reportDate, items: e.items }))
    .sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
}

/* ========== مفاتيح/نصوص لتتبع تغيير الإجراء ========== */
function safeButchery(row) {
  return row?.butchery === "فرع آخر..." ? row?.customButchery || "" : row?.butchery || "";
}
function actionText(row) {
  return row?.action === "إجراء آخر..." ? row?.customAction || "" : row?.action || "";
}
function itemKey(row) {
  return [
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}

/* ========== سجل تغييرات (type=returns_changes) يُخزَّن على السيرفر ========== */
async function appendActionChange(reportDate, changeItem) {
  // 1) احضر سجل اليوم الحالي (إن وجد)
  let existing = [];
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=returns_changes`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data || [];
      const sameDay = arr.filter(
        (r) => (r?.payload?.reportDate || r?.reportDate) === reportDate
      );
      if (sameDay.length) {
        // اختر أحدث سجل لليوم
        sameDay.sort(
          (a, b) =>
            (toTs(b?.updatedAt) || toTs(b?._id) || 0) -
            (toTs(a?.updatedAt) || toTs(a?._id) || 0)
        );
        const latest = sameDay[0];
        existing = Array.isArray(latest?.payload?.items) ? latest.payload.items : [];
      }
    }
  } catch {
    // تجاهل
  }

  // 2) أضف التغيير الجديد
  const merged = [...existing, changeItem];

  // 3) ارفع/حدّث (UPSERT) كسجل returns_changes لذات التاريخ
  const upsertPayload = {
    reporter: "anonymous",
    type: "returns_changes",
    payload: { reportDate, items: merged, _clientSavedAt: Date.now() },
  };
  await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(upsertPayload),
  });
}

/* ========== قائمة الإجراءات ========== */
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Use in kitchen",
  "Send to market",
  "إجراء آخر...",
];

export default function ReturnView() {
  const [reports, setReports] = useState([]);

  // فلاتر عامة من/إلى
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // تعديل الإجراء داخل جدول التفاصيل (مع حفظ للسيرفر)
  const [editActionIdx, setEditActionIdx] = useState(null);
  const [editActionVal, setEditActionVal] = useState("");
  const [editCustomActionVal, setEditCustomActionVal] = useState("");

  // (للواجهة أعلى الصفحة فقط)
  const [groupMode] = useState("day");

  // اختيار التاريخ لعرض التفاصيل
  const [selectedDate, setSelectedDate] = useState("");

  // طي/فتح الأقسام
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});

  // رسائل الحالة
  const [serverErr, setServerErr] = useState("");
  const [loadingServer, setLoadingServer] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  // مرجع لمدخل رفع JSON للاستيراد
  const importInputRef = useRef(null);

  /* ========== جلب من السيرفر فقط ========== */
  async function reloadFromServer() {
    setServerErr("");
    setLoadingServer(true);
    try {
      const raw = await fetchReturns();
      const normalized = normalizeServerReturns(raw).sort((a, b) =>
        (b.reportDate || "").localeCompare(a.reportDate || "")
      );

      setReports(normalized);
      if (!selectedDate && normalized.length) setSelectedDate(normalized[0].reportDate);
    } catch (e) {
      setServerErr("تعذر الجلب من السيرفر الآن. (قد يكون السيرفر يستيقظ).");
      console.error(e);
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => {
    reloadFromServer();
    // eslint-disable-next-line
  }, []);

  // أدوات تاريخ
  const parts = (dateStr) => {
    if (!dateStr || dateStr.length < 10) return { y: "", m: "", d: "" };
    return { y: dateStr.slice(0, 4), m: dateStr.slice(5, 7), d: dateStr.slice(8, 10) };
  };
  const monthKey = (dateStr) => {
    const p = parts(dateStr);
    const y = p.y,
      m = p.m;
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
  const selectedReport =
    selectedReportIndex >= 0 ? filteredReports[selectedReportIndex] : null;

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
    const years = new Map();
    filteredReports.forEach((rep) => {
      const y = yearKey(rep.reportDate);
      const mk = monthKey(rep.reportDate);
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

  /* ========== تعديل إجراء عنصر + تسجيله في returns_changes ========== */
  const handleActionEdit = (i) => {
    if (!selectedReport) return;
    const item = selectedReport.items[i];
    setEditActionIdx(i);
    setEditActionVal(item.action || "");
    setEditCustomActionVal(item.customAction || "");
  };

  const handleActionSave = async (i) => {
    if (!selectedReport) return;
    const repIdxInView = filteredReports.findIndex(
      (r) => r.reportDate === selectedReport.reportDate
    );
    if (repIdxInView < 0) return;

    try {
      setOpMsg("⏳ جاري حفظ التعديل على السيرفر…");

      const newItems = selectedReport.items.map((row, idx) => {
        if (idx !== i) return row;
        return {
          ...row,
          action: editActionVal,
          customAction: editActionVal === "إجراء آخر..." ? editCustomActionVal : "",
        };
      });

      // قبل الحفظ: كوّن سجل تغيير إن تغيّر الإجراء
      const oldRow = selectedReport.items[i];
      const newRow = newItems[i];
      const prevTxt = actionText(oldRow);
      const nextTxt = actionText(newRow);
      const changed = prevTxt && prevTxt !== nextTxt;

      // حفظ التقرير الرئيسي
      await saveReportToServer(selectedReport.reportDate, newItems);

      // إن تغيّر الإجراء، احفظ سجلًّا في returns_changes
      if (changed) {
        const changeItem = {
          key: itemKey(newRow), // مفتاح فريد للصنف
          from: prevTxt,
          to: nextTxt,
          at: new Date().toISOString(),
        };
        await appendActionChange(selectedReport.reportDate, changeItem);
      }

      // إعادة الجلب وتحديث الواجهة
      await reloadFromServer();
      setEditActionIdx(null);
      setOpMsg("✅ تم حفظ التعديل على السيرفر.");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ فشل حفظ التعديل على السيرفر.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ========== حذف تقرير اليوم المفتوح من السيرفر ========== */
  const handleDeleteDay = async () => {
    if (!selectedReport) return;
    const d = selectedReport.reportDate;
    const sure = window.confirm(`متأكد بدك تحذف تقرير التاريخ ${d} نهائيًا؟`);
    if (!sure) return;

    try {
      setOpMsg("⏳ جاري حذف التقرير من السيرفر…");
      const res = await fetch(
        `${API_BASE}/api/reports?type=returns&reportDate=${encodeURIComponent(d)}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || res.statusText);
      }
      if (json?.deleted === 0) {
        setOpMsg("ℹ️ لا يوجد شيء للحذف (قد يكون محذوف مسبقًا).");
      } else {
        await reloadFromServer();
        setSelectedDate("");
        setOpMsg("✅ تم حذف تقرير هذا اليوم من السيرفر.");
      }
    } catch (e) {
      console.error(e);
      setOpMsg("❌ فشل حذف التقرير من السيرفر.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ========== تصدير/استيراد JSON، PDF… (كما كانت) ========== */
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
  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      setOpMsg("⏳ إنشاء ملف PDF…");
      const JsPDF = await ensureJsPDF();
      const doc = new JsPDF({ unit: "pt", format: "a4" });

      const marginX = 40;
      let y = 50;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Returns Report", marginX, y);
      y += 18;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${selectedReport.reportDate}`, marginX, y);
      y += 20;

      const headers = [
        "SL",
        "PRODUCT",
        "ORIGIN",
        "BUTCHERY",
        "QTY",
        "QTY TYPE",
        "EXPIRY",
        "REMARKS",
        "ACTION",
      ];
      const colWidths = [28, 120, 70, 85, 45, 65, 65, 120, 95];
      const tableX = marginX;
      const rowH = 18;

      doc.setFillColor(219, 234, 254);
      doc.rect(tableX, y, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      let x = tableX + 4;
      headers.forEach((h, idx) => {
        doc.text(h, x, y + 12);
        x += colWidths[idx];
      });
      y += rowH;

      doc.setFont("helvetica", "normal");

      const rows = selectedReport.items || [];
      rows.forEach((row, i) => {
        if (y > 780) {
          doc.addPage();
          y = 50;
        }
        const vals = [
          String(i + 1),
          row.productName || "",
          row.origin || "",
          row.butchery === "فرع آخر..." ? row.customButchery || "" : row.butchery || "",
          String(row.quantity ?? ""),
          row.qtyType === "أخرى" ? row.customQtyType || "" : row.qtyType || "",
          row.expiry || "",
          row.remarks || "",
          row.action === "إجراء آخر..." ? row.customAction || "" : row.action || "",
        ];
        doc.setDrawColor(182, 200, 227);
        doc.rect(tableX, y - 0.5, colWidths.reduce((a, b) => a + b, 0), rowH, "S");

        let xx = tableX + 4;
        vals.forEach((v, idx) => {
          const maxW = colWidths[idx] - 8;
          const text = doc.splitTextToSize(String(v), maxW);
          doc.text(text, xx, y + 12);
          xx += colWidths[idx];
        });
        y += rowH;
      });

      const fileName = `returns_${selectedReport.reportDate}.pdf`;
      doc.save(fileName);
      setOpMsg("✅ تم إنشاء ملف PDF.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ تعذر إنشاء PDF (تحقق من الاتصال).");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "returns_all.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpMsg("✅ تم تصدير جميع التقارير كـ JSON.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ تعذر تصدير JSON.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const handleImportClick = () => {
    if (importInputRef.current) importInputRef.current.click();
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setOpMsg("⏳ جاري استيراد JSON وحفظه على السيرفر…");
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("صيغة غير صحيحة: يجب أن يكون مصفوفة");
      for (const entry of data) {
        const d = entry && entry.reportDate;
        const items = entry && Array.isArray(entry.items) ? entry.items : [];
        if (!d) continue;
        await saveReportToServer(d, items);
      }
      await reloadFromServer();
      setOpMsg("✅ تم الاستيراد والحفظ بنجاح.");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ فشل استيراد JSON. تأكد من الصيغة.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  /* ======================== UI ======================== */
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
      {opMsg && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 10,
            color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
            fontWeight: 700,
          }}
        >
          {opMsg}
        </div>
      )}

      {/* KPIs */}
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

      {/* شريط تحكم + تصدير/استيراد */}
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

          <button onClick={handleExportJSON} style={jsonExportBtn}>
            ⬇️ تصدير JSON (كل التقارير)
          </button>
          <button onClick={handleImportClick} style={jsonImportBtn}>
            ⬆️ استيراد JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJSON}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* يسار (قائمة تواريخ) + يمين (تفاصيل) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
        {/* يسار */}
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
                  onClick={() => setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))}
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
                            style={{
                              ...treeSubHeader,
                              background: mOpen ? "#f0f9ff" : "#ffffff",
                              color: "#111",
                            }}
                            onClick={() => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))}
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

        {/* يمين */}
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
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                  >
                    ⬇️ تصدير PDF
                  </button>
                  <button onClick={handleDeleteDay} style={deleteBtnMain}>
                    🗑️ حذف تقرير هذا اليوم
                  </button>
                </div>
              </div>

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
                      <td style={td}>
                        {row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}
                      </td>
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

/* ========== مكونات صغيرة + أنماط ========== */
function KpiCard({ title, value, emoji, accent = "#111" }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "1rem 1.2rem",
        textAlign: "center",
        boxShadow: "0 2px 12px #e8daef66",
        color: "#111",
      }}
    >
      {emoji && <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>}
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: "1.7em", fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}
function KpiList({ title, entries = [], color = "#111" }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "1rem 1.2rem",
        boxShadow: "0 2px 12px #e8daef66",
        color: "#111",
      }}
    >
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

/* أدوات/أنماط */
function sortTop(obj, n) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
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

const detailTable = {
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
const deleteBtnMain = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 6px #fecaca",
};
const jsonExportBtn = {
  background: "#0f766e",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "7px 18px",
  fontWeight: "bold",
  fontSize: "1em",
  cursor: "pointer",
  boxShadow: "0 1px 6px #99f6e4",
};
const jsonImportBtn = {
  background: "#7c3aed",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "7px 18px",
  fontWeight: "bold",
  fontSize: "1em",
  cursor: "pointer",
  boxShadow: "0 1px 6px #c4b5fd",
};
