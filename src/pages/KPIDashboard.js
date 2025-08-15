// src/pages/KPIDashboard.js

import React, { useState, useEffect } from "react";
import CountUp from "react-countup";

// --- Bar Chart فقط للعرض البياني ---
function BarChart({ data }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div style={{ padding: "1rem 0" }}>
      {Object.entries(data).map(([label, value]) => (
        <div key={label} style={{ marginBottom: 7 }}>
          <div style={{ fontWeight: 500, marginBottom: 3 }}>{label}</div>
          <div style={{
            background: "#f1e7fa",
            borderRadius: 10,
            height: 20,
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${(value / max) * 100}%`,
              height: 20,
              background: "#884ea0",
              borderRadius: 10,
              transition: "width .4s"
            }}>
              <span style={{
                position: "absolute",
                left: 10,
                color: "#fff",
                fontWeight: "bold",
                fontSize: 15
              }}>{value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==== Modal لعرض التفاصيل ====
function Modal({ show, onClose, title, children }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed",
      zIndex: 1200,
      left: 0,
      top: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(81,46,95,0.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "2rem 2.4rem",
        minWidth: 350,
        minHeight: 150,
        boxShadow: "0 2px 22px #b39ddb60",
        position: "relative",
        maxHeight: "80vh",
        overflowY: "auto"
      }}>
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
            cursor: "pointer"
          }}
          title="إغلاق"
        >✖</button>
        <div style={{ fontWeight: "bold", color: "#884ea0", fontSize: "1.2em", marginBottom: 18 }}>{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// --------- صفحة الـKPI الرئيسية ---------
export default function KPIDashboard() {
  const [kpi, setKpi] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtered, setFiltered] = useState({});
  const [importError, setImportError] = useState("");
  const fileInputRef = React.useRef();

  // ==== للمرتجعات ====
  const [returnsData, setReturnsData] = useState([]);
  const [returnsDetailsOpen, setReturnsDetailsOpen] = useState(false);

  // ==== تفاصيل الشحنات وسط وتحت الوسط ====
  const [wasatOpen, setWasatOpen] = useState(false);
  const [tahtWasatOpen, setTahtWasatOpen] = useState(false);

  // === جلب البيانات كاملة ===
  useEffect(() => {
    setKpi({
      inspection: JSON.parse(localStorage.getItem("reports") || "[]"),
      qcsDaily: JSON.parse(localStorage.getItem("qcs_reports") || "[]"),
      shipments: JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]"),
      // NEW: تقارير أوقات التحميل للسيارات
      loadingReports: JSON.parse(localStorage.getItem("cars_loading_inspection_v1") || "[]"),
    });
    // ==== جلب بيانات المرتجعات من returns_reports ====
    const returns = JSON.parse(localStorage.getItem("returns_reports") || "[]");
    setReturnsData(returns);
  }, []);

  // === فلترة حسب التاريخ عند تغيير الفلاتر ===
  useEffect(() => {
    const filterByDate = (arr, key = "date") => arr.filter(
      obj =>
        (!dateFrom || obj[key] >= dateFrom) &&
        (!dateTo || obj[key] <= dateTo)
    );
    setFiltered({
      inspection: filterByDate(kpi.inspection || []),
      qcsDaily: filterByDate(kpi.qcsDaily || []),
      shipments: filterByDate(kpi.shipments || []),
      // NEW
      loadingReports: filterByDate(kpi.loadingReports || []),
    });
  }, [dateFrom, dateTo, kpi]);

  // === فلترة بيانات المرتجعات حسب التاريخ كذلك ===
  const filteredReturns = returnsData.filter(r => {
    if (!dateFrom && !dateTo) return true;
    const d = r.reportDate || "";
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  // ==== إحصائيات المرتجعات ====
  const returnsCount = filteredReturns.length;
  const returnsItemsCount = filteredReturns.reduce((acc, rep) => acc + (rep.items?.length || 0), 0);
  const returnsTotalQty = filteredReturns.reduce(
    (acc, rep) => acc + (rep.items?.reduce((sum, r) => sum + Number(r.quantity || 0), 0) || 0),
    0
  );
  const byBranch = {};
  filteredReturns.forEach(rep => {
    (rep.items || []).forEach(r => {
      const b = r.butchery === "فرع آخر..." ? r.customButchery : r.butchery;
      if (!b) return;
      byBranch[b] = (byBranch[b] || 0) + 1;
    });
  });
  const topBranches = Object.entries(byBranch).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const byAction = {};
  filteredReturns.forEach(rep => {
    (rep.items || []).forEach(r => {
      const a = r.action === "إجراء آخر..." ? r.customAction : r.action;
      if (!a) return;
      byAction[a] = (byAction[a] || 0) + 1;
    });
  });
  const topActions = Object.entries(byAction).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // === استخراج القيم للـ KPIs بعد الفلترة ===
  const inspectionCount = filtered.inspection?.length ?? 0;
  const inspectionAvg = inspectionCount
    ? (
        filtered.inspection.reduce(
          (acc, r) => acc + (parseFloat(r.percentage) || 0),
          0
        ) / inspectionCount
      ).toFixed(1)
    : 0;

  const qcsDailyCount = filtered.qcsDaily?.length ?? 0;
  const qcsCoolersAvg = (() => {
    let temps = [];
    (filtered.qcsDaily || []).forEach(rep =>
      rep.coolers?.forEach(c =>
        temps.push(...Object.values(c.temps).filter(v => v !== ""))
      )
    );
    temps = temps.map(Number).filter(x => !isNaN(x));
    if (temps.length === 0) return 0;
    return (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
  })();

  const shipmentsCount = filtered.shipments?.length ?? 0;
  const shipmentsMardi =
    filtered.shipments?.filter(r => r.status === "مرضي").length ?? 0;
  const shipmentsWasatArr =
    filtered.shipments?.filter(r => r.status === "وسط") ?? [];
  const shipmentsWasat = shipmentsWasatArr.length;
  const shipmentsTahtWasatArr =
    filtered.shipments?.filter(r => r.status === "تحت الوسط") ?? [];
  const shipmentsTahtWasat = shipmentsTahtWasatArr.length;
  const shipmentTypes = (filtered.shipments || []).reduce((acc, r) => {
    const type = r.shipmentType || "غير محدد";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // ======== KPIs لتقارير أوقات التحميل (NEW) ========
  const loadingReports = filtered.loadingReports || [];
  const loadingCount = loadingReports.length;

  // تحويل وقت "HH:MM" -> دقائق
  function toMinutes(t) {
    if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  // متوسط زمن التحميل بالدقائق
  const loadingDurations = loadingReports.map(r => {
    const s = toMinutes(r.timeStart);
    const e = toMinutes(r.timeEnd);
    return s != null && e != null && e >= s ? (e - s) : null;
  }).filter(v => v != null);
  const loadingAvgMinutes = loadingDurations.length
    ? Math.round(loadingDurations.reduce((a,b)=>a+b,0) / loadingDurations.length)
    : 0;

  // متوسط حرارة التحميل
  const loadingTemps = loadingReports
    .map(r => Number(r.tempCheck))
    .filter(v => !isNaN(v));
  const loadingAvgTemp = loadingTemps.length
    ? (loadingTemps.reduce((a,b)=>a+b,0) / loadingTemps.length).toFixed(1)
    : 0;

  // نسبة التوافق في الفحص البصري
  const VI_KEYS = ["sealIntact","containerClean","pestDetection","tempReader","plasticCurtain","badSmell","ppeA","ppeB","ppeC"];
  let viYes = 0, viTotal = 0;
  loadingReports.forEach(r => {
    VI_KEYS.forEach(k => {
      if (r.visual && r.visual[k]) {
        viTotal += 1;
        if (r.visual[k].value === "yes") viYes += 1;
      }
    });
  });
  const loadingVICompliance = viTotal ? Math.round((viYes / viTotal) * 100) : 0;

  // ========== تصدير البيانات كـ JSON ==========
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
        // NEW: KPIs التحميل
        loadingCount,
        loadingAvgMinutes,
        loadingAvgTemp,
        loadingVICompliance,
        // المرتجعات
        returnsCount,
        returnsItemsCount,
        returnsTotalQty,
        topBranches,
        topActions
      },
      dateFrom,
      dateTo,
      lastExport: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kpi_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== استيراد ملف KPI =====
  const handleImportJSON = e => {
    setImportError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.KPIs) throw new Error("ملف غير صحيح!");
        alert("✅ تم استيراد البيانات بنجاح! (المعاينة فقط، لن تحفظ في LocalStorage)");
      } catch (err) {
        setImportError("❌ خطأ في قراءة الملف أو الملف غير صحيح!");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset for next import
  };

  // ==== أنماط للأرقام حسب القيمة ====
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

  // ===== Reset Filter function =====
  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  // ===== إشعار انخفاض التقارير =====
  const notification = (() => {
    let notes = [];
    if (Number(inspectionAvg) < 50)
      notes.push("⚠️ متوسط نسبة التفتيش منخفض (أقل من 50%)");
    if (qcsCoolersAvg > 8)
      notes.push("⚠️ متوسط حرارة البرادات مرتفع");
    if (shipmentsTahtWasat > shipmentsMardi)
      notes.push("⚠️ عدد الشحنات تحت الوسط أعلى من المرضية");
    if (notes.length === 0)
      return null;
    return (
      <div style={{
        background: "#fdecea",
        color: "#c0392b",
        fontWeight: "bold",
        border: "1.8px solid #e74c3c",
        borderRadius: 10,
        textAlign: "center",
        fontSize: "1.12em",
        marginBottom: 30,
        padding: "15px 0",
        boxShadow: "0 2px 12px #f9ebea"
      }}>
        {notes.map((n, i) => <div key={i} style={{marginBottom:5}}>{n}</div>)}
      </div>
    );
  })();

  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "linear-gradient(120deg, #f6f8fa 60%, #e8daef 100%)",
        minHeight: "100vh",
        direction: "rtl"
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#512e5f",
          fontWeight: "bold",
          marginBottom: "2.5rem",
          letterSpacing: "0.02em"
        }}
      >
        📈 لوحة مؤشرات الأداء (KPI)
      </h2>

      {/* ===== إشعار انخفاض أو تحذير ===== */}
      {notification}

      {/* فلاتر التاريخ وأزرار التصدير/الاستيراد */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 15,
          marginBottom: "2.3rem",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "1.1em" }}>فلترة حسب التاريخ:</span>
        <label>
          من:{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{
              borderRadius: 10,
              border: "2px solid #884ea0",
              background: "#fcf3ff",
              padding: "10px 18px",
              margin: "0 7px",
              fontSize: "1.08em"
            }}
          />
        </label>
        <label>
          إلى:{" "}
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{
              borderRadius: 10,
              border: "2px solid #884ea0",
              background: "#fcf3ff",
              padding: "10px 18px",
              margin: "0 7px",
              fontSize: "1.08em"
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
              boxShadow: "0 2px 8px #edbb99"
            }}
          >
            🧹 مسح التصفية
          </button>
        )}

        {/* زر تصدير النتائج */}
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
            boxShadow: "0 2px 8px #d2b4de"
          }}
          onClick={handleExportJSON}
        >
          ⬇️ تصدير النتائج (JSON)
        </button>
        {/* زر استيراد النتائج */}
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
            boxShadow: "0 2px 8px #d4efdf"
          }}
          onClick={() => fileInputRef.current.click()}
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
      {/* رسالة خطأ الاستيراد */}
      {importError && (
        <div style={{
          color: "#c0392b",
          textAlign: "center",
          marginBottom: 16,
          fontWeight: "bold"
        }}>{importError}</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "2.2rem"
        }}
      >
        {/* KPIs الرئيسية */}
        {[
          {
            icon: "📑",
            label: "عدد تقارير التفتيش",
            value: inspectionCount,
            color: numberColor(inspectionCount, "good")
          },
          {
            icon: "📊",
            label: "متوسط نسبة التفتيش",
            value: inspectionAvg + "%",
            color: numberColor(inspectionAvg, "percentage")
          },
          {
            icon: "🗓️",
            label: "عدد تقارير QCS اليومية",
            value: qcsDailyCount,
            color: numberColor(qcsDailyCount, "good")
          },
          {
            icon: "❄️",
            label: "متوسط حرارة البرادات (QCS)",
            value: qcsCoolersAvg + "°C",
            color: numberColor(qcsCoolersAvg, "temp")
          },
          {
            icon: "📦",
            label: "عدد شحنات QCS المستلمة",
            value: shipmentsCount,
            color: numberColor(shipmentsCount, "good")
          },
          {
            icon: "✅",
            label: "عدد الشحنات المرضية",
            value: shipmentsMardi,
            color: numberColor(shipmentsMardi, "good")
          },
          // NEW: كروت تقارير التحميل
          {
            icon: "🚚",
            label: "تقارير التحميل",
            value: loadingCount,
            color: numberColor(loadingCount, "good")
          },
          {
            icon: "⏱️",
            label: "متوسط زمن التحميل (دقيقة)",
            value: String(loadingAvgMinutes),
            color: numberColor(loadingAvgMinutes, "warn")
          },
          {
            icon: "🌡️",
            label: "متوسط حرارة التحميل",
            value: String(loadingAvgTemp) + "°C",
            color: numberColor(loadingAvgTemp, "temp")
          },
          {
            icon: "✅",
            label: "توافق الفحص البصري (تحميل)",
            value: String(loadingVICompliance) + "%",
            color: numberColor(loadingVICompliance, "percentage")
          },
        ].map(({ icon, label, value, color }, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              background: `linear-gradient(135deg, #fff, ${i % 2 === 0 ? "#e8daef" : "#f5eef8"} 85%)`,
              border: "2px solid #e1bee7",
              boxShadow: "0 6px 18px rgba(120,100,200,0.10)",
              transition: "transform 0.18s"
            }}
          >
            <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>{icon}</div>
            <div style={{ fontWeight: "bold", marginBottom: "0.4em", color: "#884ea0" }}>
              {label}
            </div>
            <div style={{ ...bigNum, color }}>
              <CountUp end={isNaN(parseFloat(value)) ? 0 : parseFloat(value)} duration={1.3} separator="," />
              {typeof value === "string" && value.endsWith("%") && <span>%</span>}
              {typeof value === "string" && value.endsWith("°C") && <span>°C</span>}
            </div>
          </div>
        ))}

        {/* ========= كرت الشحنات وسط مع زر التفاصيل ========== */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #f5eef8 85%)",
            border: "2px solid #e1bee7",
            boxShadow: "0 6px 18px rgba(120,100,200,0.10)",
            transition: "transform 0.18s"
          }}
        >
          <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>⚠️</div>
          <div style={{ fontWeight: "bold", marginBottom: "0.4em", color: "#884ea0" }}>
            عدد الشحنات وسط
          </div>
          <div style={{ ...bigNum, color: numberColor(shipmentsWasat, "warn"), display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
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
                boxShadow: "0 1px 6px #e8daef77"
              }}
            >🔍</button>
          </div>
        </div>

        {/* ========= كرت الشحنات تحت الوسط مع زر التفاصيل ========== */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #e8daef 85%)",
            border: "2px solid #e1bee7",
            boxShadow: "0 6px 18px rgba(120,100,200,0.10)",
            transition: "transform 0.18s"
          }}
        >
          <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>❌</div>
          <div style={{ fontWeight: "bold", marginBottom: "0.4em", color: "#884ea0" }}>
            عدد الشحنات تحت الوسط
          </div>
          <div style={{ ...bigNum, color: numberColor(shipmentsTahtWasat, "bad"), display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
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
                boxShadow: "0 1px 6px #f6b7b7"
              }}
            >🔍</button>
          </div>
        </div>

        {/* ========= كرت المرتجعات مع زر التفاصيل ========== */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #e8daef 90%)",
            border: "2px solid #d7bde2",
            minWidth: 270,
            position: "relative"
          }}
        >
          <div style={{ fontSize: "2.3em", marginBottom: "0.2em" }}>🛒</div>
          <div style={{ fontWeight: "bold", marginBottom: "0.4em", color: "#884ea0" }}>
            عدد تقارير المرتجعات
          </div>
          <div style={{ ...bigNum, color: "#229954" }}>
            <CountUp end={returnsCount} duration={1.2} separator="," />
          </div>
          <div style={{
            margin: "7px 0 0 0",
            fontWeight: "bold",
            fontSize: "1.12em",
            color: "#512e5f"
          }}>
            إجمالي العناصر:{" "}
            <span style={{ color: "#512e5f", fontWeight: "bold" }}>{returnsItemsCount}</span>
          </div>
          <div style={{
            margin: "7px 0 0 0",
            fontWeight: "bold",
            fontSize: "1.12em",
            color: "#512e5f"
          }}>
            إجمالي الكمية:{" "}
            <span style={{ color: "#884ea0", fontWeight: "bold" }}>{returnsTotalQty}</span>
          </div>
          <div style={{
            fontSize: "1em",
            color: "#512e5f",
            margin: "10px 0 7px 0"
          }}>
            <span style={{ fontWeight: 500 }}>الأكثر تكراراً:</span>
            <div style={{ fontSize: "0.93em" }}>
              {topBranches.length > 0 &&
                <div>
                  فرع: <b style={{ color: "#884ea0" }}>{topBranches[0][0]}</b> (<b>{topBranches[0][1]}</b>)
                </div>
              }
              {topActions.length > 0 &&
                <div>
                  إجراء: <b style={{ color: "#c0392b" }}>{topActions[0][0]}</b> (<b>{topActions[0][1]}</b>)
                </div>
              }
            </div>
          </div>
          {/* زر التفاصيل */}
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
              boxShadow: "0 2px 8px #d2b4de"
            }}
            title="عرض كل تفاصيل تقارير المرتجعات"
          >
            🔍 عرض التفاصيل
          </button>
        </div>

        {/* شحنات حسب النوع مع رسم بياني */}
        <div
          style={{
            ...cardStyle,
            background: "linear-gradient(135deg, #fff, #e8daef 90%)",
            border: "2px solid #d7bde2",
            minWidth: 270
          }}
        >
          <div style={{ fontSize: "2.3em", marginBottom: "0.3em" }}>🏷️</div>
          <div style={{ fontWeight: "bold", marginBottom: "0.4em", color: "#884ea0" }}>
            عدد الشحنات حسب النوع
          </div>
          <BarChart data={shipmentTypes} />
        </div>
      </div>

      {/* ======= Modal تفاصيل الشحنات وسط ======= */}
      <Modal
        show={wasatOpen}
        onClose={() => setWasatOpen(false)}
        title="تفاصيل الشحنات وسط"
      >
        {shipmentsWasatArr.length === 0 ? (
          <div style={{
            textAlign: "center",
            color: "#b2babb",
            fontWeight: "bold",
            padding: 28
          }}>
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
                fontSize: "1.03em"
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
                    <td style={td}>{row.date || <span style={{ color: "#b2babb" }}>---</span>}</td>
                    <td style={td}>{row.productName || row.name || "—"}</td>
                    <td style={td}>{row.shipmentType || "—"}</td>
                    <td style={td}>{row.butchery || row.supplier || "—"}</td>
                    <td style={td}><span style={{ color: "#f1c40f", fontWeight: "bold" }}>{row.status}</span></td>
                    <td style={td}>{row.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ======= Modal تفاصيل الشحنات تحت الوسط ======= */}
      <Modal
        show={tahtWasatOpen}
        onClose={() => setTahtWasatOpen(false)}
        title="تفاصيل الشحنات تحت الوسط"
      >
        {shipmentsTahtWasatArr.length === 0 ? (
          <div style={{
            textAlign: "center",
            color: "#b2babb",
            fontWeight: "bold",
            padding: 28
          }}>
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
                fontSize: "1.03em"
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
                    <td style={td}>{row.date || <span style={{ color: "#b2babb" }}>---</span>}</td>
                    <td style={td}>{row.productName || row.name || "—"}</td>
                    <td style={td}>{row.shipmentType || "—"}</td>
                    <td style={td}>{row.butchery || row.supplier || "—"}</td>
                    <td style={td}><span style={{ color: "#c0392b", fontWeight: "bold" }}>{row.status}</span></td>
                    <td style={td}>{row.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ======= Modal تفاصيل المرتجعات ======= */}
      <Modal
        show={returnsDetailsOpen}
        onClose={() => setReturnsDetailsOpen(false)}
        title="تفاصيل تقارير المرتجعات في الفترة المحددة"
      >
        {filteredReturns.length === 0 ? (
          <div style={{
            textAlign: "center",
            color: "#b2babb",
            fontWeight: "bold",
            padding: 28
          }}>
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
                fontSize: "1.04em"
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
                    <tr key={repIdx + "-" + i} style={{ background: (repIdx * 100 + i) % 2 ? "#fcf3ff" : "#fff" }}>
                      <td style={td}>{repIdx + 1}-{i + 1}</td>
                      <td style={td}>{rep.reportDate || <span style={{ color: "#b2babb" }}>---</span>}</td>
                      <td style={td}>{row.productName}</td>
                      <td style={td}>{row.origin}</td>
                      <td style={td}>{row.butchery === "فرع آخر..." ? row.customButchery : row.butchery}</td>
                      <td style={td}>{row.quantity}</td>
                      <td style={td}>{row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}</td>
                      <td style={td}>{row.expiry}</td>
                      <td style={td}>{row.remarks}</td>
                      <td style={td}>{row.action === "إجراء آخر..." ? row.customAction : row.action}</td>
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
          margin: "3rem 0 0 0",
          textAlign: "center",
          color: "#b2babb",
          fontSize: "1.05em",
          letterSpacing: "0.03em"
        }}
      >
        جميع البيانات من النظام المحلي (LocalStorage) — تم التحديث بتاريخ:{" "}
        <span style={{ color: "#884ea0" }}>{new Date().toLocaleDateString("ar-EG")}</span>
      </div>
    </div>
  );
}

// ==== أنماط الكارت ====
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
  borderBottom: "2px solid #c7a8dc"
};

const td = {
  padding: "10px 6px",
  textAlign: "center",
  minWidth: 85
};

// ---------
// لا تنسى تثبيت مكتبة عداد الأرقام قبل التشغيل:
// npm i react-countup
