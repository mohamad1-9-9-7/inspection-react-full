// src/pages/KPIDashboard.js

import React, { useState, useEffect, useRef } from "react";
import CountUp from "react-countup";

/* ================== API ================== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  const url = `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} while fetching ${type}`);
  const json = await res.json().catch(() => []);
  const arr = Array.isArray(json) ? json : json?.data || [];
  return arr;
}

/** يحاول قراءة وقت/تاريخ من سجل عام */
function pickDate(rec) {
  // أولوية: payload.reportDate -> reportDate -> date -> createdAt
  const cands = [
    rec?.payload?.reportDate,
    rec?.reportDate,
    rec?.date,
    rec?.createdAt,
    rec?._id, // ObjectId timestamp (كحل أخير)
  ].filter(Boolean);
  const d = cands[0];
  if (!d) return "";
  // نعيد YYYY-MM-DD إن أمكن
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const ts = Date.parse(s);
  if (Number.isFinite(ts)) return new Date(ts).toISOString().slice(0, 10);
  // ObjectId
  if (/^[a-f0-9]{24}$/i.test(s)) {
    const ms = parseInt(s.slice(0, 8), 16) * 1000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  return "";
}

/* ====== تطبيع الأنواع ====== */

/** تفتيش عام (type=reports): نتوقع percentage و date */
function normalizeInspection(raw) {
  return raw.map((r) => {
    const payload = r?.payload || r || {};
    return {
      ...payload,
      percentage: payload.percentage ?? r?.percentage ?? 0,
      date: pickDate(r),
    };
  });
}

/** QCS Coolers فقط: نحتاج درجات الحرارة */
function normalizeQcsCoolers(raw) {
  return raw.map((r) => {
    const payload = r?.payload || r || {};
    return {
      ...payload,
      coolers: Array.isArray(payload.coolers) ? payload.coolers : [],
      date: pickDate(r),
    };
  });
}

/** أي نوع بسيط نحتاج منه التاريخ فقط (ph/clean …) */
function normalizeSimpleWithDate(raw) {
  return raw.map((r) => ({ date: pickDate(r) })).filter((x) => x.date);
}

/** شحنات QCS (type=qcs_raw_material_reports) */
function normalizeShipments(raw) {
  return raw.map((r) => {
    const payload = r?.payload || r || {};
    return {
      ...payload,
      status: payload.status || r?.status || "",
      shipmentType: payload.shipmentType || r?.shipmentType || "غير محدد",
      productName: payload.productName || payload.name || r?.name || "",
      supplier: payload.supplier || payload.butchery || r?.supplier || "",
      butchery: payload.butchery || "",
      remarks: payload.remarks || "",
      date: pickDate(r),
    };
  });
}

/** تقارير تحميل السيارات (type=cars_loading_inspection_v1) */
function normalizeLoading(raw) {
  return raw.map((r) => {
    const payload = r?.payload || r || {};
    return {
      ...payload,
      date: pickDate(r),
      timeStart: payload.timeStart || "",
      timeEnd: payload.timeEnd || "",
      tempCheck: payload.tempCheck ?? payload.temp ?? "",
      visual: payload.visual || {},
    };
  });
}

/** المرتجعات (type=returns) ← نعتمد نفس بنية ReturnView: [{reportDate, items[]}] */
function normalizeReturns(raw) {
  function ts(x) {
    if (!x) return 0;
    if (typeof x === "number") return x;
    const n = Date.parse(x);
    if (Number.isFinite(n)) return n;
    if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
      return parseInt(x.slice(0, 8), 16) * 1000;
    }
    return 0;
  }
  const entries = raw
    .map((rec) => {
      const payload = rec?.payload || rec || {};
      const reportDate =
        payload.reportDate || rec?.reportDate || pickDate(rec) || "";
      const items = Array.isArray(payload.items) ? payload.items : [];
      const stamp =
        ts(rec?.updatedAt) ||
        ts(rec?.createdAt) ||
        ts(rec?._id) ||
        ts(payload?._clientSavedAt);
      return { reportDate, items, _stamp: stamp };
    })
    .filter((e) => e.reportDate);

  const latest = new Map();
  for (const e of entries) {
    const prev = latest.get(e.reportDate);
    latest.set(
      e.reportDate,
      !prev || (e._stamp || 0) >= (prev._stamp || 0) ? e : prev
    );
  }
  return Array.from(latest.values())
    .map(({ reportDate, items }) => ({ reportDate, items }))
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

/* ===== رسومات بسيطة ===== */
function BarChart({ data }) {
  const vals = Object.values(data || {});
  const max = Math.max(...(vals.length ? vals : [1]));
  return (
    <div style={{ padding: "1rem 0" }}>
      {Object.entries(data || {}).map(([label, value]) => (
        <div key={label} style={{ marginBottom: 7 }}>
          <div style={{ fontWeight: 500, marginBottom: 3 }}>{label}</div>
          <div
            style={{
              background: "#f1e7fa",
              borderRadius: 10,
              height: 20,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(Number(value) / max) * 100}%`,
                height: 20,
                background: "#884ea0",
                borderRadius: 10,
                transition: "width .4s",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 15,
                }}
              >
                {value}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== مودال ===== */
function Modal({ show, onClose, title, children }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        zIndex: 1200,
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(81,46,95,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "2rem 2.4rem",
          minWidth: 350,
          minHeight: 150,
          boxShadow: "0 2px 22px #b39ddb60",
          position: "relative",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            fontSize: 24,
            border: "none",
            background: "transparent",
            color: "#c0392b",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          title="إغلاق"
        >
          ✖
        </button>
        <div
          style={{
            fontWeight: "bold",
            color: "#884ea0",
            fontSize: "1.2em",
            marginBottom: 18,
          }}
        >
          {title}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ====== الصفحة ====== */
export default function KPIDashboard() {
  // مصادر البيانات (من السيرفر فقط)
  const [inspection, setInspection] = useState([]);

  // QCS: نفصل Coolers عن باقي اليوميات، ونكوّن قائمة موحّدة للحصر
  const [qcsCoolers, setQcsCoolers] = useState([]);
  const [qcsDailyAll, setQcsDailyAll] = useState([]); // coolers + ph + clean (للحصر فقط)

  const [shipments, setShipments] = useState([]);
  const [loadingReports, setLoadingReports] = useState([]);
  const [returnsReports, setReturnsReports] = useState([]);

  // حالة جلب/أخطاء
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // فلاتر التاريخ
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // مودالات
const [wasatOpen, setWasatOpen] = useState(false);
const [tahtWasatOpen, setTahtWasatOpen] = useState(false);
const [returnsDetailsOpen, setReturnsDetailsOpen] = useState(false);


  // استيراد/تصدير KPIs (ملف)
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  // جلب من السيرفر الخارجي
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadErr("");

        // ⬅️ جلب QCS Daily من 3 أنواع صحيحة
        const [
          rawInspection,
          rawCoolers,
          rawQcsPH,
          rawQcsClean,
          rawShipments,
          rawLoading,
          rawReturns,
        ] = await Promise.all([
          fetchByType("reports").catch(() => []),                 // التفتيش العام
          fetchByType("qcs-coolers").catch(() => []),             // QCS Coolers
          fetchByType("qcs-ph").catch(() => []),                  // QCS Personal Hygiene
          fetchByType("qcs-clean").catch(() => []),               // QCS Daily Cleanliness
          fetchByType("qcs_raw_material_reports").catch(() => []),// شحنات QCS
          fetchByType("cars_loading_inspection_v1").catch(() => []),
          fetchByType("returns").catch(() => []),
        ]);

        if (!mounted) return;

        // تطبيع
        const nInspection = normalizeInspection(rawInspection);
        const nCoolers = normalizeQcsCoolers(rawCoolers);
        const nPH = normalizeSimpleWithDate(rawQcsPH);
        const nClean = normalizeSimpleWithDate(rawQcsClean);

        // القائمة الموحّدة للحصر: (coolers + ph + clean) بالحد الأدنى تاريخ فقط
        const unifiedDaily = [
          ...nCoolers.map((x) => ({ date: x.date, _src: "coolers" })),
          ...nPH.map((x) => ({ date: x.date, _src: "ph" })),
          ...nClean.map((x) => ({ date: x.date, _src: "clean" })),
        ];

        setInspection(nInspection);
        setQcsCoolers(nCoolers);
        setQcsDailyAll(unifiedDaily);
        setShipments(normalizeShipments(rawShipments));
        setLoadingReports(normalizeLoading(rawLoading));
        setReturnsReports(normalizeReturns(rawReturns));
      } catch (e) {
        console.error(e);
        setLoadErr("تعذر الجلب من السيرفر الخارجي الآن.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // فلترة حسب التاريخ (YYYY-MM-DD)
  const inRange = (d) =>
    (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);

  const filteredInspection = inspection.filter((r) => inRange(r.date || ""));
  const filteredQcsCoolers = qcsCoolers.filter((r) => inRange(r.date || ""));
  const filteredQCSDailyAll = qcsDailyAll.filter((r) => inRange(r.date || ""));
  const filteredShipments = shipments.filter((r) => inRange(r.date || ""));
  const filteredLoading = loadingReports.filter((r) => inRange(r.date || ""));
  const filteredReturns = returnsReports.filter((r) => inRange(r.reportDate || ""));

  /* ==== KPIs ==== */

  // تفتيش
  const inspectionCount = filteredInspection.length;
  const inspectionAvg = inspectionCount
    ? (
        filteredInspection.reduce(
          (acc, r) => acc + (parseFloat(r.percentage) || 0),
          0
        ) / inspectionCount
      ).toFixed(1)
    : 0;

  // QCS: عدد التقارير اليومية (3 أنواع)
  const qcsDailyCount = filteredQCSDailyAll.length;

  // QCS: متوسط حرارة البرادات من coolers فقط
  const qcsCoolersAvg = (() => {
    let temps = [];
    filteredQcsCoolers.forEach((rep) =>
      (rep.coolers || []).forEach((c) => {
        // نتوقع c.temps = {a:val, b:val ...}
        const vals = Object.values(c?.temps || {}).filter((v) => v !== "");
        temps.push(...vals);
      })
    );
    temps = temps.map(Number).filter((x) => !isNaN(x));
    if (!temps.length) return 0;
    return (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
  })();

  // شحنات
  const shipmentsCount = filteredShipments.length;
  const shipmentsMardi =
    filteredShipments.filter((r) => (r.status || "").trim() === "مرضي").length;
  const shipmentsWasatArr = filteredShipments.filter(
    (r) => (r.status || "").trim() === "وسط"
  );
  const shipmentsWasat = shipmentsWasatArr.length;
  const shipmentsTahtWasatArr = filteredShipments.filter(
    (r) => (r.status || "").trim() === "تحت الوسط"
  );
  const shipmentsTahtWasat = shipmentsTahtWasatArr.length;
  const shipmentTypes = filteredShipments.reduce((acc, r) => {
    const t = r.shipmentType || "غير محدد";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  // تحميل سيارات
  const loadingCount = filteredLoading.length;
  const toMinutes = (t) => {
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const loadingDurations = filteredLoading
    .map((r) => {
      const s = toMinutes(r.timeStart);
      const e = toMinutes(r.timeEnd);
      return s != null && e != null && e >= s ? e - s : null;
    })
    .filter((v) => v != null);
  const loadingAvgMinutes = loadingDurations.length
    ? Math.round(
        loadingDurations.reduce((a, b) => a + b, 0) / loadingDurations.length
      )
    : 0;

  const loadingTemps = filteredLoading
    .map((r) => Number(r.tempCheck))
    .filter((v) => !isNaN(v));
  const loadingAvgTemp = loadingTemps.length
    ? (loadingTemps.reduce((a, b) => a + b, 0) / loadingTemps.length).toFixed(1)
    : 0;

  const VI_KEYS = [
    "sealIntact",
    "containerClean",
    "pestDetection",
    "tempReader",
    "plasticCurtain",
    "badSmell",
    "ppeA",
    "ppeB",
    "ppeC",
  ];
  let viYes = 0,
    viTotal = 0;
  filteredLoading.forEach((r) => {
    const v = r.visual || {};
    VI_KEYS.forEach((k) => {
      if (v[k]) {
        viTotal += 1;
        if (v[k].value === "yes") viYes += 1;
      }
    });
  });
  const loadingVICompliance = viTotal
    ? Math.round((viYes / viTotal) * 100)
    : 0;

  // مرتجعات
  const returnsCount = filteredReturns.length;
  const returnsItemsCount = filteredReturns.reduce(
    (acc, rep) => acc + (rep.items?.length || 0),
    0
  );
  const returnsTotalQty = filteredReturns.reduce(
    (acc, rep) =>
      acc +
      (rep.items?.reduce((sum, it) => sum + Number(it.quantity || 0), 0) || 0),
    0
  );

  const byBranch = {};
  filteredReturns.forEach((rep) =>
    (rep.items || []).forEach((it) => {
      const b = it.butchery === "فرع آخر..." ? it.customButchery : it.butchery;
      if (!b) return;
      byBranch[b] = (byBranch[b] || 0) + 1;
    })
  );
  const topBranches = Object.entries(byBranch)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const byAction = {};
  filteredReturns.forEach((rep) =>
    (rep.items || []).forEach((it) => {
      const a = it.action === "إجراء آخر..." ? it.customAction : it.action;
      if (!a) return;
      byAction[a] = (byAction[a] || 0) + 1;
    })
  );
  const topActions = Object.entries(byAction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  /* ===== أدوات عرض ===== */
  function numberColor(val, type = "") {
    if (type === "temp") {
      if (val < 2) return "#229954";
      if (val < 7) return "#f39c12";
      return "#c0392b";
    }
    if (type === "percentage") {
      if (val >= 80) return "#229954";
      if (val >= 50) return "#f39c12";
      return "#c0392b";
    }
    if (type === "good") return "#229954";
    if (type === "warn") return "#f39c12";
    if (type === "bad") return "#c0392b";
    return "#273746";
  }

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const notification = (() => {
    let notes = [];
    if (Number(inspectionAvg) < 50)
      notes.push("⚠️ متوسط نسبة التفتيش منخفض (أقل من 50%)");
    if (qcsCoolersAvg > 8) notes.push("⚠️ متوسط حرارة البرادات مرتفع");
    if (shipmentsTahtWasat > shipmentsMardi)
      notes.push("⚠️ عدد الشحنات تحت الوسط أعلى من المرضية");
    if (!notes.length) return null;
    return (
      <div
        style={{
          background: "#fdecea",
          color: "#c0392b",
          fontWeight: "bold",
          border: "1.8px solid #e74c3c",
          borderRadius: 10,
          textAlign: "center",
          fontSize: "1.12em",
          marginBottom: 30,
          padding: "15px 0",
          boxShadow: "0 2px 12px #f9ebea",
        }}
      >
        {notes.map((n, i) => (
          <div key={i} style={{ marginBottom: 5 }}>
            {n}
          </div>
        ))}
      </div>
    );
  })();

  const handleExportJSON = () => {
    const obj = {
      KPIs: {
        inspectionCount,
        inspectionAvg,
        qcsDailyCount,
        qcsCoolersAvg,
        shipmentsCount,
        shipmentsMardi,
        shipmentsWasat,
        shipmentsTahtWasat,
        shipmentTypes,
        loadingCount,
        loadingAvgMinutes,
        loadingAvgTemp,
        loadingVICompliance,
        returnsCount,
        returnsItemsCount,
        returnsTotalQty,
        topBranches,
        topActions,
      },
      dateFrom,
      dateTo,
      lastExport: new Date().toISOString(),
      source: "server",
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kpi_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    setImportError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.KPIs) throw new Error("Invalid file!");
        alert("✅ Imported OK (preview only).");
      } catch (err) {
        setImportError("❌ Failed to read or invalid JSON!");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ====== UI ====== */
  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "linear-gradient(120deg, #f6f8fa 60%, #e8daef 100%)",
        minHeight: "100vh",
        direction: "rtl",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#512e5f",
          fontWeight: "bold",
          marginBottom: "2.0rem",
          letterSpacing: "0.02em",
        }}
      >
        📈 لوحة مؤشرات الأداء (KPI)
      </h2>

      {loading && (
        <div style={{ textAlign: "center", marginBottom: 14, color: "#512e5f" }}>
          ⏳ جاري الجلب من السيرفر الخارجي…
        </div>
      )}
      {loadErr && (
        <div style={{ textAlign: "center", marginBottom: 14, color: "#c0392b", fontWeight: "bold" }}>
          {loadErr}
        </div>
      )}

      {/* تحذيرات */}
      {!loading && !loadErr && notification}

      {/* فلاتر + تصدير/استيراد */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 15,
          marginBottom: "2.0rem",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "1.1em" }}>فلترة حسب التاريخ:</span>
        <label>
          من:{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              borderRadius: 10,
              border: "2px solid #884ea0",
              background: "#fcf3ff",
              padding: "10px 18px",
              margin: "0 7px",
              fontSize: "1.08em",
            }}
          />
        </label>
        <label>
          إلى:{" "}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              borderRadius: 10,
              border: "2px solid #884ea0",
              background: "#fcf3ff",
              padding: "10px 18px",
              margin: "0 7px",
              fontSize: "1.08em",
            }}
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={resetFilters}
            style={{
              background: "#e67e22",
              color: "#fff",
              fontWeight: "bold",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              fontSize: "1.09em",
              cursor: "pointer",
              boxShadow: "0 2px 8px #edbb99",
            }}
          >
            🧹 مسح التصفية
          </button>
        )}

        <button
          style={{
            background: "#884ea0",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: "bold",
            fontSize: "1.09em",
            marginRight: 7,
            cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de",
          }}
          onClick={handleExportJSON}
        >
          ⬇️ تصدير النتائج (JSON)
        </button>
        <button
          style={{
            background: "#229954",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: "bold",
            fontSize: "1.09em",
            marginRight: 7,
            cursor: "pointer",
            boxShadow: "0 2px 8px #d4efdf",
          }}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          ⬆️ استيراد نتائج (JSON)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportJSON}
          style={{ display: "none" }}
        />
      </div>

      {importError && (
        <div
          style={{
            color: "#c0392b",
            textAlign: "center",
            marginBottom: 16,
            fontWeight: "bold",
          }}
        >
          {importError}
        </div>
      )}

      {/* بطاقات المؤشرات */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "2.0rem",
        }}
      >
        {[
          {
            icon: "📑",
            label: "عدد تقارير التفتيش",
            value: inspectionCount,
            color: numberColor(inspectionCount, "good"),
          },
          {
            icon: "📊",
            label: "متوسط نسبة التفتيش",
            value: inspectionAvg + "%",
            color: numberColor(inspectionAvg, "percentage"),
          },
          {
            icon: "🗓️",
            label: "عدد تقارير QCS اليومية",
            value: qcsDailyCount,
            color: numberColor(qcsDailyCount, "good"),
          },
          {
            icon: "❄️",
            label: "متوسط حرارة البرادات (QCS)",
            value: qcsCoolersAvg + "°C",
            color: numberColor(qcsCoolersAvg, "temp"),
          },
          {
            icon: "📦",
            label: "عدد شحنات QCS المستلمة",
            value: shipmentsCount,
            color: numberColor(shipmentsCount, "good"),
          },
          {
            icon: "✅",
            label: "عدد الشحنات المرضية",
            value: shipmentsMardi,
            color: numberColor(shipmentsMardi, "good"),
          },
          {
            icon: "🚚",
            label: "تقارير التحميل",
            value: loadingCount,
            color: numberColor(loadingCount, "good"),
          },
          {
            icon: "⏱️",
            label: "متوسط زمن التحميل (دقيقة)",
            value: String(loadingAvgMinutes),
            color: numberColor(loadingAvgMinutes, "warn"),
          },
          {
            icon: "🌡️",
            label: "متوسط حرارة التحميل",
            value: String(loadingAvgTemp) + "°C",
            color: numberColor(loadingAvgTemp, "temp"),
          },
          {
            icon: "✅",
            label: "توافق الفحص البصري (تحميل)",
            value: String(loadingVICompliance) + "%",
            color: numberColor(loadingVICompliance, "percentage"),
          },
        ].map(({ icon, label, value, color }, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              background: `linear-gradient(135deg, #fff, ${
                i % 2 === 0 ? "#e8daef" : "#f5eef8"
              } 85%)`,
              border: "2px solid #e1bee7",
              boxShadow: "0 6px 18px rgba(120,100,200,0.10)",
              transition: "transform 0.18s",
            }}
          >
            <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>
              {icon}
            </div>
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "0.4em",
                color: "#884ea0",
              }}
            >
              {label}
            </div>
            <div style={{ ...bigNum, color }}>
              <CountUp
                end={isNaN(parseFloat(value)) ? 0 : parseFloat(value)}
                duration={1.2}
                separator=","
              />
              {typeof value === "string" && value.endsWith("%") && <span>%</span>}
              {typeof value === "string" && value.endsWith("°C") && <span>°C</span>}
            </div>
          </div>
        ))}

        {/* كرت الشحنات وسط */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #f5eef8 85%)",
            border: "2px solid #e1bee7",
            boxShadow: "0 6px 18px rgba(120,100,200,0.10)",
            transition: "transform 0.18s",
          }}
        >
          <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>⚠️</div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "0.4em",
              color: "#884ea0",
            }}
          >
            عدد الشحنات وسط
          </div>
          <div
            style={{
              ...bigNum,
              color: numberColor(shipmentsWasat, "warn"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <CountUp end={shipmentsWasat} duration={1.2} separator="," />
            <button
              title="عرض تفاصيل الشحنات وسط"
              onClick={() => setWasatOpen(true)}
              style={{
                background: "#884ea0",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: 19,
                fontWeight: "bold",
                padding: "1px 12px",
                marginRight: 6,
                cursor: "pointer",
                boxShadow: "0 1px 6px #e8daef77",
              }}
            >
              🔍
            </button>
          </div>
        </div>

        {/* كرت الشحنات تحت الوسط */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #e8daef 85%)",
            border: "2px solid #e1bee7",
            boxShadow: "0 6px 18px rgba(120,100,200,0.10)",
            transition: "transform 0.18s",
          }}
        >
          <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>❌</div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "0.4em",
              color: "#884ea0",
            }}
          >
            عدد الشحنات تحت الوسط
          </div>
          <div
            style={{
              ...bigNum,
              color: numberColor(shipmentsTahtWasat, "bad"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <CountUp end={shipmentsTahtWasat} duration={1.2} separator="," />
            <button
              title="عرض تفاصيل الشحنات تحت الوسط"
              onClick={() => setTahtWasatOpen(true)}
              style={{
                background: "#c0392b",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: 19,
                fontWeight: "bold",
                padding: "1px 12px",
                marginRight: 6,
                cursor: "pointer",
                boxShadow: "0 1px 6px #f6b7b7",
              }}
            >
              🔍
            </button>
          </div>
        </div>

        {/* كرت المرتجعات */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #e8daef 90%)",
            border: "2px solid #d7bde2",
            minWidth: 270,
            position: "relative",
          }}
        >
          <div style={{ fontSize: "2.3em", marginBottom: "0.2em" }}>🛒</div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "0.4em",
              color: "#884ea0",
            }}
          >
            عدد تقارير المرتجعات
          </div>
          <div style={{ ...bigNum, color: "#229954" }}>
            <CountUp end={returnsCount} duration={1.2} separator="," />
          </div>
          <div
            style={{
              margin: "7px 0 0 0",
              fontWeight: "bold",
              fontSize: "1.12em",
              color: "#512e5f",
            }}
          >
            إجمالي العناصر:{" "}
            <span style={{ color: "#512e5f", fontWeight: "bold" }}>
              {returnsItemsCount}
            </span>
          </div>
          <div
            style={{
              margin: "7px 0 0 0",
              fontWeight: "bold",
              fontSize: "1.12em",
              color: "#512e5f",
            }}
          >
            إجمالي الكمية:{" "}
            <span style={{ color: "#884ea0", fontWeight: "bold" }}>
              {returnsTotalQty}
            </span>
          </div>
          <div
            style={{
              fontSize: "1em",
              color: "#512e5f",
              margin: "10px 0 7px 0",
            }}
          >
            <span style={{ fontWeight: 500 }}>الأكثر تكراراً:</span>
            <div style={{ fontSize: "0.93em" }}>
              {topBranches.length > 0 && (
                <div>
                  فرع: <b style={{ color: "#884ea0" }}>{topBranches[0][0]}</b> (
                  <b>{topBranches[0][1]}</b>)
                </div>
              )}
              {topActions.length > 0 && (
                <div>
                  إجراء: <b style={{ color: "#c0392b" }}>{topActions[0][0]}</b> (
                  <b>{topActions[0][1]}</b>)
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setReturnsDetailsOpen(true)}
            style={{
              background: "#512e5f",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 28px",
              marginTop: 12,
              fontWeight: "bold",
              fontSize: "1.07em",
              cursor: "pointer",
              boxShadow: "0 2px 8px #d2b4de",
            }}
            title="عرض كل تفاصيل تقارير المرتجعات"
          >
            🔍 عرض التفاصيل
          </button>
        </div>

        {/* شحنات حسب النوع */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #e8daef 90%)",
            border: "2px solid #d7bde2",
            minWidth: 270,
          }}
        >
          <div style={{ fontSize: "2.3em", marginBottom: "0.3em" }}>🏷️</div>
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "0.4em",
              color: "#884ea0",
            }}
          >
            عدد الشحنات حسب النوع
          </div>
          <BarChart data={shipmentTypes} />
        </div>
      </div>

      {/* تفاصيل وسط */}
      <Modal
        show={wasatOpen}
        onClose={() => setWasatOpen(false)}
        title="تفاصيل الشحنات وسط"
      >
        {shipmentsWasatArr.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#b2babb",
              fontWeight: "bold",
              padding: 28,
            }}
          >
            لا يوجد شحنات وسط في الفترة المحددة.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 2px 12px #f4ecf7cc",
                borderCollapse: "collapse",
                minWidth: 900,
                fontSize: "1.03em",
              }}
            >
              <thead>
                <tr style={{ background: "#f9e79f", color: "#884ea0" }}>
                  <th style={th}>SL.NO</th>
                  <th style={th}>تاريخ التقرير</th>
                  <th style={th}>اسم الشحنة</th>
                  <th style={th}>نوع الشحنة</th>
                  <th style={th}>الفرع/المورد</th>
                  <th style={th}>الحالة</th>
                  <th style={th}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {shipmentsWasatArr.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 ? "#fcf3ff" : "#fff" }}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>
                      {row.date || <span style={{ color: "#b2babb" }}>---</span>}
                    </td>
                    <td style={td}>{row.productName || row.name || "—"}</td>
                    <td style={td}>{row.shipmentType || "—"}</td>
                    <td style={td}>{row.butchery || row.supplier || "—"}</td>
                    <td style={td}>
                      <span style={{ color: "#f1c40f", fontWeight: "bold" }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={td}>{row.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* تفاصيل تحت الوسط */}
      <Modal
        show={tahtWasatOpen}
        onClose={() => setTahtWasatOpen(false)}
        title="تفاصيل الشحنات تحت الوسط"
      >
        {shipmentsTahtWasatArr.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#b2babb",
              fontWeight: "bold",
              padding: 28,
            }}
          >
            لا يوجد شحنات تحت الوسط في الفترة المحددة.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 2px 12px #f4ecf7cc",
                borderCollapse: "collapse",
                minWidth: 900,
                fontSize: "1.03em",
              }}
            >
              <thead>
                <tr style={{ background: "#fadbd8", color: "#c0392b" }}>
                  <th style={th}>SL.NO</th>
                  <th style={th}>تاريخ التقرير</th>
                  <th style={th}>اسم الشحنة</th>
                  <th style={th}>نوع الشحنة</th>
                  <th style={th}>الفرع/المورد</th>
                  <th style={th}>الحالة</th>
                  <th style={th}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {shipmentsTahtWasatArr.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 ? "#fcf3ff" : "#fff" }}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>
                      {row.date || <span style={{ color: "#b2babb" }}>---</span>}
                    </td>
                    <td style={td}>{row.productName || row.name || "—"}</td>
                    <td style={td}>{row.shipmentType || "—"}</td>
                    <td style={td}>{row.butchery || row.supplier || "—"}</td>
                    <td style={td}>
                      <span style={{ color: "#c0392b", fontWeight: "bold" }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={td}>{row.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* تفاصيل المرتجعات */}
      <Modal
        show={returnsDetailsOpen}
        onClose={() => setReturnsDetailsOpen(false)}
        title="تفاصيل تقارير المرتجعات في الفترة المحددة"
      >
        {filteredReturns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#b2babb",
              fontWeight: "bold",
              padding: 28,
            }}
          >
            لا يوجد بيانات مرتجعات في الفترة المحددة.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 2px 12px #f4ecf7cc",
                borderCollapse: "collapse",
                minWidth: 1080,
                fontSize: "1.04em",
              }}
            >
              <thead>
                <tr style={{ background: "#e8daef", color: "#512e5f" }}>
                  <th style={th}>SL.NO</th>
                  <th style={th}>تاريخ التقرير</th>
                  <th style={th}>اسم المنتج</th>
                  <th style={th}>المنشأ</th>
                  <th style={th}>الفرع</th>
                  <th style={th}>الكمية</th>
                  <th style={th}>نوع الكمية</th>
                  <th style={th}>تاريخ الانتهاء</th>
                  <th style={th}>ملاحظات</th>
                  <th style={th}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.flatMap((rep, repIdx) =>
                  (rep.items || []).map((row, i) => (
                    <tr
                      key={repIdx + "-" + i}
                      style={{
                        background: (repIdx * 100 + i) % 2 ? "#fcf3ff" : "#fff",
                      }}
                    >
                      <td style={td}>
                        {repIdx + 1}-{i + 1}
                      </td>
                      <td style={td}>
                        {rep.reportDate || (
                          <span style={{ color: "#b2babb" }}>---</span>
                        )}
                      </td>
                      <td style={td}>{row.productName}</td>
                      <td style={td}>{row.origin}</td>
                      <td style={td}>
                        {row.butchery === "فرع آخر..."
                          ? row.customButchery
                          : row.butchery}
                      </td>
                      <td style={td}>{row.quantity}</td>
                      <td style={td}>
                        {row.qtyType === "أخرى"
                          ? row.customQtyType
                          : row.qtyType || ""}
                      </td>
                      <td style={td}>{row.expiry}</td>
                      <td style={td}>{row.remarks}</td>
                      <td style={td}>
                        {row.action === "إجراء آخر..."
                          ? row.customAction
                          : row.action}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <div
        style={{
          margin: "2.2rem 0 0 0",
          textAlign: "center",
          color: "#b2babb",
          fontSize: "1.05em",
          letterSpacing: "0.03em",
        }}
      >
        جميع البيانات يتم جلبها مباشرة من السيرفر الخارجي —{" "}
        <span style={{ color: "#884ea0" }}>
          {new Date().toLocaleDateString("ar-EG")}
        </span>
      </div>
    </div>
  );
}

/* ==== أنماط ==== */
const cardStyle = {
  borderRadius: "18px",
  boxShadow: "0 6px 18px rgba(120,100,200,0.12)",
  padding: "1.7rem 1.1rem",
  textAlign: "center",
  color: "#512e5f",
  fontWeight: "bold",
  fontSize: "1.1em",
  background: "#fff",
  margin: 0,
};

const bigNum = {
  fontSize: "2.6em",
  marginTop: "0.1rem",
  fontWeight: "bolder",
  letterSpacing: "0.02em",
};

const th = {
  padding: "13px 7px",
  textAlign: "center",
  fontSize: "1.01em",
  fontWeight: "bold",
  borderBottom: "2px solid #c7a8dc",
};

const td = {
  padding: "10px 6px",
  textAlign: "center",
  minWidth: 85,
};
