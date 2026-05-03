// src/pages/hse/HSEShipmentReceiving.jsx
// F-09: استلام الشحنات — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, MEAT_PRODUCT_TYPES,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "shipment_receiving";

const T = {
  title:    { ar: "📦 استلام الشحنات (F-09) — Shipment Receiving", en: "📦 Shipment Receiving (F-09)" },
  subtitle: { ar: "فحص شامل: درجة الحرارة + الشهادات الصحية + الحلال + المطابقة البصرية",
              en: "Full check: temperature + health certs + Halal + visual conformity" },
  back:     { ar: "← HSE", en: "← HSE" },
  list:     { ar: "📋 السجل", en: "📋 Records" },
  newShipment: { ar: "+ شحنة جديدة", en: "+ New Shipment" },
  acc: { ar: "مقبولة", en: "Accepted" },
  rej: { ar: "مرفوضة", en: "Rejected" },
  par: { ar: "قبول جزئي", en: "Partial" },
  totalKg: { ar: "إجمالي الكمية (كجم)", en: "Total Quantity (kg)" },
  receivingNo: { ar: "رقم الاستلام", en: "Receiving No." },
  date: { ar: "التاريخ", en: "Date" },
  time: { ar: "الوقت", en: "Time" },
  receiver: { ar: "المسؤول عن الاستلام", en: "Received By" },
  shipmentTitle: { ar: "✈️ بيانات الشحنة", en: "✈️ Shipment Details" },
  awb: { ar: "رقم بوليصة الشحن (AWB)", en: "Air Waybill (AWB)" },
  invoice: { ar: "رقم الفاتورة", en: "Invoice No." },
  supplier: { ar: "المورد", en: "Supplier" },
  origin: { ar: "بلد المنشأ", en: "Country of Origin" },
  entry: { ar: "منفذ الدخول", en: "Entry Point" },
  truck: { ar: "رقم الشاحنة", en: "Truck Plate" },
  driver: { ar: "اسم السائق", en: "Driver Name" },
  productTitle: { ar: "🥩 المنتج", en: "🥩 Product" },
  productType: { ar: "نوع المنتج", en: "Product Type" },
  cond: { ar: "الحالة", en: "Condition" },
  condChilled: { ar: "🧊 مبرد (Chilled)", en: "🧊 Chilled" },
  condFrozen: { ar: "❄️ مجمد (Frozen)", en: "❄️ Frozen" },
  batch: { ar: "رقم الدفعة (Batch)", en: "Batch No." },
  qty: { ar: "الكمية الإجمالية (كجم)", en: "Total Quantity (kg)" },
  cartons: { ar: "عدد الكراتين", en: "Cartons" },
  prodDate: { ar: "تاريخ الإنتاج", en: "Production Date" },
  expDate: { ar: "تاريخ الانتهاء", en: "Expiry Date" },
  desc: { ar: "الوصف التفصيلي", en: "Detailed Description" },
  tempTitle: { ar: "🌡️ فحص درجات الحرارة (CCP)", en: "🌡️ Temperature Check (CCP)" },
  tempTruck: { ar: "حرارة الشاحنة عند الاستلام", en: "Truck temperature at receipt" },
  tempCore: { ar: "حرارة قلب المنتج (Core)", en: "Product core temperature" },
  tempSurf: { ar: "حرارة سطح المنتج", en: "Product surface temperature" },
  evalOk: { ar: "✅ ضمن النطاق", en: "✅ In range" },
  evalDevChilled: { ar: "🚨 خارج نطاق التبريد", en: "🚨 Out of chilled range" },
  evalDevFrozen: { ar: "🚨 خارج نطاق التجميد", en: "🚨 Out of frozen range" },
  docsTitle: { ar: "📄 الشهادات والوثائق", en: "📄 Certificates & Documents" },
  visualTitle: { ar: "👁️ الفحص البصري والجودة", en: "👁️ Visual & Quality Inspection" },
  packCond: { ar: "حالة التغليف", en: "Packaging Condition" },
  packGood: { ar: "✅ سليم", en: "✅ Good" },
  packMinor: { ar: "🟡 ضرر بسيط", en: "🟡 Minor damage" },
  packMajor: { ar: "🔴 ضرر كبير", en: "🔴 Major damage" },
  visual: { ar: "الفحص البصري", en: "Visual" },
  visualPass: { ar: "✅ مطابق", en: "✅ Pass" },
  visualFail: { ar: "❌ غير مطابق", en: "❌ Fail" },
  smell: { ar: "فحص الرائحة", en: "Smell Check" },
  smellOk: { ar: "✅ طبيعية", en: "✅ Normal" },
  smellBad: { ar: "❌ رائحة غير طبيعية", en: "❌ Abnormal" },
  contam: { ar: "تلوث ظاهر؟", en: "Visible contamination?" },
  no: { ar: "❌ لا", en: "❌ No" },
  yes: { ar: "⚠️ نعم", en: "⚠️ Yes" },
  decTitle: { ar: "⚖️ قرار الاستلام", en: "⚖️ Receiving Decision" },
  decision: { ar: "القرار", en: "Decision" },
  decAcc: { ar: "✅ قبول كامل", en: "✅ Full Accept" },
  decPar: { ar: "🟡 قبول جزئي", en: "🟡 Partial Accept" },
  decRej: { ar: "🔴 رفض كامل", en: "🔴 Full Reject" },
  decQuar: { ar: "🟠 حجر صحي للفحص", en: "🟠 Quarantine" },
  destRoom: { ar: "الغرفة المستهدفة", en: "Destination Room" },
  destPh: { ar: "Frozen Room #1 / Chiller…", en: "Frozen Room #1 / Chiller…" },
  approver: { ar: "اعتماد بواسطة", en: "Approved By" },
  rejReason: { ar: "سبب الرفض / الجزئي", en: "Rejection / Partial Reason" },
  notes: { ar: "ملاحظات", en: "Notes" },
  saveBtn: { ar: "💾 حفظ الاستلام", en: "💾 Save Receipt" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  needSupplier: { ar: "أدخل اسم المورد", en: "Enter supplier name" },
  needQty: { ar: "أدخل الكمية بالكيلو", en: "Enter quantity in kg" },
  saved: { ar: "✅ تم تسجيل الشحنة", en: "✅ Shipment recorded" },
  confirmDel: { ar: "حذف؟", en: "Delete?" },
  noRecords: { ar: "لا توجد شحنات بعد", en: "No shipments yet" },
  cols: {
    no:    { ar: "الرقم", en: "No." },
    date:  { ar: "التاريخ", en: "Date" },
    sup:   { ar: "المورد / المنشأ", en: "Supplier / Origin" },
    prod:  { ar: "المنتج", en: "Product" },
    qty:   { ar: "الكمية", en: "Qty" },
    temp:  { ar: "الحرارة", en: "Temp" },
    dec:   { ar: "القرار", en: "Decision" },
    acts:  { ar: "إجراءات", en: "Actions" },
  },
  decAccS: { ar: "✅ مقبول", en: "✅ Accepted" },
  decRejS: { ar: "🔴 مرفوض", en: "🔴 Rejected" },
  decParS: { ar: "🟡 جزئي", en: "🟡 Partial" },
  decQuarS:{ ar: "🟠 حجر", en: "🟠 Quarantine" },
  truckLbl:{ ar: "شاحنة:", en: "Truck:" },
  coreLbl: { ar: "قلب:", en: "Core:" },
  cartonsShort: { ar: "كرتون", en: "cartons" },
  del: { ar: "حذف", en: "Delete" },
};

const ORIGINS = [
  { v: "Australia",   ar: "أستراليا", en: "Australia" },
  { v: "Brazil",      ar: "البرازيل", en: "Brazil" },
  { v: "India",       ar: "الهند",    en: "India" },
  { v: "Pakistan",    ar: "باكستان",  en: "Pakistan" },
  { v: "Sudan",       ar: "السودان",  en: "Sudan" },
  { v: "Somalia",     ar: "الصومال",  en: "Somalia" },
  { v: "Ethiopia",    ar: "إثيوبيا",  en: "Ethiopia" },
  { v: "New Zealand", ar: "نيوزيلندا", en: "New Zealand" },
  { v: "South Africa",ar: "جنوب أفريقيا", en: "South Africa" },
  { v: "Other",       ar: "أخرى",     en: "Other" },
];

const ENTRY_POINTS = [
  { v: "Dubai Cargo Village",  ar: "ميناء دبي الجوي (Cargo Village)", en: "Dubai Cargo Village (Air)" },
  { v: "Sharjah Cargo",        ar: "ميناء الشارقة الجوي",              en: "Sharjah Cargo (Air)" },
  { v: "Abu Dhabi Cargo",      ar: "ميناء أبوظبي الجوي",                en: "Abu Dhabi Cargo (Air)" },
  { v: "Jebel Ali Port",       ar: "ميناء جبل علي (بحري)",              en: "Jebel Ali Port (Sea)" },
  { v: "Hamriyah Port",        ar: "ميناء الحمرية",                     en: "Hamriyah Port" },
  { v: "Other",                ar: "أخرى",                              en: "Other" },
];

const DOCS = [
  { k: "hasHealthCert",       ar: "🩺 الشهادة الصحية البيطرية (Veterinary Health Certificate)", en: "🩺 Veterinary Health Certificate" },
  { k: "hasHalalCert",        ar: "🕌 شهادة الحلال (Halal Certificate)",                          en: "🕌 Halal Certificate" },
  { k: "hasCOO",              ar: "🌍 شهادة المنشأ (Certificate of Origin)",                       en: "🌍 Certificate of Origin" },
  { k: "hasCommercialInvoice",ar: "💰 الفاتورة التجارية",                                          en: "💰 Commercial Invoice" },
  { k: "hasPackingList",      ar: "📦 قائمة التعبئة (Packing List)",                                en: "📦 Packing List" },
  { k: "hasInspectionReport", ar: "🔍 تقرير الفحص قبل الشحن",                                     en: "🔍 Pre-shipment Inspection Report" },
];

const blank = () => ({
  receivingNo: `RCV-${Date.now().toString().slice(-6)}`,
  date: todayISO(), time: nowHHMM(), receiver: "",
  awb: "", invoiceNo: "", supplier: "", origin: ORIGINS[0].v, entryPoint: ENTRY_POINTS[0].v,
  truckPlate: "", driverName: "",
  productType: MEAT_PRODUCT_TYPES[0].v, productCondition: "chilled",
  description: "", totalQuantityKg: "", totalCartons: "",
  batchNo: "", expiryDate: "", productionDate: "",
  truckTempReceived: "", productTempCenter: "", productTempSurface: "",
  hasHealthCert: false, hasHalalCert: false, hasCOO: false,
  hasCommercialInvoice: false, hasPackingList: false, hasInspectionReport: false,
  packagingCondition: "good", visualInspection: "pass", smellCheck: "pass", contamination: false,
  decision: "accepted", rejectionReason: "", destinationRoom: "", notes: "", approvedBy: "",
});

function evaluateTemp(value, condition) {
  const v = Number(value);
  if (isNaN(v) || value === "") return null;
  if (condition === "frozen") {
    if (v <= -15) return { ok: true,  color: "#166534", bg: "#dcfce7" };
    return { ok: false, color: "#7f1d1d", bg: "#fee2e2", devType: "frozen" };
  }
  if (v >= 0 && v <= 4) return { ok: true,  color: "#166534", bg: "#dcfce7" };
  return { ok: false, color: "#7f1d1d", bg: "#fee2e2", devType: "chilled" };
}

export default function HSEShipmentReceiving() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);

  function save() {
    if (!draft.supplier.trim()) { alert(pick(T.needSupplier)); return; }
    if (!draft.totalQuantityKg) { alert(pick(T.needQty)); return; }
    appendLocal(TYPE, draft);
    setItems(loadLocal(TYPE));
    alert(pick(T.saved));
    setDraft(blank()); setTab("list");
  }
  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    deleteLocal(TYPE, id);
    setItems(loadLocal(TYPE));
  }

  const stats = useMemo(() => {
    const accepted = items.filter((i) => i.decision === "accepted").length;
    const rejected = items.filter((i) => i.decision === "rejected").length;
    const partial  = items.filter((i) => i.decision === "partial").length;
    const totalKg  = items.reduce((a, i) => a + (Number(i.totalQuantityKg) || 0), 0);
    return { accepted, rejected, partial, totalKg };
  }, [items]);

  const evalLabel = (ev) => ev.ok ? pick(T.evalOk) : ev.devType === "frozen" ? pick(T.evalDevFrozen) : pick(T.evalDevChilled);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newShipment)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ ...cardStyle, padding: 12, background: "#dcfce7" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>{pick(T.acc)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#166534" }}>{stats.accepted}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#fee2e2" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.rej)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#7f1d1d" }}>{stats.rejected}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#fef9c3" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#854d0e" }}>{pick(T.par)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#854d0e" }}>{stats.partial}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>{pick(T.totalKg)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: HSE_COLORS.primary }}>{stats.totalKg.toLocaleString()}</div>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.receivingNo)}</label><input type="text" value={draft.receivingNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.receiver)}</label><input type="text" value={draft.receiver} onChange={(e) => setDraft({ ...draft, receiver: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#dbeafe", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#1e40af" }}>{pick(T.shipmentTitle)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div><label style={labelStyle}>{pick(T.awb)}</label><input type="text" value={draft.awb} onChange={(e) => setDraft({ ...draft, awb: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.invoice)}</label><input type="text" value={draft.invoiceNo} onChange={(e) => setDraft({ ...draft, invoiceNo: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.supplier)}</label><input type="text" value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>{pick(T.origin)}</label>
                  <select value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} style={inputStyle}>
                    {ORIGINS.map((o) => <option key={o.v} value={o.v}>{o[lang]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.entry)}</label>
                  <select value={draft.entryPoint} onChange={(e) => setDraft({ ...draft, entryPoint: e.target.value })} style={inputStyle}>
                    {ENTRY_POINTS.map((p) => <option key={p.v} value={p.v}>{p[lang]}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>{pick(T.truck)}</label><input type="text" value={draft.truckPlate} onChange={(e) => setDraft({ ...draft, truckPlate: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.driver)}</label><input type="text" value={draft.driverName} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} style={inputStyle} /></div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(T.productTitle)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{pick(T.productType)}</label>
                  <select value={draft.productType} onChange={(e) => setDraft({ ...draft, productType: e.target.value })} style={inputStyle}>
                    {MEAT_PRODUCT_TYPES.map((m) => <option key={m.v} value={m.v}>{m[lang]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.cond)}</label>
                  <select value={draft.productCondition} onChange={(e) => setDraft({ ...draft, productCondition: e.target.value })} style={inputStyle}>
                    <option value="chilled">{pick(T.condChilled)}</option>
                    <option value="frozen">{pick(T.condFrozen)}</option>
                  </select>
                </div>
                <div><label style={labelStyle}>{pick(T.batch)}</label><input type="text" value={draft.batchNo} onChange={(e) => setDraft({ ...draft, batchNo: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.qty)}</label><input type="number" value={draft.totalQuantityKg} onChange={(e) => setDraft({ ...draft, totalQuantityKg: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.cartons)}</label><input type="number" value={draft.totalCartons} onChange={(e) => setDraft({ ...draft, totalCartons: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.prodDate)}</label><input type="date" value={draft.productionDate} onChange={(e) => setDraft({ ...draft, productionDate: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.expDate)}</label><input type="date" value={draft.expiryDate} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>{pick(T.desc)}</label>
                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#dbeafe", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#1e40af" }}>{pick(T.tempTitle)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {[
                  { k: "truckTempReceived", label: T.tempTruck },
                  { k: "productTempCenter", label: T.tempCore },
                  { k: "productTempSurface",label: T.tempSurf },
                ].map((f) => {
                  const ev = evaluateTemp(draft[f.k], draft.productCondition);
                  return (
                    <div key={f.k}>
                      <label style={labelStyle}>{pick(f.label)} (°C)</label>
                      <input type="number" step="0.1" value={draft[f.k]} onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })} style={{ ...inputStyle, fontWeight: 800 }} />
                      {ev && (
                        <div style={{ marginTop: 4, padding: "3px 8px", borderRadius: 6, background: ev.bg, color: ev.color, fontSize: 11, fontWeight: 900, display: "inline-block" }}>
                          {evalLabel(ev)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#dcfce7", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#166534" }}>{pick(T.docsTitle)}</div>
              {DOCS.map((d) => (
                <label key={d.k} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 10px", borderRadius: 8, marginBottom: 3,
                  background: draft[d.k] ? "#fff" : "transparent", cursor: "pointer",
                }}>
                  <input type="checkbox" checked={draft[d.k]} onChange={(e) => setDraft({ ...draft, [d.k]: e.target.checked })} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{d[lang]}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(T.visualTitle)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{pick(T.packCond)}</label>
                  <select value={draft.packagingCondition} onChange={(e) => setDraft({ ...draft, packagingCondition: e.target.value })} style={inputStyle}>
                    <option value="good">{pick(T.packGood)}</option>
                    <option value="minor">{pick(T.packMinor)}</option>
                    <option value="major">{pick(T.packMajor)}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.visual)}</label>
                  <select value={draft.visualInspection} onChange={(e) => setDraft({ ...draft, visualInspection: e.target.value })} style={inputStyle}>
                    <option value="pass">{pick(T.visualPass)}</option>
                    <option value="fail">{pick(T.visualFail)}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.smell)}</label>
                  <select value={draft.smellCheck} onChange={(e) => setDraft({ ...draft, smellCheck: e.target.value })} style={inputStyle}>
                    <option value="pass">{pick(T.smellOk)}</option>
                    <option value="fail">{pick(T.smellBad)}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.contam)}</label>
                  <select value={draft.contamination ? "yes" : "no"} onChange={(e) => setDraft({ ...draft, contamination: e.target.value === "yes" })} style={inputStyle}>
                    <option value="no">{pick(T.no)}</option>
                    <option value="yes">{pick(T.yes)}</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#fee2e2", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#7f1d1d" }}>{pick(T.decTitle)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{pick(T.decision)}</label>
                  <select value={draft.decision} onChange={(e) => setDraft({ ...draft, decision: e.target.value })} style={inputStyle}>
                    <option value="accepted">{pick(T.decAcc)}</option>
                    <option value="partial">{pick(T.decPar)}</option>
                    <option value="rejected">{pick(T.decRej)}</option>
                    <option value="quarantine">{pick(T.decQuar)}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.destRoom)}</label>
                  <input type="text" value={draft.destinationRoom} onChange={(e) => setDraft({ ...draft, destinationRoom: e.target.value })} placeholder={pick(T.destPh)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.approver)}</label>
                  <input type="text" value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} />
                </div>
              </div>
              {(draft.decision === "rejected" || draft.decision === "partial") && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>{pick(T.rejReason)}</label>
                  <textarea value={draft.rejectionReason} onChange={(e) => setDraft({ ...draft, rejectionReason: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.notes)}</label>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
              <button style={buttonGhost} onClick={() => setTab("list")}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {tab === "list" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.cols.no)}</th>
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.sup)}</th>
                  <th style={thStyle}>{pick(T.cols.prod)}</th>
                  <th style={thStyle}>{pick(T.cols.qty)}</th>
                  <th style={thStyle}>{pick(T.cols.temp)}</th>
                  <th style={thStyle}>{pick(T.cols.dec)}</th>
                  <th style={thStyle}>{pick(T.cols.acts)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const prod = MEAT_PRODUCT_TYPES.find(p => p.v === it.productType);
                  const orig = ORIGINS.find(o => o.v === it.origin);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.receivingNo}<br /><small>{it.awb}</small></td>
                      <td style={tdStyle}>{it.date}<br /><small>{it.time}</small></td>
                      <td style={tdStyle}>{it.supplier}<br /><small>{orig ? orig[lang] : it.origin}</small></td>
                      <td style={tdStyle}>{prod ? prod[lang] : it.productType}<br /><small>{it.productCondition === "frozen" ? pick(T.condFrozen) : pick(T.condChilled)}</small></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{Number(it.totalQuantityKg).toLocaleString()} kg<br /><small>{it.totalCartons} {pick(T.cartonsShort)}</small></td>
                      <td style={tdStyle}><small>{pick(T.truckLbl)} {it.truckTempReceived}°<br />{pick(T.coreLbl)} {it.productTempCenter}°</small></td>
                      <td style={tdStyle}>
                        {it.decision === "accepted"   && pick(T.decAccS)}
                        {it.decision === "rejected"   && pick(T.decRejS)}
                        {it.decision === "partial"    && pick(T.decParS)}
                        {it.decision === "quarantine" && pick(T.decQuarS)}
                      </td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="8" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
