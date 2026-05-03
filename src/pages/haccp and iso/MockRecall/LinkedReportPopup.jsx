// src/pages/haccp and iso/MockRecall/LinkedReportPopup.jsx
// مودال يعرض التقرير المصدر كاملاً (شحنة / تحميل / منتج نهائي)
// بدون تنقّل — كل الـ Mock Recall + المصدر بنفس الصفحة.

import React, { useEffect, useState } from "react";
import API_BASE from "../../../config/api";
import { useLang, pickRowsArray } from "./i18n";

const TYPE_MAP = {
  shipment: "qcs_raw_material",
  loading: "cars_loading_inspection",
  finished: "finished_products_report",
  coolers: "qcs-coolers",
  branchTemp: null, // ديناميكي حسب summary.type
  truckCleaning: "truck_daily_cleaning",
};

const ACCENT_MAP = {
  shipment: "#1d4ed8",
  loading: "#0891b2",
  finished: "#15803d",
  coolers: "#06b6d4",
  branchTemp: "#3b82f6",
  truckCleaning: "#9333ea",
};

function ensureObject(v) {
  if (!v) return {};
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
  return v;
}

export default function LinkedReportPopup({ open, onClose, kind, summary }) {
  const { t, lang, dir } = useLang();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const TITLE_MAP = {
    shipment: t("popupShipment"),
    loading: t("popupLoading"),
    finished: t("popupFinished"),
    coolers: t("popupCoolers"),
    branchTemp: t("popupBranchTemp"),
    truckCleaning: t("popupTruckCleaning"),
  };

  useEffect(() => {
    if (!open || !kind) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    setReport(null);

    // الـ branchTemp: نأخذ النوع من summary.type
    const type = kind === "branchTemp" ? (summary?.type || null) : TYPE_MAP[kind];
    if (!type) {
      setErr(t("sourceMissing"));
      setLoading(false);
      return;
    }
    const targetId = summary?.id;

    fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((json) => {
        if (cancelled) return;
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        // ابحث عن نفس الـ ID — fallback على نفس التاريخ
        let found = null;
        if (targetId) {
          found = arr.find((x) => (x.id || x._id) === targetId);
        }
        if (!found) {
          // fallback: نفس التاريخ
          const refDate =
            summary?.receivedOn || summary?.reportDate || summary?.savedAt || "";
          if (refDate) {
            const date10 = String(refDate).slice(0, 10);
            found = arr.find((x) => {
              const p = ensureObject(x?.payload);
              const d =
                p?.reportDate ||
                p?.createdDate ||
                p?.generalInfo?.receivedOn ||
                String(x?.createdAt || "").slice(0, 10);
              return String(d).slice(0, 10) === date10;
            });
          }
        }
        if (!found) {
          setErr(t("sourceMissing"));
        } else {
          setReport({ ...found, payload: ensureObject(found.payload) });
        }
      })
      .catch((e) => !cancelled && setErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [open, kind, summary?.id]);

  if (!open) return null;

  const accent = ACCENT_MAP[kind] || "#1e40af";
  const title = TITLE_MAP[kind] || "تقرير";

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.box, direction: dir }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...S.header, background: `linear-gradient(135deg, ${accent}, #1e3a5f)` }}>
          <h3 style={S.title}>{title}</h3>
          <button onClick={onClose} style={S.closeBtn}>✖</button>
        </div>

        <div style={S.body}>
          {loading && <div style={S.empty}>{t("loadingSource")}</div>}

          {err && (
            <div style={S.errorBox}>
              ❌ {err}
              {summary && (
                <div style={{ marginTop: 10, fontSize: "0.88rem", color: "#475569" }}>
                  <b>{t("savedAtDrill")}</b>
                  <SummaryFallback kind={kind} summary={summary} t={t} lang={lang} />
                </div>
              )}
            </div>
          )}

          {!loading && !err && report && (
            <ReportRenderer kind={kind} report={report} highlight={summary} accent={accent} t={t} lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
   Renderers — كل نوع يعرض بشكل مناسب
   ================================================================= */
function ReportRenderer({ kind, report, highlight, accent, t, lang }) {
  const p = report.payload || {};
  if (kind === "shipment") return <ShipmentView payload={p} accent={accent} t={t} lang={lang} />;
  if (kind === "loading") return <LoadingView payload={p} highlight={highlight} accent={accent} t={t} lang={lang} />;
  if (kind === "finished") return <FinishedView payload={p} highlight={highlight} accent={accent} t={t} lang={lang} />;
  if (kind === "coolers") return <CoolersView payload={p} accent={accent} t={t} lang={lang} />;
  if (kind === "branchTemp") return <BranchTempView payload={p} accent={accent} t={t} lang={lang} />;
  if (kind === "truckCleaning") return <TruckCleaningView payload={p} highlight={highlight} accent={accent} t={t} lang={lang} />;
  return <pre style={S.pre}>{JSON.stringify(p, null, 2)}</pre>;
}

/* ====== 🆕 Coolers Renderer ====== */
function CoolersView({ payload, accent, t, lang }) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const meta = payload?.meta || {};
  const L = lang === "ar"
    ? { date:"التاريخ", checkedBy:"دقّقه", verifiedBy:"اعتمده", chemical:"المنظّف",
        proc:"الإجراء", freq:"التكرار", coolerName:"البرّاد", min:"الحد الأدنى",
        max:"الحد الأعلى", actual:"القراءة الفعلية", time:"الوقت", remarks:"ملاحظات" }
    : { date:"Date", checkedBy:"Checked By", verifiedBy:"Verified By", chemical:"Chemical Used",
        proc:"Procedure", freq:"Frequency", coolerName:"Cooler", min:"Min",
        max:"Max", actual:"Actual", time:"Time", remarks:"Remarks" };
  return (
    <div>
      <SectionHeader text={t("dayInfo")} accent={accent} />
      <KV label={L.date} value={String(payload?.date || "").slice(0, 10)} highlight />
      <KV label={L.checkedBy} value={payload?.checkedBy} />
      <KV label={L.verifiedBy} value={payload?.verifiedBy} />
      <KV label={L.chemical} value={payload?.chemicalUsed} />
      <KV label={L.proc} value={payload?.cleaningProcedure} />
      <KV label={L.freq} value={payload?.frequencyRemark} />
      <KV label={L.proc} value={meta?.documentTitle} />

      <SectionHeader text={`🧊 ${L.coolerName} (${rows.length})`} accent={accent} />
      {rows.length === 0 ? (
        <div style={S.empty}>—</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                {Object.keys(rows[0]).slice(0, 8).map((k) => (
                  <th key={k} style={S.th}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={S.tdC}>{i + 1}</td>
                  {Object.keys(rows[0]).slice(0, 8).map((k) => (
                    <td key={k} style={S.td}>{String(r?.[k] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ====== 🆕 Branch Temperature Renderer (مع KPI لكل صف) ====== */

// تحويل وقت "4:00 AM" / "12:00 PM" إلى دقائق منذ منتصف الليل
function parseTime12h(s) {
  const m = String(s).match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i);
  if (!m) return -1;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = (m[3] || "").toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// كشف نوع الوحدة (فريزر أم برّاد)
function isFreezerName(name = "") {
  return /freezer|فريزر|frozen|مجمد/i.test(String(name));
}

// النطاق المسموح حسب النوع
function rangeFor(name) {
  if (isFreezerName(name)) return { min: -22, max: -16, kind: "freezer" };
  return { min: 0, max: 5, kind: "cooler" }; // برّاد عادي 0-5°C
}

// لون الخلية حسب القراءة
function tempCellStyle(value, range) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || isNaN(n)) {
    return { color: "#94a3b8" };
  }
  const out = n < range.min || n > range.max;
  return out
    ? { background: "#fee2e2", color: "#991b1b", fontWeight: 800 }
    : { color: "#0f172a" };
}

// إحصائيات لكل صف
function rowStats(temps, times) {
  const vals = times.map(tm => Number(temps?.[tm])).filter(n => !isNaN(n));
  if (!vals.length) return { avg: null, min: null, max: null };
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    avg: sum / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}

function BranchTempView({ payload, accent, t, lang }) {
  const rows = pickRowsArray(payload);
  const hasTempsObj = rows.length > 0 && rows[0] && typeof rows[0].temps === "object" && rows[0].temps !== null;

  // استخراج قائمة الأوقات: من payload.times، أو من مفاتيح أول صف
  let times = Array.isArray(payload?.times) ? payload.times.slice() : [];
  if (!times.length && hasTempsObj) {
    times = Object.keys(rows[0].temps || {});
  }
  // استبعاد "Corrective Action"
  times = times.filter(x => x !== "Corrective Action");
  // ترتيب منطقي حسب الوقت
  times.sort((a, b) => parseTime12h(a) - parseTime12h(b));

  const L = lang === "ar"
    ? { date:"التاريخ", branch:"الفرع", checkedBy:"دقّقه", verifiedBy:"اعتمده",
        name:"الاسم/البرّاد", remarks:"ملاحظات", correctiveAction:"إجراء تصحيحي",
        avg:"المتوسط", min:"الأدنى", max:"الأعلى", status:"الحالة",
        statusOK:"✅ ضمن النطاق", statusOut:"🔴 خارج النطاق",
        rangeCooler:"النطاق: 0 إلى 5°C", rangeFreezer:"النطاق: -22 إلى -16°C",
        legend:"📌 دليل: الخلايا الحمراء = قراءة خارج النطاق المسموح" }
    : { date:"Date", branch:"Branch", checkedBy:"Checked By", verifiedBy:"Verified By",
        name:"Cooler/Name", remarks:"Remarks", correctiveAction:"Corrective Action",
        avg:"Avg", min:"Min", max:"Max", status:"Status",
        statusOK:"✅ in range", statusOut:"🔴 out of range",
        rangeCooler:"Range: 0 to 5°C", rangeFreezer:"Range: -22 to -16°C",
        legend:"📌 Legend: red cells = reading out of allowed range" };

  return (
    <div>
      <SectionHeader text={t("dayInfo")} accent={accent} />
      <KV label={L.date} value={String(payload?.reportDate || payload?.date || "").slice(0, 10)} highlight />
      <KV label={L.branch} value={payload?.branch} />
      <KV label={L.checkedBy} value={payload?.checkedBy} />
      <KV label={L.verifiedBy} value={payload?.verifiedBy || payload?.verifiedByManager} />

      <SectionHeader text={`🌡️ ${rows.length} ${lang === "ar" ? "صف/قراءة" : "rows"}`} accent={accent} />

      {/* دليل النطاق */}
      <div style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
        color: "#78350f",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: "0.82rem",
        fontWeight: 600,
        marginBottom: 10,
      }}>
        {L.legend} · {L.rangeCooler} · {L.rangeFreezer}
      </div>

      {rows.length === 0 ? (
        <div style={S.empty}>—</div>
      ) : hasTempsObj && times.length > 0 ? (
        // الصيغة الذكية: rows = [{ name, temps:{time:value}, remarks }]
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={{ ...S.th, minWidth: 110, position: "sticky", left: 0, background: "#f1f5f9", zIndex: 1 }}>{L.name}</th>
                {times.map((tm) => <th key={tm} style={{ ...S.th, fontSize: "0.8rem" }}>{tm}</th>)}
                <th style={{ ...S.th, background: "#dbeafe" }}>{L.avg}</th>
                <th style={{ ...S.th, background: "#dbeafe" }}>{L.min}</th>
                <th style={{ ...S.th, background: "#dbeafe" }}>{L.max}</th>
                <th style={{ ...S.th, background: "#dbeafe" }}>{L.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const range = rangeFor(r?.name || "");
                const stats = rowStats(r?.temps || {}, times);
                const anyOut = times.some(tm => {
                  const n = Number((r?.temps || {})[tm]);
                  return !isNaN(n) && (n < range.min || n > range.max);
                });
                return (
                  <tr key={i}>
                    <td style={S.tdC}>{i + 1}</td>
                    <td style={{ ...S.td, position: "sticky", left: 0, background: "#f8fafc", fontWeight: 800 }}>
                      {r?.name || "—"}
                      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
                        {range.kind === "freezer" ? "❄️ Freezer" : "🧊 Cooler"}
                      </div>
                    </td>
                    {times.map((tm) => {
                      const v = (r?.temps || {})[tm];
                      return (
                        <td key={tm} style={{ ...S.td, ...tempCellStyle(v, range), textAlign: "center", padding: "4px 6px" }}>
                          {v ?? ""}
                        </td>
                      );
                    })}
                    <td style={{ ...S.td, textAlign: "center", fontWeight: 800, color: "#0b1f4d", background: "#eff6ff" }}>
                      {stats.avg !== null ? stats.avg.toFixed(1) : "—"}
                    </td>
                    <td style={{ ...S.td, textAlign: "center", background: "#eff6ff" }}>
                      {stats.min !== null ? stats.min : "—"}
                    </td>
                    <td style={{ ...S.td, textAlign: "center", background: "#eff6ff" }}>
                      {stats.max !== null ? stats.max : "—"}
                    </td>
                    <td style={{
                      ...S.td,
                      textAlign: "center",
                      fontWeight: 800,
                      background: anyOut ? "#fee2e2" : "#dcfce7",
                      color: anyOut ? "#991b1b" : "#166534",
                      whiteSpace: "nowrap",
                    }}>
                      {anyOut ? L.statusOut : L.statusOK}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Generic format
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                {Object.keys(rows[0]).slice(0, 10).map((k) => (
                  <th key={k} style={S.th}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={S.tdC}>{i + 1}</td>
                  {Object.keys(rows[0]).slice(0, 10).map((k) => (
                    <td key={k} style={S.td}>{
                      typeof r?.[k] === "object" && r[k] !== null
                        ? JSON.stringify(r[k])
                        : String(r?.[k] ?? "")
                    }</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ====== 🆕 Truck Cleaning Renderer ====== */
function TruckCleaningView({ payload, highlight, accent, t, lang }) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const highlightTruck = String(highlight?.truckNo || "").trim();
  const L = lang === "ar"
    ? { date:"التاريخ", checkedBy:"دقّقه", verifiedBy:"اعتمده", truckNo:"رقم السيارة",
        cleaning:"التنظيف", remarks:"ملاحظات" }
    : { date:"Date", checkedBy:"Checked By", verifiedBy:"Verified By", truckNo:"Truck No",
        cleaning:"Cleaning", remarks:"Remarks" };
  return (
    <div>
      <SectionHeader text={t("dayInfo")} accent={accent} />
      <KV label={L.date} value={String(payload?.date || "").slice(0, 10)} highlight />
      <KV label={L.checkedBy} value={payload?.checkedBy} />
      <KV label={L.verifiedBy} value={payload?.verifiedBy} />

      <SectionHeader
        text={`🚛 ${rows.length}`}
        accent={accent}
        sub={highlightTruck ? `${L.truckNo}: ${highlightTruck} ${t("highlighted")}` : null}
      />
      {rows.length === 0 ? (
        <div style={S.empty}>—</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                {Object.keys(rows[0]).slice(0, 10).map((k) => (
                  <th key={k} style={S.th}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isHL = highlightTruck && String(r?.truckNo || "").trim() === highlightTruck;
                return (
                  <tr key={i} style={isHL ? { background: "#fef3c7" } : undefined}>
                    <td style={S.tdC}>{i + 1}{isHL ? " ⭐" : ""}</td>
                    {Object.keys(rows[0]).slice(0, 10).map((k) => (
                      <td key={k} style={S.td}>{String(r?.[k] ?? "")}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ====== Shipment Renderer ====== */
function ShipmentView({ payload, accent, t, lang }) {
  const gi = payload?.generalInfo || {};
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const L = lang === "ar"
    ? { invoice:"رقم الفاتورة", awb:"بوليصة الشحن", supplier:"المورّد", brand:"العلامة التجارية", origin:"المنشأ",
        shipType:"نوع الشحنة", status:"الحالة", received:"تاريخ الاستلام", inspection:"تاريخ الفحص",
        temp:"درجة الحرارة", ph:"الحموضة", localLog:"المسجّل المحلي", intlLog:"المسجّل الدولي",
        addr:"عنوان الاستلام", created:"تاريخ الإنشاء", inspector:"المُفتّش", qa:"مراقبة الجودة" }
    : { invoice:"Invoice No", awb:"Airway Bill", supplier:"Supplier", brand:"Brand", origin:"Origin",
        shipType:"Shipment Type", status:"Status", received:"Received On", inspection:"Inspection Date",
        temp:"Temperature", ph:"pH", localLog:"Local Logger", intlLog:"International Logger",
        addr:"Receiving Address", created:"Created Date", inspector:"Inspector", qa:"QA" };
  return (
    <div>
      <SectionHeader text={t("shipmentInfo")} accent={accent} />
      <KV label={L.invoice} value={gi.invoiceNo} highlight />
      <KV label={L.awb} value={gi.airwayBill} />
      <KV label={L.supplier} value={gi.supplierName} />
      <KV label={L.brand} value={gi.brand} />
      <KV label={L.origin} value={gi.origin} />
      <KV label={L.shipType} value={payload?.shipmentType} />
      <KV label={L.status} value={payload?.status} />
      <KV label={L.received} value={String(gi.receivedOn || "").slice(0, 10)} />
      <KV label={L.inspection} value={String(gi.inspectionDate || "").slice(0, 10)} />
      <KV label={L.temp} value={gi.temperature !== "" && gi.temperature !== undefined ? `${gi.temperature}°C` : null} />
      <KV label={L.ph} value={gi.ph} />
      <KV label={L.localLog} value={gi.localLogger} />
      <KV label={L.intlLog} value={gi.internationalLogger} />
      <KV label={L.addr} value={gi.receivingAddress} />
      <KV label={L.created} value={payload?.createdDate} />

      {items.length > 0 && (
        <>
          <SectionHeader text={`${t("items")} (${items.length})`} accent={accent} />
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  {Object.keys(items[0]).slice(0, 8).map((k) => (
                    <th key={k} style={S.th}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={i}>
                    <td style={S.tdC}>{i + 1}</td>
                    {Object.keys(items[0]).slice(0, 8).map((k) => (
                      <td key={k} style={S.td}>{String(row?.[k] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionHeader text={t("signatures")} accent={accent} />
      <KV label={L.inspector} value={payload?.inspectorName || payload?.inspector} />
      <KV label={L.qa} value={payload?.qaName || payload?.qa} />
    </div>
  );
}

/* ====== Loading Renderer ====== */
function LoadingView({ payload, highlight, accent, t, lang }) {
  const rows = Array.isArray(payload?.rows) ? payload.rows
              : Array.isArray(payload?.vehicles) ? payload.vehicles
              : [];
  const header = payload?.header || {};
  const highlightVehicle = String(highlight?.vehicleNo || "").trim();

  const L = lang === "ar"
    ? { reportDate:"تاريخ التقرير", inspectedBy:"المُفتّش", verifiedBy:"المُحقّق", docTitle:"عنوان الوثيقة",
        issuedBy:"أصدرها", approvedBy:"اعتمدها", vehicle:"السيارة", driver:"السائق", start:"البدء",
        end:"الانتهاء", dur:"المدّة", truckTemp:"حرارة الشاحنة" }
    : { reportDate:"Report Date", inspectedBy:"Inspected By", verifiedBy:"Verified By", docTitle:"Document Title",
        issuedBy:"Issued By", approvedBy:"Approved By", vehicle:"Vehicle", driver:"Driver", start:"Start",
        end:"End", dur:"Duration", truckTemp:"Truck Temp" };

  return (
    <div>
      <SectionHeader text={t("dayInfo")} accent={accent} />
      <KV label={L.reportDate} value={String(payload?.reportDate || "").slice(0, 10)} highlight />
      <KV label={L.inspectedBy} value={payload?.inspectedBy || header?.inspectedBy} />
      <KV label={L.verifiedBy} value={payload?.verifiedBy || header?.verifiedBy} />
      <KV label={L.docTitle} value={header?.documentTitle} />
      <KV label={L.issuedBy} value={header?.issuedBy} />
      <KV label={L.approvedBy} value={header?.approvedBy} />

      <SectionHeader
        text={`${t("vehiclesOfDay")} (${rows.length})`}
        accent={accent}
        sub={highlightVehicle ? `${t("selectedVehicle")}: ${highlightVehicle} ${t("highlighted")}` : null}
      />
      {rows.length === 0 ? (
        <div style={S.empty}>{t("noVehicles")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>{L.vehicle}</th>
                <th style={S.th}>{L.driver}</th>
                <th style={S.th}>{L.start}</th>
                <th style={S.th}>{L.end}</th>
                <th style={S.th}>{L.dur}</th>
                <th style={S.th}>{L.truckTemp}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => {
                const isHL = highlightVehicle && String(v?.vehicleNo || "").trim() === highlightVehicle;
                return (
                  <tr key={i} style={isHL ? { background: "#fef3c7" } : undefined}>
                    <td style={S.tdC}>{i + 1}{isHL ? " ⭐" : ""}</td>
                    <td style={S.td}><b>{v?.vehicleNo || "—"}</b></td>
                    <td style={S.td}>{v?.driverName || "—"}</td>
                    <td style={S.td}>{v?.timeStart || "—"}</td>
                    <td style={S.td}>{v?.timeEnd || "—"}</td>
                    <td style={S.td}>{computeDuration(v?.timeStart, v?.timeEnd)}</td>
                    <td style={S.td}>{v?.tempCheck !== "" && v?.tempCheck !== undefined ? `${v.tempCheck}°C` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function computeDuration(start, end) {
  if (!start || !end) return "—";
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  if ([sh, sm, eh, em].some((x) => Number.isNaN(x))) return "—";
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return `${mins}m`;
}

/* ====== Finished Product Renderer ====== */
function FinishedView({ payload, highlight, accent, t, lang }) {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const highlightOrder = String(highlight?.productRow?.orderNo || "").trim();
  const highlightProduct = String(highlight?.productRow?.product || "").trim();

  const L = lang === "ar"
    ? { reportDate:"تاريخ التقرير", reportTitle:"عنوان التقرير", checkedBy:"دقّقه", verifiedBy:"اعتمده",
        savedAt:"تاريخ الحفظ", product:"المنتج", customer:"الزبون", orderNo:"رقم الطلب", time:"الوقت",
        slaughter:"الذبح", expiry:"الانتهاء", temp:"الحرارة", qty:"الكمية", uom:"الوحدة" }
    : { reportDate:"Report Date", reportTitle:"Report Title", checkedBy:"Checked By", verifiedBy:"Verified By",
        savedAt:"Saved At", product:"Product", customer:"Customer", orderNo:"Order No", time:"Time",
        slaughter:"Slaughter", expiry:"Expiry", temp:"Temp", qty:"Qty", uom:"UOM" };

  return (
    <div>
      <SectionHeader text={t("dayInfo")} accent={accent} />
      <KV label={L.reportDate} value={String(payload?.reportDate || "").slice(0, 10)} highlight />
      <KV label={L.reportTitle} value={payload?.reportTitle} />
      <KV label={L.checkedBy} value={payload?.checkedBy} />
      <KV label={L.verifiedBy} value={payload?.verifiedBy} />
      <KV label={L.savedAt} value={payload?.reportSavedAt} />

      <SectionHeader
        text={`${t("productsOfDay")} (${products.length})`}
        accent={accent}
        sub={highlightProduct ? `${t("selectedProductLabel")}: ${highlightProduct} ${t("highlighted")}` : null}
      />
      {products.length === 0 ? (
        <div style={S.empty}>{t("noProducts")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>{L.product}</th>
                <th style={S.th}>{L.customer}</th>
                <th style={S.th}>{L.orderNo}</th>
                <th style={S.th}>{L.time}</th>
                <th style={S.th}>{L.slaughter}</th>
                <th style={S.th}>{L.expiry}</th>
                <th style={S.th}>{L.temp}</th>
                <th style={S.th}>{L.qty}</th>
                <th style={S.th}>{L.uom}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((row, i) => {
                const isHL =
                  (highlightOrder && String(row?.orderNo || "").trim() === highlightOrder) ||
                  (highlightProduct && String(row?.product || "").trim() === highlightProduct);
                return (
                  <tr key={i} style={isHL ? { background: "#fef3c7" } : undefined}>
                    <td style={S.tdC}>{i + 1}{isHL ? " ⭐" : ""}</td>
                    <td style={S.td}><b>{row?.product || "—"}</b></td>
                    <td style={S.td}>{row?.customer || "—"}</td>
                    <td style={S.td}>{row?.orderNo || "—"}</td>
                    <td style={S.td}>{row?.time || "—"}</td>
                    <td style={S.td}>{row?.slaughterDate || "—"}</td>
                    <td style={S.td}>{row?.expiryDate || "—"}</td>
                    <td style={S.td}>{row?.temp !== "" && row?.temp !== undefined ? `${row.temp}°C` : "—"}</td>
                    <td style={S.td}>{row?.quantity || "—"}</td>
                    <td style={S.td}>{row?.unitOfMeasure || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ====== Atoms ====== */
function SectionHeader({ text, sub, accent }) {
  return (
    <div style={{ marginTop: 14, marginBottom: 8 }}>
      <div style={{ fontWeight: 800, fontSize: "1rem", color: accent, paddingBottom: 4, borderBottom: `2px solid ${accent}33` }}>
        {text}
      </div>
      {sub && <div style={{ fontSize: "0.82rem", color: "#a16207", fontWeight: 700, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function KV({ label, value, highlight }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px dashed #e5e7eb", fontSize: "0.9rem" }}>
      <span style={{ fontWeight: 700, color: "#475569", minWidth: 160 }}>{label}:</span>
      <span style={{
        color: highlight ? "#0b1f4d" : "#1f2937",
        fontWeight: highlight ? 800 : 600,
        fontFamily: highlight ? "monospace" : "inherit",
      }}>{value}</span>
    </div>
  );
}

function SummaryFallback({ kind, summary, t, lang }) {
  // fallback عند فشل الجلب — نعرض على الأقل ما تم حفظه وقت التمرين
  const items = [];
  const L = lang === "ar"
    ? { invoice:"رقم الفاتورة", supplier:"المورّد", received:"تاريخ الاستلام", temp:"الحرارة",
        vehicle:"السيارة", driver:"السائق", date:"التاريخ", time:"الوقت", truckTemp:"حرارة الشاحنة",
        product:"المنتج", customer:"الزبون", orderNo:"رقم الطلب" }
    : { invoice:"Invoice", supplier:"Supplier", received:"Received", temp:"Temp",
        vehicle:"Vehicle", driver:"Driver", date:"Date", time:"Time", truckTemp:"Truck Temp",
        product:"Product", customer:"Customer", orderNo:"Order No" };
  if (kind === "shipment") {
    items.push([L.invoice, summary.invoiceNo]);
    items.push([L.supplier, summary.supplier]);
    items.push([L.received, summary.receivedOn]);
    items.push([L.temp, summary.temp ? `${summary.temp}°C` : null]);
  }
  if (kind === "loading") {
    items.push([L.vehicle, summary.vehicleNo]);
    items.push([L.driver, summary.driver]);
    items.push([L.date, summary.reportDate]);
    items.push([L.time, `${summary.timeStart || "—"} → ${summary.timeEnd || "—"}`]);
    items.push([L.truckTemp, summary.tempCheck ? `${summary.tempCheck}°C` : null]);
  }
  if (kind === "finished") {
    const r = summary.productRow || {};
    items.push([L.product, r.product]);
    items.push([L.customer, r.customer]);
    items.push([L.orderNo, r.orderNo]);
    items.push([L.date, summary.reportDate]);
  }
  return (
    <div style={{ marginTop: 8 }}>
      {items.filter(([, v]) => v).map(([l, v]) => <KV key={l} label={l} value={v} />)}
    </div>
  );
}

/* ====== Styles ====== */
const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  box: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 900,
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
    overflow: "hidden",
    direction: "rtl",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  header: {
    color: "#fff",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { margin: 0, fontSize: "1.15rem", fontWeight: 900 },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
  },
  body: {
    overflowY: "auto",
    padding: 18,
    flex: 1,
    background: "#f8fafc",
  },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 700,
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: 14,
    borderRadius: 10,
    fontWeight: 700,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    fontSize: "0.88rem",
    border: "1px solid #e5e7eb",
  },
  th: {
    padding: "8px 10px",
    background: "#f1f5f9",
    fontWeight: 800,
    color: "#0b1f4d",
    border: "1px solid #e5e7eb",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  td: { padding: "7px 10px", border: "1px solid #e5e7eb", color: "#1f2937" },
  tdC: { padding: "7px 10px", border: "1px solid #e5e7eb", color: "#1f2937", textAlign: "center", width: 50 },
  pre: { background: "#fff", padding: 12, borderRadius: 8, fontSize: 12, overflow: "auto" },
};
