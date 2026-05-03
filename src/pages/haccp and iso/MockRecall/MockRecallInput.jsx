// src/pages/haccp and iso/MockRecall/MockRecallInput.jsx
// نموذج تمرين السحب الوهمي / تمرين التتبّع — متطلب ISO 22000 / HACCP
// يحفظ تحت type: "mock_recall_drill"

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SignaturePad from "../../../components/SignaturePad";
import API_BASE from "../../../config/api";
import ReportLookupModal from "../../monitor/branches/_shared/ReportLookupModal";
import { useLang, LangToggle, branchTempTypeFor, pickRowsArray, getDrillFullTitle, BRANCH_ONLY_TEMP_TYPES, branchLabelForType } from "./i18n";
import { useMockRecallConfig } from "./useMockRecallConfig";
import AttachmentsSection from "./AttachmentsSection";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "mock_recall_drill";

const BRANCHES = [
  "Al Qusais (QCS)",
  "FTR 1 — Mushrif Park",
  "FTR 2 — Mamzar Park",
  "POS 10 — Abu Dhabi Butchery",
  "POS 11 — Al Ain Butchery",
  "POS 15 — Al Barsha Butchery",
  "POS 19 — Al Warqa Kitchen (مطبخ الورقاء)",
  "POS 24 — Silicon Oasis",
  "POS 26 — Al Barsha South",
  "Production",
  "Other",
];

const DRILL_TYPE_KEYS = [
  { value: "scheduled",  tk: "drillTypeScheduled" },
  { value: "audit",      tk: "drillTypeAudit" },
  { value: "complaint",  tk: "drillTypeComplaint" },
  { value: "regulatory", tk: "drillTypeRegulatory" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* تحويل أي صيغة تاريخ شائعة إلى YYYY-MM-DD لاستخدامها في input[type="date"] */
function toISODateStr(s) {
  if (!s) return "";
  const str = String(s).trim();
  // أصلاً ISO: YYYY-MM-DD أو YYYY-MM-DDTHH:mm:ss
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD/MM/YYYY أو DD-MM-YYYY
  m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const d = String(m[1]).padStart(2, "0");
    const mo = String(m[2]).padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    return `${y}-${mo}-${d}`;
  }
  // محاولة Date()
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return "";
}

const emptyBackward = () => ({
  material: "",
  supplier: "",
  supplierLot: "",
  dateReceived: "",
  qtyUsed: "",
  qtyUnit: "kg",
  grnRef: "",
});

const emptyForward = () => ({
  customer: "",
  dateDispatched: todayISO(),
  qtyShipped: "",
  qtyUnit: "kg",
  vehicle: "",
  driver: "",
  podConfirmed: false,
});

/* ====== auto-compute helpers ====== */
function computeDuration(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((x) => Number.isNaN(x))) return null;
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // عبور منتصف الليل
  return mins;
}
function fmtDuration(mins) {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function MockRecallInput() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") || null;
  const { t, lang, toggle, dir } = useLang();
  const { config: mrConfig } = useMockRecallConfig();
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  const [editLoadErr, setEditLoadErr] = useState("");
  const [modal, setModal] = useState({ open: false, text: "", kind: "info" });
  const openModal = (text, kind = "info") => setModal({ open: true, text, kind });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const [form, setForm] = useState({
    drillDate: todayISO(),
    drillName: "mock_recall",     // 🆕 تسمية التمرين: mock_recall | traceability
    drillType: "scheduled",
    drillRef: "", // اختياري — رقم تمرين
    triggeredBy: "", // اسم المُحفِّز / الـ auditor

    product: {
      name: "",
      batch: "",
      productionDate: "",
      expiryDate: "",
      qtyProduced: "",
      qtyUnit: "kg",
      temp: "", // 🆕 درجة حرارة المنتج
      branch: "Al Qusais (QCS)",
    },

    backwardTrace: [emptyBackward()],
    forwardTrace: [emptyForward()],

    timing: {
      startTime: nowHHMM(),
      endTime: "",
    },

    results: {
      qtyTraced: "",
      gaps: "",
      correctiveActions: "",
    },

    signoff: {
      conductedBy: "",
      conductedBySignature: "",
      verifiedBy: "",
      verifiedBySignature: "",
    },

    // 🔗 ربط بتقارير موجودة (مرجعية فقط — تُحفظ مع التمرين)
    linked: {
      shipment: null,        // { id, invoiceNo, supplier, receivedOn, temp, shipmentType }
      loadingLog: null,      // { id, vehicleNo, driver, timeStart, timeEnd, tempCheck, reportDate }
      finishedProduct: null, // { id, reportDate, productRow }
      coolers: null,         // { id, date, rowsCount }
      branchTemp: null,      // { id, type, date, branch, rowsCount }
      truckCleaning: null,   // { id, date, truckNo, rowsCount }
    },

    // 📎 مرفقات وصور (Base64) — فواتير/تحويلات/فواتير استرجاع/...
    attachments: [],
  });

  /* ====== أزرار الربط ====== */
  const [lookupKind, setLookupKind] = useState(null); // "shipment" | "loading" | "finished" | "coolers" | "branchTemp" | "truckCleaning" | null
  const closeLookup = () => setLookupKind(null);

  // النوع المتاح للحرارة حسب الفرع المختار
  const branchTempType = branchTempTypeFor(form.product.branch);

  /* ====== 🆕 تحميل تمرين موجود للتعديل ====== */
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoadingExisting(true);
    setEditLoadErr("");
    fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((json) => {
        if (cancelled) return;
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        const target = String(editId);
        // مقارنة مرنة (نص/رقم/مع/بدون _id)
        const found = arr.find((x) => {
          const candidates = [x?.id, x?._id, x?.reportId, x?.payload?.id, x?.payload?._id];
          return candidates.some((c) => c !== undefined && c !== null && String(c) === target);
        });
        if (!found) {
          // عرض تشخيص مساعد للمستخدم
          const sample = arr.slice(0, 3).map((x) => x?.id || x?._id).filter(Boolean).join(", ");
          setEditLoadErr(
            `${t("drillNotFound")} (id=${target.slice(0, 30)})` +
            (sample ? ` | available: ${sample}` : ` | total: ${arr.length}`)
          );
          return;
        }
        const p = typeof found.payload === "string"
                  ? (() => { try { return JSON.parse(found.payload); } catch { return {}; } })()
                  : (found.payload || {});
        // دمج آمن: نُبقي البنية الافتراضية لأي حقل غير موجود
        setForm((prev) => ({
          ...prev,
          ...p,
          product: { ...prev.product, ...(p.product || {}) },
          timing: { ...prev.timing, ...(p.timing || {}) },
          results: { ...prev.results, ...(p.results || {}) },
          signoff: { ...prev.signoff, ...(p.signoff || {}) },
          backwardTrace: Array.isArray(p.backwardTrace) && p.backwardTrace.length
            ? p.backwardTrace : prev.backwardTrace,
          forwardTrace: Array.isArray(p.forwardTrace) && p.forwardTrace.length
            ? p.forwardTrace : prev.forwardTrace,
          linked: { ...prev.linked, ...(p.linked || {}) },
        }));
      })
      .catch((e) => !cancelled && setEditLoadErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoadingExisting(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function pickShipment(item) {
    const p = item?.payload || {};
    const gi = p.generalInfo || {};
    const shipmentInfo = {
      id: item?.id || item?._id || null,
      invoiceNo: gi.invoiceNo || "",
      supplier: gi.supplierName || "",
      receivedOn: gi.receivedOn || p.createdDate || "",
      temp: gi.temperature || "",
      shipmentType: p.shipmentType || "",
      origin: gi.origin || "",
      airwayBill: gi.airwayBill || "",
    };
    // أضف صف Backward Trace جديد بمعلومات الشحنة
    setForm((s) => ({
      ...s,
      linked: { ...s.linked, shipment: shipmentInfo },
      backwardTrace: [
        ...s.backwardTrace.filter((r) => r.material || r.supplier), // احفظ ما هو ممتلئ
        {
          material: p.shipmentType || "Raw Material",
          supplier: shipmentInfo.supplier,
          supplierLot: shipmentInfo.airwayBill || shipmentInfo.invoiceNo,
          dateReceived: String(shipmentInfo.receivedOn || "").slice(0, 10),
          qtyUsed: "",
          qtyUnit: "kg",
          grnRef: shipmentInfo.invoiceNo,
        },
      ],
    }));
  }

  function pickLoadingLog(ctx) {
    // ctx من flatten: { report, payload, sub, subIdx }
    const report = ctx?.report || ctx;
    const p = ctx?.payload || report?.payload || {};
    // LoadingLog يحفظ المصفوفة باسم rows (وليس vehicles) — ندعم كليهما للمستقبل
    const arr = Array.isArray(p.rows) ? p.rows : Array.isArray(p.vehicles) ? p.vehicles : [];
    const v = ctx?.sub || arr[0] || p;
    const info = {
      id: report?.id || report?._id || null,
      reportDate: p.reportDate || p.date || "",
      vehicleNo: v?.vehicleNo || "",
      driver: v?.driverName || "",
      timeStart: v?.timeStart || "",
      timeEnd: v?.timeEnd || "",
      tempCheck: v?.tempCheck || "",
      vehicleIndex: ctx?.subIdx ?? -1,
      vehiclesCount: arr.length,
    };
    setForm((s) => {
      // املأ Forward Trace بأول صف بيانات السيارة
      const fwd = [...s.forwardTrace];
      const targetIdx = fwd.findIndex((r) => !r.vehicle && !r.customer);
      const newRow = {
        customer: "",
        dateDispatched: String(info.reportDate || "").slice(0, 10),
        qtyShipped: "",
        qtyUnit: "kg",
        vehicle: info.vehicleNo,
        driver: info.driver,
        podConfirmed: false,
      };
      if (targetIdx >= 0) fwd[targetIdx] = newRow;
      else fwd.push(newRow);
      return {
        ...s,
        linked: { ...s.linked, loadingLog: info },
        forwardTrace: fwd,
      };
    });
  }

  function pickFinishedProduct(ctx) {
    // ctx من flatten: { report, payload, sub, subIdx }
    const report = ctx?.report || ctx;
    const p = ctx?.payload || report?.payload || {};
    const products = Array.isArray(p.products) ? p.products : [];
    const row = ctx?.sub || products[0] || {};
    const info = {
      id: report?.id || report?._id || null,
      reportDate: p.reportDate || "",
      productsCount: products.length,
      productIndex: ctx?.subIdx ?? -1,
      productRow: row,
    };
    // 🆕 تحويل تواريخ DD/MM/YYYY (صيغة Final Product) إلى YYYY-MM-DD
    const slaughterISO = toISODateStr(row.slaughterDate);
    const expiryISO    = toISODateStr(row.expiryDate);
    const reportDateISO = toISODateStr(p.reportDate);
    setForm((s) => ({
      ...s,
      linked: { ...s.linked, finishedProduct: info },
      product: {
        ...s.product,
        name: row.product || s.product.name,
        batch: row.orderNo || s.product.batch,
        productionDate: slaughterISO || reportDateISO || s.product.productionDate,
        expiryDate: expiryISO || s.product.expiryDate,
        qtyProduced: row.quantity || s.product.qtyProduced,
        qtyUnit: row.unitOfMeasure || s.product.qtyUnit,
        temp: (row.temp !== "" && row.temp !== null && row.temp !== undefined)
              ? String(row.temp)
              : s.product.temp, // 🆕 درجة حرارة المنتج من التقرير
      },
    }));
  }

  function unlink(kind) {
    setForm((s) => ({ ...s, linked: { ...s.linked, [kind]: null } }));
  }

  /* 🆕 Coolers picker */
  function pickCoolers(item) {
    const p = item?.payload || {};
    const info = {
      id: item?.id || item?._id || null,
      date: p.reportDate || p.date || "",
      rowsCount: pickRowsArray(p).length,
      checkedBy: p.checkedBy,
      verifiedBy: p.verifiedBy || p.verifiedByManager,
    };
    setForm((s) => ({ ...s, linked: { ...s.linked, coolers: info } }));
  }

  /* 🆕 Branch Temperature picker — يأخذ النوع من المصدر الفعلي للتقرير */
  function pickBranchTemp(item) {
    const p = item?.payload || {};
    const sourceType = p?.__sourceType || item?._sourceType || branchTempType;
    const info = {
      id: item?.id || item?._id || null,
      type: sourceType,
      date: p.reportDate || p.date || "",
      branch: p.branch || branchLabelForType(sourceType) || form.product.branch,
      rowsCount: pickRowsArray(p).length,
    };
    setForm((s) => ({ ...s, linked: { ...s.linked, branchTemp: info } }));
  }

  /* 🆕 Truck Cleaning picker (flatten by truck row) */
  function pickTruckCleaning(ctx) {
    const report = ctx?.report || ctx;
    const p = ctx?.payload || report?.payload || {};
    const sub = ctx?.sub || (Array.isArray(p.rows) ? p.rows[0] : null) || {};
    const info = {
      id: report?.id || report?._id || null,
      date: p.date || p.reportDate || "",
      truckNo: sub?.truckNo || "",
      truckIndex: ctx?.subIdx ?? -1,
      cleaningRow: sub,
    };
    setForm((s) => ({ ...s, linked: { ...s.linked, truckCleaning: info } }));
  }

  /* ====== setters ====== */
  const setRoot = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setNested = (group, k, v) =>
    setForm((s) => ({ ...s, [group]: { ...s[group], [k]: v } }));
  const setRow = (group, i, k, v) =>
    setForm((s) => {
      const arr = [...s[group]];
      arr[i] = { ...arr[i], [k]: v };
      return { ...s, [group]: arr };
    });
  const addBackward = () =>
    setForm((s) => ({ ...s, backwardTrace: [...s.backwardTrace, emptyBackward()] }));
  const removeBackward = (i) =>
    setForm((s) => ({
      ...s,
      backwardTrace: s.backwardTrace.filter((_, idx) => idx !== i),
    }));
  const addForward = () =>
    setForm((s) => ({ ...s, forwardTrace: [...s.forwardTrace, emptyForward()] }));
  const removeForward = (i) =>
    setForm((s) => ({
      ...s,
      forwardTrace: s.forwardTrace.filter((_, idx) => idx !== i),
    }));

  /* ====== auto KPIs (تستخدم العتبات من الإعدادات) ====== */
  const passPctTh = Number(mrConfig.passPctThreshold) || 99;
  const maxDurMin = Number(mrConfig.maxDurationMinutes) || 240;
  const kpis = useMemo(() => {
    const durMin = computeDuration(form.timing.startTime, form.timing.endTime);
    const qtyP = parseFloat(form.product.qtyProduced) || 0;
    const qtyT = parseFloat(form.results.qtyTraced) || 0;
    const pct = qtyP > 0 ? (qtyT / qtyP) * 100 : null;
    const passQty = pct !== null && pct >= passPctTh;
    const passTime = durMin !== null && durMin <= maxDurMin;
    const overall = pct !== null && durMin !== null ? (passQty && passTime) : null;
    return { durMin, pct, passQty, passTime, overall };
  }, [form.timing, form.product.qtyProduced, form.results.qtyTraced, passPctTh, maxDurMin]);

  /* ====== save ====== */
  async function handleSave() {
    if (!form.product.name.trim()) return alert("⚠️ " + t("productName"));
    if (!form.product.batch.trim()) return alert("⚠️ " + t("batchNo"));
    if (!form.signoff.conductedBy.trim()) return alert("⚠️ " + t("conductedBy"));

    setSaving(true);
    openModal(t("saving"), "info");

    try {
      const payload = {
        ...form,
        autoKpi: {
          durationMinutes: kpis.durMin,
          tracedPct: kpis.pct,
          passQty: kpis.passQty,
          passTime: kpis.passTime,
          overallPass: kpis.overall,
        },
        savedAt: new Date().toISOString(),
      };

      const isEditing = !!editId;
      const url = isEditing
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = isEditing ? "PUT" : "POST";
      // PUT مع type في query للتوافق مع المسارات الموجودة
      const finalUrl = isEditing
        ? `${url}?type=${encodeURIComponent(TYPE)}`
        : url;

      const res = await fetch(finalUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: form.signoff.conductedBy || "QA",
          type: TYPE,
          payload,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const baseMsg = isEditing ? t("updated") : t("saved");
      const suffix = kpis.overall === true ? ` — ${t("savedPass")}` :
                     kpis.overall === false ? ` — ${t("savedFail")}` : "";
      openModal(`${baseMsg}${suffix}`,
        kpis.overall === false ? "warn" : "success"
      );
      setTimeout(() => {
        closeModal();
        navigate("/haccp-iso/mock-recall/view");
      }, 1500);
    } catch (e) {
      console.error(e);
      openModal(`${t("saveFailed")}: ${e?.message || e}`, "error");
      setTimeout(closeModal, 2200);
    } finally {
      setSaving(false);
    }
  }

  /* ====== UI ====== */
  return (
    <div style={{ ...S.shell, direction: dir }}>
      <div style={S.frame}>
        {/* Language toggle + edit indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
          {editId ? (
            <div style={{
              background: "linear-gradient(135deg,#fff7ed,#fed7aa)",
              border: "1.5px solid #fb923c",
              color: "#9a3412",
              padding: "8px 14px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: "0.92rem",
              boxShadow: "0 2px 6px rgba(251,146,60,0.25)",
            }}>
              {t("editingMode")}
            </div>
          ) : <span />}
          <LangToggle lang={lang} toggle={toggle} />
        </div>

        {/* رسالة تحميل / خطأ تحميل */}
        {loadingExisting && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af",
            padding: 12, borderRadius: 10, marginBottom: 12, fontWeight: 700, textAlign: "center" }}>
            {t("loadingDrill")}
          </div>
        )}
        {editLoadErr && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b",
            padding: 12, borderRadius: 10, marginBottom: 12, fontWeight: 700 }}>
            {editLoadErr}
          </div>
        )}

        {/* ===== Al Mawashi Header ===== */}
        <div style={S.brandTable}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td rowSpan={3} style={S.brandLogo}>
                  <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                    AL<br />MAWASHI
                  </div>
                </td>
                <td style={S.headerCell}>
                  <b>{t("docTitle")}:</b> {getDrillFullTitle(form.drillName, lang)}
                </td>
                <td style={S.headerCell}>
                  <b>{t("docNo")}:</b> FS-QM/REC/MR
                </td>
              </tr>
              <tr>
                <td style={S.headerCell}>
                  <b>{t("issueDate")}:</b> 05/02/2020
                </td>
                <td style={S.headerCell}>
                  <b>{t("revisionNo")}:</b> 01
                </td>
              </tr>
              <tr>
                <td style={S.headerCell}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b>{t("drillDate")}:</b>
                    <input
                      type="date"
                      value={form.drillDate}
                      onChange={(e) => setRoot("drillDate", e.target.value)}
                      style={{
                        padding: "4px 8px",
                        border: "1.5px solid #2563eb",
                        borderRadius: 6,
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        background: "#fff",
                        color: "#0b1f4d",
                        cursor: "pointer",
                      }}
                      title={t("drillDate")}
                    />
                  </div>
                </td>
                <td style={S.headerCell}>
                  <b>{t("reference")}:</b> {form.drillRef || t("auto")}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={S.brandStrip}>
            {getDrillFullTitle(form.drillName, lang)}
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <HaccpLinkBadge clauses={["8.3", "8.9"]} label={lang === "ar" ? "التتبع + السحب/الاسترجاع" : "Traceability + Withdrawal/Recall"} />
          </div>
        </div>

        {/* ===== KPI Bar ===== */}
        <div style={S.kpiRow}>
          <KPI
            icon="⏱️"
            label={t("duration")}
            value={fmtDuration(kpis.durMin)}
            sub={lang === "ar"
              ? `الحد: ${Math.floor(maxDurMin / 60)}h ${maxDurMin % 60 ? `${maxDurMin % 60}m` : ""}`
              : `Limit: ${Math.floor(maxDurMin / 60)}h ${maxDurMin % 60 ? `${maxDurMin % 60}m` : ""}`}
            ok={kpis.passTime}
            bad={kpis.passTime === false}
          />
          <KPI
            icon="📊"
            label={t("tracedPct")}
            value={kpis.pct !== null ? `${kpis.pct.toFixed(1)}%` : "—"}
            sub={lang === "ar" ? `الحد: ≥ ${passPctTh}%` : `Limit: ≥ ${passPctTh}%`}
            ok={kpis.passQty}
            bad={kpis.passQty === false}
          />
          <KPI
            icon={kpis.overall === true ? "✅" : kpis.overall === false ? "❌" : "⏳"}
            label={t("result")}
            value={kpis.overall === true ? t("pass") : kpis.overall === false ? t("fail") : "—"}
            sub={lang === "ar"
              ? `≥ ${passPctTh}% خلال ${Math.floor(maxDurMin / 60)}h`
              : `≥ ${passPctTh}% within ${Math.floor(maxDurMin / 60)}h`}
            ok={kpis.overall === true}
            bad={kpis.overall === false}
          />
        </div>

        {/* ===== Section: 🔗 ربط بتقارير موجودة ===== */}
        <Section title={t("linkedReports")}>
          <div style={{ color: "#475569", fontSize: "0.88rem", marginBottom: 10, lineHeight: 1.6 }}>
            {t("linkedReportsHint")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {/* Shipment */}
            <LinkCard
              icon="📦"
              title={t("shipmentTitle")}
              subtitle={t("shipmentHint")}
              pickHere={t("pickHere")}
              linkedLabel={t("linked")}
              unlinkLabel={t("unlink")}
              picked={form.linked.shipment}
              onPick={() => setLookupKind("shipment")}
              onUnlink={() => unlink("shipment")}
              renderPicked={(d) => (
                <>
                  <div><b>{t("grnRef")}:</b> {d.invoiceNo || "—"}</div>
                  <div><b>{t("supplier")}:</b> {d.supplier || "—"}</div>
                  <div><b>{t("dateReceived")}:</b> {String(d.receivedOn || "").slice(0, 10)}</div>
                  {d.temp !== "" && d.temp !== undefined && <div><b>{t("duration")}:</b> {d.temp}°C</div>}
                </>
              )}
            />

            {/* Loading Log */}
            <LinkCard
              icon="🚚"
              title={t("loadingTitle")}
              subtitle={t("loadingHint")}
              pickHere={t("pickHere")}
              linkedLabel={t("linked")}
              unlinkLabel={t("unlink")}
              picked={form.linked.loadingLog}
              onPick={() => setLookupKind("loading")}
              onUnlink={() => unlink("loadingLog")}
              renderPicked={(d) => (
                <>
                  <div><b>{t("vehicle")}:</b> {d.vehicleNo || "—"}</div>
                  <div><b>{t("driver")}:</b> {d.driver || "—"}</div>
                  <div><b>{t("drillDate")}:</b> {String(d.reportDate || "").slice(0, 10)}</div>
                  <div><b>{t("startTime")} → {t("endTime")}:</b> {d.timeStart || "—"} → {d.timeEnd || "—"}</div>
                  {d.tempCheck !== "" && d.tempCheck !== undefined && <div><b>Truck Temp:</b> {d.tempCheck}°C</div>}
                </>
              )}
            />

            {/* Finished Product */}
            <LinkCard
              icon="🏷️"
              title={t("finishedTitle")}
              subtitle={t("finishedHint")}
              pickHere={t("pickHere")}
              linkedLabel={t("linked")}
              unlinkLabel={t("unlink")}
              picked={form.linked.finishedProduct}
              onPick={() => setLookupKind("finished")}
              onUnlink={() => unlink("finishedProduct")}
              renderPicked={(d) => {
                const row = d.productRow || {};
                return (
                  <>
                    <div><b>{t("productName").replace(" *","")}:</b> {row.product || "—"}</div>
                    <div><b>{t("customer")}:</b> {row.customer || "—"}</div>
                    <div><b>Order No:</b> {row.orderNo || "—"}</div>
                    <div><b>{t("drillDate")}:</b> {String(d.reportDate || "").slice(0, 10)}</div>
                  </>
                );
              }}
            />

            {/* 🆕 Coolers (QCS) */}
            <LinkCard
              icon="🧊"
              title={t("coolersTitle")}
              subtitle={t("coolersHint")}
              pickHere={t("pickHere")}
              linkedLabel={t("linked")}
              unlinkLabel={t("unlink")}
              picked={form.linked.coolers}
              onPick={() => setLookupKind("coolers")}
              onUnlink={() => unlink("coolers")}
              renderPicked={(d) => (
                <>
                  <div><b>{t("drillDate")}:</b> {String(d.date || "").slice(0, 10)}</div>
                  <div><b>{t("items").replace(/[📦]/g, "").trim()}:</b> {d.rowsCount}</div>
                  {d.checkedBy && <div><b>{t("checkedBy") || "Checked"}:</b> {d.checkedBy}</div>}
                </>
              )}
            />

            {/* 🆕 Branch Temperature — يفتح كل أنواع تقارير الحرارة */}
            <LinkCard
              icon="🌡️"
              title={t("branchTempTitle")}
              subtitle={lang === "ar"
                ? "اختر سجل حرارة من أي فرع — كل الأنواع متاحة"
                : "Pick a temperature log from any branch — all types available"}
              pickHere={t("pickHere")}
              linkedLabel={t("linked")}
              unlinkLabel={t("unlink")}
              picked={form.linked.branchTemp}
              onPick={() => setLookupKind("branchTemp")}
              onUnlink={() => unlink("branchTemp")}
              renderPicked={(d) => (
                <>
                  <div><b>{t("branch")}:</b> {d.branch || "—"}</div>
                  <div><b>{t("drillDate")}:</b> {String(d.date || "").slice(0, 10)}</div>
                  <div><b>{t("items").replace(/[📦]/g, "").trim()}:</b> {d.rowsCount}</div>
                </>
              )}
            />

            {/* 🆕 Truck Cleaning */}
            <LinkCard
              icon="🧼"
              title={t("truckCleaningTitle")}
              subtitle={form.linked.loadingLog?.vehicleNo
                ? `${t("truckCleaningHint")} — ${form.linked.loadingLog.vehicleNo}`
                : t("pickLoadingFirst")}
              pickHere={t("pickHere")}
              linkedLabel={t("linked")}
              unlinkLabel={t("unlink")}
              picked={form.linked.truckCleaning}
              onPick={() => setLookupKind("truckCleaning")}
              onUnlink={() => unlink("truckCleaning")}
              renderPicked={(d) => (
                <>
                  <div><b>{t("truckNo")}:</b> {d.truckNo || "—"}</div>
                  <div><b>{t("drillDate")}:</b> {String(d.date || "").slice(0, 10)}</div>
                </>
              )}
            />
          </div>
        </Section>

        {/* ===== Section: Drill Info ===== */}
        <Section title={t("drillInfo")}>
          {/* 🆕 اختيار تسمية التمرين (segmented buttons) */}
          <Field label={t("drillName")}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { value: "mock_recall",  tk: "drillNameMockRecall" },
                { value: "traceability", tk: "drillNameTraceability" },
              ].map((opt) => {
                const active = form.drillName === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRoot("drillName", opt.value)}
                    style={{
                      flex: "1 1 220px",
                      padding: "12px 16px",
                      border: active ? "2px solid #059669" : "2px solid #e5e7eb",
                      borderRadius: 12,
                      background: active
                        ? "linear-gradient(135deg,#ecfdf5,#d1fae5)"
                        : "#fff",
                      color: active ? "#065f46" : "#0b1f4d",
                      fontWeight: 800,
                      fontSize: "1rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: active ? "0 4px 12px rgba(5,150,105,0.15)" : "none",
                      transition: "all .15s ease",
                    }}
                  >
                    {t(opt.tk)}
                    {active && <span style={{ marginInlineStart: 8 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ ...S.grid3, marginTop: 14 }}>
            <Field label={t("drillDate")}>
              <input type="date" style={S.input}
                value={form.drillDate}
                onChange={(e) => setRoot("drillDate", e.target.value)} />
            </Field>
            <Field label={t("drillType")}>
              <select style={S.input}
                value={form.drillType}
                onChange={(e) => setRoot("drillType", e.target.value)}>
                {DRILL_TYPE_KEYS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.tk)}</option>
                ))}
              </select>
            </Field>
            <Field label={t("drillRef")}>
              <input style={S.input}
                value={form.drillRef}
                placeholder="e.g. MR-2026-Q2-01"
                onChange={(e) => setRoot("drillRef", e.target.value)} />
            </Field>
            <Field label={t("triggeredBy")}>
              <input style={S.input}
                value={form.triggeredBy}
                placeholder={t("triggeredByPlaceholder")}
                onChange={(e) => setRoot("triggeredBy", e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ===== Section: Selected Product ===== */}
        <Section title={t("selectedProduct")}>
          <div style={S.grid3}>
            <Field label={t("productName")}>
              <input style={S.input}
                value={form.product.name}
                onChange={(e) => setNested("product", "name", e.target.value)} />
            </Field>
            <Field label={t("batchNo")}>
              <input style={S.input}
                value={form.product.batch}
                onChange={(e) => setNested("product", "batch", e.target.value)} />
            </Field>
            <Field label={t("branch")}>
              <select style={S.input}
                value={form.product.branch}
                onChange={(e) => setNested("product", "branch", e.target.value)}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label={t("productionDate")}>
              <input type="date" style={S.input}
                value={form.product.productionDate}
                onChange={(e) => setNested("product", "productionDate", e.target.value)} />
            </Field>
            <Field label={t("expiryDate")}>
              <input type="date" style={S.input}
                value={form.product.expiryDate}
                onChange={(e) => setNested("product", "expiryDate", e.target.value)} />
            </Field>
            <Field label={t("qtyProduced")}>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" min="0" step="0.01" style={{ ...S.input, flex: 1 }}
                  value={form.product.qtyProduced}
                  onChange={(e) => setNested("product", "qtyProduced", e.target.value)} />
                <select style={{ ...S.input, width: 70 }}
                  value={form.product.qtyUnit}
                  onChange={(e) => setNested("product", "qtyUnit", e.target.value)}>
                  <option>kg</option><option>units</option><option>boxes</option>
                </select>
              </div>
            </Field>
            {/* 🆕 درجة حرارة المنتج */}
            <Field label={t("productTemp")}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" step="0.1" style={{ ...S.input, flex: 1 }}
                  value={form.product.temp}
                  placeholder="—"
                  onChange={(e) => setNested("product", "temp", e.target.value)} />
                <span style={{ fontWeight: 700, color: "#475569", padding: "0 6px" }}>°C</span>
              </div>
            </Field>
          </div>
        </Section>

        {/* ===== Section: Backward Trace ===== */}
        <Section title={t("backwardTrace")}>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr style={S.thRow}>
                  <th style={S.th}>#</th>
                  <th style={S.th}>{t("rawMaterial")}</th>
                  <th style={S.th}>{t("supplier")}</th>
                  <th style={S.th}>{t("supplierLot")}</th>
                  <th style={S.th}>{t("dateReceived")}</th>
                  <th style={S.th}>{t("qtyUsed")}</th>
                  <th style={S.th}>{t("grnRef")}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {form.backwardTrace.map((r, i) => (
                  <tr key={i}>
                    <td style={S.tdCenter}>{i + 1}</td>
                    <td style={S.td}><input style={S.input} value={r.material}
                      onChange={(e) => setRow("backwardTrace", i, "material", e.target.value)} /></td>
                    <td style={S.td}><input style={S.input} value={r.supplier}
                      onChange={(e) => setRow("backwardTrace", i, "supplier", e.target.value)} /></td>
                    <td style={S.td}><input style={S.input} value={r.supplierLot}
                      onChange={(e) => setRow("backwardTrace", i, "supplierLot", e.target.value)} /></td>
                    <td style={S.td}><input type="date" style={S.input} value={r.dateReceived}
                      onChange={(e) => setRow("backwardTrace", i, "dateReceived", e.target.value)} /></td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input type="number" min="0" step="0.01" style={{ ...S.input, flex: 1 }}
                          value={r.qtyUsed}
                          onChange={(e) => setRow("backwardTrace", i, "qtyUsed", e.target.value)} />
                        <select style={{ ...S.input, width: 60 }}
                          value={r.qtyUnit}
                          onChange={(e) => setRow("backwardTrace", i, "qtyUnit", e.target.value)}>
                          <option>kg</option><option>L</option><option>units</option>
                        </select>
                      </div>
                    </td>
                    <td style={S.td}><input style={S.input} value={r.grnRef}
                      onChange={(e) => setRow("backwardTrace", i, "grnRef", e.target.value)} /></td>
                    <td style={S.tdCenter}>
                      <button type="button" onClick={() => removeBackward(i)} style={S.btnDanger}>✖</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addBackward} style={S.btnLight}>{t("addMaterial")}</button>
        </Section>

        {/* ===== Section: Forward Trace ===== */}
        <Section title={t("forwardTrace")}>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr style={S.thRow}>
                  <th style={S.th}>#</th>
                  <th style={S.th}>{t("customer")}</th>
                  <th style={S.th}>{t("dateDispatched")}</th>
                  <th style={S.th}>{t("qtyShipped")}</th>
                  <th style={S.th}>{t("vehicle")}</th>
                  <th style={S.th}>{t("driver")}</th>
                  <th style={S.th}>{t("pod")}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {form.forwardTrace.map((r, i) => (
                  <tr key={i}>
                    <td style={S.tdCenter}>{i + 1}</td>
                    <td style={S.td}><input style={S.input} value={r.customer}
                      onChange={(e) => setRow("forwardTrace", i, "customer", e.target.value)} /></td>
                    <td style={S.td}><input type="date" style={S.input} value={r.dateDispatched}
                      onChange={(e) => setRow("forwardTrace", i, "dateDispatched", e.target.value)} /></td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input type="number" min="0" step="0.01" style={{ ...S.input, flex: 1 }}
                          value={r.qtyShipped}
                          onChange={(e) => setRow("forwardTrace", i, "qtyShipped", e.target.value)} />
                        <select style={{ ...S.input, width: 60 }}
                          value={r.qtyUnit}
                          onChange={(e) => setRow("forwardTrace", i, "qtyUnit", e.target.value)}>
                          <option>kg</option><option>units</option><option>boxes</option>
                        </select>
                      </div>
                    </td>
                    <td style={S.td}><input style={S.input} value={r.vehicle}
                      onChange={(e) => setRow("forwardTrace", i, "vehicle", e.target.value)} /></td>
                    <td style={S.td}><input style={S.input} value={r.driver}
                      onChange={(e) => setRow("forwardTrace", i, "driver", e.target.value)} /></td>
                    <td style={S.tdCenter}>
                      <input type="checkbox" checked={r.podConfirmed}
                        onChange={(e) => setRow("forwardTrace", i, "podConfirmed", e.target.checked)} />
                    </td>
                    <td style={S.tdCenter}>
                      <button type="button" onClick={() => removeForward(i)} style={S.btnDanger}>✖</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addForward} style={S.btnLight}>{t("addDistribution")}</button>
        </Section>

        {/* ===== Section: Timing & Results ===== */}
        <Section title={t("timingResults")}>
          <div style={S.grid3}>
            <Field label={t("startTime")}>
              <input type="time" style={S.input}
                value={form.timing.startTime}
                onChange={(e) => setNested("timing", "startTime", e.target.value)} />
            </Field>
            <Field label={t("endTime")}>
              <input type="time" style={S.input}
                value={form.timing.endTime}
                onChange={(e) => setNested("timing", "endTime", e.target.value)} />
            </Field>
            <Field label={t("qtyTraced")}>
              <input type="number" min="0" step="0.01" style={S.input}
                value={form.results.qtyTraced}
                placeholder={t("qtyTracedPlaceholder", { qty: form.product.qtyProduced || 0, unit: form.product.qtyUnit })}
                onChange={(e) => setNested("results", "qtyTraced", e.target.value)} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label={t("gaps")}>
              <textarea rows={3} style={{ ...S.input, fontFamily: "inherit" }}
                value={form.results.gaps}
                placeholder={t("gapsPlaceholder")}
                onChange={(e) => setNested("results", "gaps", e.target.value)} />
            </Field>
          </div>
          <div style={{ marginTop: 8 }}>
            <Field label={t("correctiveActions")}>
              <textarea rows={3} style={{ ...S.input, fontFamily: "inherit" }}
                value={form.results.correctiveActions}
                placeholder={t("correctiveActionsPlaceholder")}
                onChange={(e) => setNested("results", "correctiveActions", e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ===== Section: Sign-off ===== */}
        <Section title={t("signoff")}>
          <div style={S.grid2}>
            <Field label={t("conductedBy")}>
              <input style={S.input}
                value={form.signoff.conductedBy}
                onChange={(e) => setNested("signoff", "conductedBy", e.target.value)} />
            </Field>
            <Field label={t("verifiedBy")}>
              <input style={S.input}
                value={form.signoff.verifiedBy}
                onChange={(e) => setNested("signoff", "verifiedBy", e.target.value)} />
            </Field>
          </div>
          <div style={{ ...S.grid2, marginTop: 12 }}>
            <SignaturePad
              label={`${t("conductedSig")}${form.signoff.conductedBy ? ` (${form.signoff.conductedBy})` : ""}`}
              value={form.signoff.conductedBySignature}
              onChange={(v) => setNested("signoff", "conductedBySignature", v)}
              width={380}
              height={120}
            />
            <SignaturePad
              label={`${t("verifiedSig")}${form.signoff.verifiedBy ? ` (${form.signoff.verifiedBy})` : ""}`}
              value={form.signoff.verifiedBySignature}
              onChange={(v) => setNested("signoff", "verifiedBySignature", v)}
              width={380}
              height={120}
            />
          </div>
        </Section>

        {/* ===== 📎 Section: Attachments ===== */}
        <Section title={t("attachments")}>
          <AttachmentsSection
            value={form.attachments}
            onChange={(next) => setRoot("attachments", next)}
            t={t}
            lang={lang}
            dir={dir}
          />
        </Section>

        {/* ===== Save ===== */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
          {editId && (
            <button
              type="button"
              onClick={() => navigate("/haccp-iso/mock-recall/view")}
              style={{
                ...S.btnSecondary,
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
              }}
            >
              {t("cancelEdit")}
            </button>
          )}
          <button type="button" onClick={() => navigate("/haccp-iso/mock-recall/view")}
            style={S.btnSecondary}>{t("viewPast")}</button>
          <button type="button" onClick={handleSave} disabled={saving || loadingExisting}
            style={{ ...S.btnPrimary, opacity: (saving || loadingExisting) ? 0.6 : 1 }}>
            {saving ? t("saving") : (editId ? t("update") : t("save"))}
          </button>
        </div>

        {modal.open && (
          <div style={S.modalOverlay}>
            <div style={{
              ...S.modalBox,
              borderTopColor:
                modal.kind === "success" ? "#22c55e" :
                modal.kind === "warn" ? "#f59e0b" :
                modal.kind === "error" ? "#ef4444" : "#2563eb",
            }}>
              <strong style={{ fontSize: 16 }}>{modal.text}</strong>
              <div style={{ textAlign: "right", marginTop: 10 }}>
                <button onClick={closeModal} style={S.btnLight}>{t("close")}</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Lookup Modals ===== */}
        <ReportLookupModal
          open={lookupKind === "shipment"}
          onClose={closeLookup}
          onPick={pickShipment}
          type="qcs_raw_material"
          title={lang === "ar" ? "🔍 ابحث في تقارير استلام الشحنات" : "🔍 Search Shipment Receiving Reports"}
          searchPlaceholder={lang === "ar" ? "رقم الفاتورة / المورّد / النوع" : "Invoice No / Supplier / Type"}
          treeMode={true}
          getDate={(p) => p?.generalInfo?.receivedOn || p?.createdDate || p?.generalInfo?.inspectionDate || ""}
          searchFields={(p) => [
            p?.generalInfo?.invoiceNo,
            p?.generalInfo?.airwayBill,
            p?.generalInfo?.supplierName,
            p?.shipmentType,
            p?.createdDate,
            p?.generalInfo?.receivedOn,
            p?.generalInfo?.brand,
            p?.generalInfo?.origin,
          ]}
          displayItem={(p) => {
            const gi = p?.generalInfo || {};
            return {
              primary: `🧾 ${gi.invoiceNo || gi.airwayBill || (lang === "ar" ? "(بدون رقم)" : "(no number)")} — ${p?.shipmentType || "Raw Material"}`,
              secondary: `${gi.supplierName || "—"} · ${String(gi.receivedOn || p?.createdDate || "").slice(0, 10)}`,
              chips: [
                gi.temperature !== "" && gi.temperature !== undefined ? `🌡️ ${gi.temperature}°C` : null,
                gi.origin ? `📍 ${gi.origin}` : null,
                gi.brand ? `🏷️ ${gi.brand}` : null,
              ].filter(Boolean),
            };
          }}
          emptyText={lang === "ar"
            ? "لا توجد شحنات مستلمة محفوظة."
            : "No saved shipment receiving reports."}
        />

        <ReportLookupModal
          open={lookupKind === "loading"}
          onClose={closeLookup}
          onPick={pickLoadingLog}
          type="cars_loading_inspection"
          title="🔍 ابحث عن سيارة محدّدة في تقارير التحميل"
          searchPlaceholder="رقم السيارة / السائق / التاريخ / 2026-05"
          flatten={(report) => {
            const p = report?.payload || {};
            // LoadingLog الفعلي يحفظ في p.rows ، نتعامل أيضاً مع p.vehicles احتياطياً
            const arr = Array.isArray(p.rows) ? p.rows
                       : Array.isArray(p.vehicles) ? p.vehicles
                       : [];
            if (!arr.length) return []; // تجاهل التقارير الفاضية
            return arr.map((v, idx) => ({ sub: v, subIdx: idx }));
          }}
          treeMode={true}
          getDate={({ payload }) => payload?.reportDate || payload?.date || ""}
          searchFields={({ payload, sub }) => [
            sub?.vehicleNo,
            sub?.driverName,
            sub?.timeStart,
            sub?.timeEnd,
            payload?.reportDate,
            payload?.date,
          ]}
          displayItem={({ payload, sub, subIdx }) => {
            const v = sub || {};
            const date = String(payload?.reportDate || payload?.date || "").slice(0, 10);
            return {
              primary: `🚚 ${v.vehicleNo || "(بدون سيارة)"} — ${v.driverName || "—"}`,
              secondary: `📅 ${date} · #${(subIdx ?? 0) + 1} في تقرير اليوم`,
              chips: [
                v.timeStart && v.timeEnd ? `⏰ ${v.timeStart} → ${v.timeEnd}` : null,
                v.tempCheck !== "" && v.tempCheck !== undefined ? `🌡️ ${v.tempCheck}°C` : null,
              ].filter(Boolean),
            };
          }}
          emptyText="لا توجد تقارير تحميل محفوظة."
        />

        <ReportLookupModal
          open={lookupKind === "finished"}
          onClose={closeLookup}
          onPick={pickFinishedProduct}
          type="finished_products_report"
          title="🔍 ابحث عن منتج محدّد في تقارير المنتج النهائي"
          searchPlaceholder="منتج / زبون / Order No / تاريخ"
          flatten={(report) => {
            const p = report?.payload || {};
            const products = Array.isArray(p.products) ? p.products : [];
            if (!products.length) return []; // تجاهل التقارير الفاضية
            return products.map((row, idx) => ({ sub: row, subIdx: idx }));
          }}
          treeMode={true}
          getDate={({ payload }) => payload?.reportDate || ""}
          searchFields={({ payload, sub }) => [
            sub?.product,
            sub?.customer,
            sub?.orderNo,
            payload?.reportDate,
          ]}
          displayItem={({ payload, sub, subIdx }) => {
            const r = sub || {};
            return {
              primary: `🏷️ ${r.product || "(بدون منتج)"} — ${r.customer || "—"}`,
              secondary: `📅 ${payload?.reportDate || "—"} · Order: ${r.orderNo || "—"}`,
              chips: [
                r.quantity ? `${r.quantity} ${r.unitOfMeasure || "kg"}` : null,
                r.temp !== "" && r.temp !== undefined ? `🌡️ ${r.temp}°C` : null,
                r.expiryDate ? `Exp: ${r.expiryDate}` : null,
              ].filter(Boolean),
            };
          }}
          emptyText="لا توجد تقارير منتج نهائي محفوظة."
        />

        {/* 🆕 Coolers Lookup (QCS) */}
        <ReportLookupModal
          open={lookupKind === "coolers"}
          onClose={closeLookup}
          onPick={pickCoolers}
          type="qcs-coolers"
          title={t("popupCoolers")}
          searchPlaceholder={t("drillDate")}
          treeMode={true}
          getDate={(p) => p?.reportDate || p?.date || ""}
          searchFields={(p) => [p?.reportDate, p?.date, p?.checkedBy, p?.verifiedBy, p?.verifiedByManager]}
          displayItem={(p) => {
            const arr = pickRowsArray(p);
            return {
              primary: `🧊 ${String(p?.reportDate || p?.date || "—").slice(0, 10)}`,
              secondary: `${arr.length} ${lang === "ar" ? "برّاد/سجل" : "rows"}`,
              chips: [
                p?.checkedBy ? `✍ ${p.checkedBy}` : null,
                p?.verifiedByManager ? `👔 ${p.verifiedByManager}` : null,
                p?.chemicalUsed ? `🧴 ${p.chemicalUsed}` : null,
              ].filter(Boolean),
            };
          }}
          emptyText={lang === "ar"
            ? "لا توجد سجلات حرارة برّادات (qcs-coolers). تأكد من وجود تقارير محفوظة."
            : "No coolers logs (qcs-coolers). Make sure reports exist."}
        />

        {/* 🆕 Branch Temperature Lookup */}
        <ReportLookupModal
          open={lookupKind === "branchTemp"}
          onClose={closeLookup}
          onPick={pickBranchTemp}
          type={BRANCH_ONLY_TEMP_TYPES}
          title={lang === "ar"
            ? "🌡️ ابحث في سجلات حرارة الفروع (POS / FTR)"
            : "🌡️ Branch Temperature Logs (POS / FTR)"}
          searchPlaceholder={lang === "ar"
            ? "فرع / تاريخ / مُدقّق"
            : "Branch / Date / Inspector"}
          treeMode={true}
          getDate={(p) => p?.reportDate || p?.date || ""}
          searchFields={(p) => [
            p?.reportDate, p?.date, p?.branch, p?.checkedBy, p?.verifiedByManager,
            branchLabelForType(p?.__sourceType),
          ]}
          displayItem={(p) => {
            const arr = pickRowsArray(p);
            const branchLabel = p?.branch || branchLabelForType(p?.__sourceType);
            return {
              primary: `🌡️ ${String(p?.reportDate || p?.date || "—").slice(0, 10)} — ${branchLabel}`,
              secondary: `${arr.length} ${lang === "ar" ? "قراءة/برّاد" : "records"}`,
              chips: [
                p?.__sourceType ? `📊 ${p.__sourceType}` : null,
                p?.checkedBy ? `✍ ${p.checkedBy}` : null,
                p?.verifiedByManager ? `👔 ${p.verifiedByManager}` : null,
              ].filter(Boolean),
            };
          }}
          emptyText={lang === "ar"
            ? "لا توجد سجلات حرارة محفوظة في أي فرع POS أو FTR."
            : "No POS/FTR branch temperature logs saved."}
        />

        {/* 🆕 Truck Cleaning Lookup (flatten by truck row) */}
        <ReportLookupModal
          open={lookupKind === "truckCleaning"}
          onClose={closeLookup}
          onPick={pickTruckCleaning}
          type="truck_daily_cleaning"
          title={t("popupTruckCleaning")}
          searchPlaceholder={t("truckNo")}
          initialSearch={form.linked.loadingLog?.vehicleNo || ""}
          flatten={(report) => {
            const p = report?.payload || {};
            const arr = Array.isArray(p.rows) ? p.rows : [];
            if (!arr.length) return [];
            return arr.map((r, idx) => ({ sub: r, subIdx: idx }));
          }}
          treeMode={true}
          getDate={({ payload }) => payload?.date || payload?.reportDate || ""}
          searchFields={({ payload, sub }) => [
            sub?.truckNo,
            payload?.date,
            payload?.reportDate,
          ]}
          displayItem={({ payload, sub, subIdx }) => ({
            primary: `🚛 ${sub?.truckNo || "—"}`,
            secondary: `📅 ${String(payload?.date || payload?.reportDate || "—").slice(0, 10)} · #${(subIdx ?? 0) + 1}`,
            chips: [
              sub?.cleaning ? `${t("cleaningStatus")}: ${sub.cleaning}` : null,
              sub?.checkedBy ? `✍ ${sub.checkedBy}` : null,
            ].filter(Boolean),
          })}
        />
      </div>
    </div>
  );
}

/* ===== LinkCard (للأزرار الثلاثة) ===== */
function LinkCard({ icon, title, subtitle, pickHere, linkedLabel, unlinkLabel, picked, onPick, onUnlink, renderPicked }) {
  if (picked) {
    return (
      <div style={{
        background: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
        border: "1.5px solid #86efac",
        borderRadius: 12,
        padding: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontWeight: 800, color: "#065f46", fontSize: "0.95rem" }}>
            {icon} {title} — {linkedLabel || "Linked"} ✅
          </div>
          <button type="button" onClick={onUnlink} style={{
            background: "#fff",
            color: "#b91c1c",
            border: "1px solid #fca5a5",
            padding: "4px 10px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 800,
          }}>{unlinkLabel || "Unlink"}</button>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#0f172a", lineHeight: 1.7 }}>
          {renderPicked(picked)}
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={onPick} style={{
      background: "#fff",
      border: "2px dashed #cbd5e1",
      borderRadius: 12,
      padding: 14,
      cursor: "pointer",
      fontFamily: "inherit",
      textAlign: "start",
      transition: "all .15s ease",
      width: "100%",
    }}>
      <div style={{ fontSize: "1.5rem" }}>{icon}</div>
      <div style={{ fontWeight: 800, color: "#0b1f4d", marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>{subtitle}</div>
      <div style={{
        marginTop: 8,
        background: "#eef2ff",
        color: "#1e40af",
        padding: "5px 12px",
        borderRadius: 999,
        display: "inline-block",
        fontSize: "0.82rem",
        fontWeight: 800,
      }}>
        {pickHere || "🔍 Click to search & select"}
      </div>
    </button>
  );
}

/* ===== Atoms ===== */
function Section({ title, children }) {
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontWeight: 700, color: "#374151", fontSize: "0.9rem" }}>{label}</span>
      {children}
    </label>
  );
}

function KPI({ icon, label, value, sub, ok, bad }) {
  const accent = bad ? "#ef4444" : ok ? "#15803d" : "#1d4ed8";
  return (
    <div style={{
      flex: "1 1 200px",
      minWidth: 200,
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderInlineStart: `4px solid ${accent}`,
      borderRadius: 12,
      padding: "12px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900, color: accent, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

/* ===== Styles ===== */
const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#ecfdf5)",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  frame: {
    maxWidth: 1280,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    padding: 20,
  },
  brandTable: { marginBottom: 14 },
  brandLogo: {
    border: "1px solid #9aa4ae",
    padding: 8,
    width: 110,
    textAlign: "center",
    background: "#f8fbff",
  },
  headerCell: {
    border: "1px solid #9aa4ae",
    padding: "6px 10px",
    fontSize: "0.9rem",
    background: "#f8fbff",
  },
  brandStrip: {
    textAlign: "center",
    background: "#dde3e9",
    fontWeight: 800,
    padding: "8px 6px",
    border: "1px solid #9aa4ae",
    borderTop: "none",
    fontSize: "1.05rem",
  },
  kpiRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  section: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: 800,
    fontSize: "1.05rem",
    color: "#0b1f4d",
    marginBottom: 12,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  input: {
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: "0.92rem",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #d1d5db",
    fontSize: "0.88rem",
  },
  thRow: { background: "#2563eb", color: "#fff" },
  th: { padding: 8, border: "1px solid #d1d5db", fontWeight: 700, textAlign: "center" },
  td: { padding: 4, border: "1px solid #e5e7eb" },
  tdCenter: { padding: 4, border: "1px solid #e5e7eb", textAlign: "center", width: 50 },
  btnPrimary: {
    padding: "12px 22px",
    background: "linear-gradient(180deg,#10b981,#059669)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  btnSecondary: {
    padding: "12px 18px",
    background: "#eef2ff",
    color: "#1e40af",
    border: "1px solid #c7d2fe",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "0.92rem",
  },
  btnLight: {
    padding: "8px 14px",
    background: "#e5e7eb",
    color: "#111827",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
  },
  btnDanger: {
    padding: "4px 8px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontWeight: 700,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalBox: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px 20px",
    minWidth: 320,
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
    borderTop: "4px solid #2563eb",
  },
};
