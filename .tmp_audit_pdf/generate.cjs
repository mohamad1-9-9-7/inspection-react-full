// Generates Audit_Quality_Items_2025.html mirroring the system view layouts.
// Data: JSON files downloaded from the live API into this folder.
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8").replace(/^﻿/, "")).data || [];

const logoB64 = fs.readFileSync(path.join(DIR, "..", "public", "brand", "al-mawashi.jpg")).toString("base64");
const LOGO = `data:image/jpeg;base64,${logoB64}`;
const HEADER_LINE = "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nb = (s) => (s == null || String(s).trim() === "" ? "&nbsp;" : esc(s));
const is2025 = (d) => String(d || "").startsWith("2025");
const fmtDate = (s) => {
  if (!s) return "—";
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(s);
};

// ---------- data ----------
const meat = read("qcs_meat_waste_disposal.json")
  .filter((r) => is2025(r.payload?.reportDate))
  .sort((a, b) => String(a.payload.reportDate).localeCompare(String(b.payload.reportDate)));

const ncr = read("qcs_non_conformance.json")
  .filter((r) => is2025(r.payload?.headRow?.reportDate))
  .sort((a, b) => String(a.payload.headRow.reportDate).localeCompare(String(b.payload.headRow.reportDate)));

const capa = read("qcs_corrective_action.json")
  .filter((r) => is2025(r.payload?.header?.dateIssued))
  .sort((a, b) => String(a.payload.header.dateIssued).localeCompare(String(b.payload.header.dateIssued)));

const cps = read("pos19_cleaning_programme_schedule.json")
  .filter((r) => is2025(r.payload?.month))
  .sort((a, b) => String(a.payload.month).localeCompare(String(b.payload.month)));

const training = read("training_session.json");
const training2025 = training.filter((r) => is2025(r.payload?.date));
const audits = read("qcs_internal_audit.json");
const audits2025 = audits.filter((r) => is2025(r.payload?.reportDate || r.payload?.date));
const garbage = read("qcs_garbage_disposal.json");
const garbage2025 = garbage.filter((r) => is2025(r.payload?.reportDate || r.payload?.date));

// ---------- shared css ----------
const css = `
@page { size: A4; margin: 9mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.avoid { page-break-inside: avoid; }
img { max-width: 100%; }

/* cover */
.cover { direction: rtl; text-align: right; }
.cover .band { background: #c0c0c0; text-align: center; font-weight: 900; padding: 6px 8px; border: 1px solid #000; }
.cover .band2 { background: #d6d6d6; text-align: center; font-weight: 900; padding: 6px 8px; border: 1px solid #000; border-top: none; }
.cover table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.cover th, .cover td { border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11.5px; vertical-align: top; }
.cover th { background: #e2e8f0; }
.st-ok { color: #15803d; font-weight: 800; }
.st-part { color: #b45309; font-weight: 800; }
.st-no { color: #dc2626; font-weight: 800; }

/* section titles */
.secTitle { font-size: 16px; font-weight: 900; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2px solid #0f172a; }
.note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 10px 12px; font-size: 11.5px; margin-bottom: 10px; }
.noteRed { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 12px; font-size: 12px; }

/* ===== Meat Waste Disposal — mirrors MeatWasteDisposalView.jsx ===== */
.mwd { direction: rtl; }
.mwd .title { font-size: 18px; font-weight: 950; color: #0f172a; margin: 0 0 8px; }
.kpiRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
.kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; }
.kpiLabel { font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; }
.kpiValue { font-size: 26px; font-weight: 950; margin-top: 4px; }
.recordCard { background: #fff; border: 1.5px solid #fecaca; border-radius: 14px; padding: 14px; margin-bottom: 12px; box-shadow: 0 6px 18px rgba(220,38,38,0.06); }
.recordHeader { padding-bottom: 10px; border-bottom: 2px solid #fecaca; margin-bottom: 10px; }
.recTitle { font-size: 16px; font-weight: 950; color: #0f172a; }
.meta { font-size: 12px; color: #475569; font-weight: 700; margin-top: 4px; }
.pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 950; margin-inline-end: 6px; border: 1px solid rgba(0,0,0,0.12); }
.entryRow { background: #fef9c3; border: 1px solid #fde047; border-radius: 10px; padding: 10px; margin-top: 8px; }
.entryNo { font-weight: 900; color: #854d0e; margin-bottom: 4px; }
.imgGrid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 6px; }
.imgThumb { width: 100%; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; display: block; }

/* ===== NC / CAR sheets — mirror sheet style ===== */
.sheet { width: 100%; background: #fff; color: #000; border: 1px solid #d1d5db; font-family: Arial, "Segoe UI", Tahoma, sans-serif; font-size: 12px; padding: 8mm; direction: ltr; }
.sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.sheet td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; word-wrap: break-word; }
.hdrGrid { display: grid; grid-template-columns: 180px 1fr 1fr; align-items: stretch; border: 1px solid #000; border-bottom: none; }
.hdrGrid2 { display: grid; grid-template-columns: 180px 1fr; align-items: stretch; border: 1px solid #000; }
.hdrLogo { border-inline-end: 1px solid #000; display: flex; align-items: center; justify-content: center; padding: 8px; }
.hdrLogo img { max-width: 100%; max-height: 80px; object-fit: contain; }
.kv { display: flex; border-bottom: 1px solid #000; }
.kv .k { padding: 6px 8px; border-inline-end: 1px solid #000; min-width: 150px; font-weight: 700; }
.kv .v { padding: 6px 8px; flex: 1; }
.bandGray { background: #c0c0c0; text-align: center; font-weight: 900; padding: 6px 8px; border: 1px solid #000; border-top: none; }
.bandGray2 { background: #d6d6d6; text-align: center; font-weight: 900; padding: 6px 8px; border: 1px solid #000; border-top: none; }
.dateLine { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid #000; border-top: none; margin-bottom: 8px; }
.sectionTitle { margin-top: 8px; margin-bottom: 4px; font-weight: 900; font-size: 12px; }
.mt6 { margin-top: 6px; }
.evImg { width: 90px; height: 60px; object-fit: cover; border: 1px solid #000; margin: 2px; }

/* ===== Cleaning Programme Schedule — mirrors view pos 19/CleaningProgrammeScheduleView.jsx ===== */
.cps { direction: ltr; color: #0b1f4d; background: #fff; border: 1px solid #dbe3f4; border-radius: 12px; padding: 16px; }
.cps .banner { margin-bottom: 14px; padding: 12px 14px; background: linear-gradient(135deg, #1e3a5f, #2d5a8e); border-radius: 10px; color: #fff; }
.cps .bannerTitle { font-weight: 800; font-size: 17px; }
.cps .bannerSub { font-size: 12px; color: #cbd5e1; margin-top: 3px; }
.cps .fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; font-size: 12px; }
.cps .fcell { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; }
.cps .flabel { font-size: 10px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.cps .fvalue { font-size: 13px; font-weight: 700; color: #0b1f4d; background: #fff; border: 1px solid #1f3b70; border-radius: 4px; padding: 4px 6px; min-height: 16px; }
.cps .standard { border: 1px solid #1f3b70; margin-bottom: 10px; padding: 6px 8px; font-size: 12px; font-weight: 700; background: #f5f8ff; }
.cps table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; }
.cps th { border: 1px solid #1f3b70; padding: 8px 6px; text-align: center; white-space: pre-line; font-weight: 800; background: #e9f0ff; color: #0b1f4d; }
.cps td { border: 1px solid #1f3b70; padding: 8px 6px; vertical-align: top; white-space: pre-line; color: #0b1f4d; word-wrap: break-word; }
.cps .wgrid { display: grid; grid-template-columns: auto 1fr; gap: 4px; }
.cps .foot { margin-top: 10px; font-size: 11px; color: #374151; }
`;

// ---------- cover ----------
const today = new Date().toISOString().slice(0, 10);
const sum = (rows) => rows.map((r) => `<tr><td style="text-align:center;font-weight:800">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="${r[4]}">${r[3]}</td></tr>`).join("");

const cover = `
<div class="page cover">
  <div style="display:grid;grid-template-columns:160px 1fr;border:1px solid #000;align-items:stretch">
    <div style="border-inline-start:1px solid #000;display:flex;align-items:center;justify-content:center;padding:8px"><img src="${LOGO}" style="max-height:70px"/></div>
    <div>
      <div class="band" style="border:none;border-bottom:1px solid #000">${HEADER_LINE}</div>
      <div class="band2" style="border:none;border-bottom:1px solid #000">ملف الرد على طلبات التدقيق — بنود الجودة / Audit Information Request — Quality Items</div>
      <div style="padding:6px 8px;text-align:center;font-weight:700">الفترة المطلوبة: يناير – ديسمبر 2025 &nbsp;|&nbsp; POC: Quality (M. Abdallah) &nbsp;|&nbsp; تاريخ الإصدار: ${today}</div>
    </div>
  </div>

  <h3 style="margin:14px 0 4px">ملخص التوفر في النظام (QMS)</h3>
  <table>
    <tr><th style="width:34px">البند</th><th style="width:33%">المطلوب</th><th>الموجود في النظام</th><th style="width:90px">الحالة</th></tr>
    ${sum([
      ["7", "نماذج Checklists تشغيلية مستخدمة على مستوى الفروع", `برنامج التنظيف الأسبوعي POS 19 (${cps.length} سجل ضمن 2025) — مرفق كامل. نماذج إضافية متوفرة بالنظام (نظافة يومية، نظافة شخصية، حرارة، استلام) سجلاتها المعبأة تبدأ من 2026.`, "متوفر جزئياً", "st-part"],
      ["17", "عينات التخلص من منتجات منتهية الصلاحية (تقارير حوادث/إتلاف/مراسلات/تأكيدات شركات)", `تقارير الإتلاف متوفرة (${meat.length} سجلات بالصور). تقارير الحوادث والمراسلات وتأكيدات شركات الإتلاف والتقارير الربعية: غير متوفرة بالنظام.`, "متوفر جزئياً", "st-part"],
      ["19", "سجلات التخلص من النفايات", `${meat.length} سجلات إتلاف لحوم (سبتمبر – ديسمبر 2025) — مرفقة كاملة. سجلات القمامة العامة: ${garbage2025.length} ضمن 2025.`, "متوفر جزئياً", "st-part"],
      ["20", "مستندات نقل النفايات (أمر نقل/تفويض/مستندات نقل/تأكيد تسليم)", "غير متوفرة بالنظام — النظام يوثّق عملية الإتلاف نفسها فقط (كمية/سبب/طريقة/صور/شهود).", "غير متوفر", "st-no"],
      ["21", "سجلات التدريب (حضور + مادة تدريبية)", `لا توجد جلسات تدريب بتاريخ 2025 (${training2025.length}). يوجد ${training.length} جلسة موثقة بالحضور والدرجات تبدأ من يناير 2026.`, "غير متوفر للفترة", "st-no"],
      ["27", "تقارير التفتيش الصحي والسلامة الأخيرة", `لا توجد تدقيقات بتاريخ 2025 (${audits2025.length}). يوجد ${audits.length} تقارير تدقيق داخلي تبدأ من مارس 2026.`, "غير متوفر للفترة", "st-no"],
      ["28", "سجلات الإجراءات التصحيحية لملاحظات التفتيش", `${ncr.length} تقارير عدم مطابقة (NCR) + ${capa.length} تقارير إجراء تصحيحي (CAPA) ضمن 2025 — مرفقة كاملة بنفس نموذج النظام.`, "متوفر جزئياً", "st-part"],
    ])}
  </table>

  <div class="noteRed" style="margin-top:12px">
    <b>ملاحظة منهجية:</b> هذا الملف مستخرج آلياً من نظام إدارة الجودة (QMS) بتاريخ ${today}، وطريقة العرض مطابقة لشاشات النظام الأصلية.
    بدأ الإدخال الفعلي في النظام أواخر 2025، لذا فإن تغطية الفترة (يناير – ديسمبر 2025) جزئية وتقتصر على الربع الأخير تقريباً.
    أي سجلات ورقية خارج النظام لهذه الفترة يجب تجميعها من الفروع بشكل منفصل.
  </div>
</div>`;

// ---------- Meat Waste Disposal ----------
const pill = (color, bg, txt) => `<span class="pill" style="color:${color};background:${bg}">${txt}</span>`;
let totalKgAll = 0, totalEntriesAll = 0;
const meatCards = meat.map((rec) => {
  const p = rec.payload || {};
  const entries = p.entries || [];
  const totalKg = Number(p.totals?.totalKg) || entries.reduce((s, e) => s + (Number(e.quantityKg) || 0), 0);
  totalKgAll += totalKg; totalEntriesAll += entries.length;
  return `
  <div class="recordCard avoid">
    <div class="recordHeader">
      <div class="recTitle">📅 ${fmtDate(p.reportDate)} — ${nb(p.location)}</div>
      <div class="meta">👤 قام بالتخلص: ${nb(p.disposedBy)}${p.witness ? ` • 👁 الشاهد: ${esc(p.witness)}` : ""}${p.supervisor ? ` • 🎯 المشرف: ${esc(p.supervisor)}` : ""}</div>
      <div class="meta">${pill("#dc2626", "#fee2e2", `🥩 ${totalKg.toFixed(2)} كغ`)}${pill("#9333ea", "#f3e8ff", `📋 ${entries.length} إدخال`)}</div>
    </div>
    ${p.generalNotes ? `<div class="meta" style="margin-bottom:8px">📝 ${esc(p.generalNotes)}</div>` : ""}
    ${entries.map((e, j) => `
      <div class="entryRow">
        <div class="entryNo">إدخال #${j + 1}</div>
        <div>
          ${pill("#0369a1", "#e0f2fe", `🥩 ${esc(e.meatType || "—")}`)}
          ${pill("#dc2626", "#fee2e2", `${esc(e.quantityKg)} كغ`)}
          ${pill("#a16207", "#fef3c7", esc(e.reason || "—"))}
          ${pill("#15803d", "#dcfce7", esc(e.disposalMethod || "—"))}
          ${e.productCode ? pill("#475569", "#f1f5f9", `كود: ${esc(e.productCode)}`) : ""}
          ${e.batchNo ? pill("#475569", "#f1f5f9", `باتش: ${esc(e.batchNo)}`) : ""}
        </div>
        ${e.reasonDetails ? `<div class="meta">📌 ${esc(e.reasonDetails)}</div>` : ""}
        ${e.notes ? `<div class="meta">📝 ${esc(e.notes)}</div>` : ""}
        ${(e.images || []).length ? `<div class="imgGrid">${e.images.map((u) => `<img class="imgThumb" src="${esc(u)}"/>`).join("")}</div>` : ""}
      </div>`).join("")}
  </div>`;
}).join("");

const meatSection = `
<div class="page mwd">
  <div class="secTitle">البند 19 + 17 — 🥩 سجلات هدر اللحوم / Meat Waste Disposal Records (2025)</div>
  <div class="note">المعروض أدناه هو سجلات سنة 2025 فقط (فترة التدقيق)، بنفس طريقة عرض النظام. تشمل سجلات الإتلاف بسبب انتهاء الصلاحية (البند 17 — تقارير الإتلاف والأدلة المصورة).</div>
  <div class="kpiRow">
    <div class="kpi"><div class="kpiLabel">عدد السجلات</div><div class="kpiValue" style="color:#0369a1">${meat.length}</div></div>
    <div class="kpi"><div class="kpiLabel">إجمالي الإدخالات</div><div class="kpiValue" style="color:#9333ea">${totalEntriesAll}</div></div>
    <div class="kpi"><div class="kpiLabel">إجمالي الكمية (كغ)</div><div class="kpiValue" style="color:#dc2626">${totalKgAll.toFixed(2)}</div></div>
  </div>
  ${meatCards}
  <div class="note"><b>البند 20 (مستندات نقل النفايات):</b> لا يوفّر النظام أوامر نقل أو تفويضات أو مستندات نقل أو تأكيدات تسليم لشركات الإتلاف — التوثيق المتوفر يقتصر على محضر الإتلاف أعلاه (الكمية، السبب، الطريقة، المنفّذ، الشاهد، المشرف، الصور).</div>
</div>`;

// ---------- NCR sheets ----------
const kvRow = (k, v) => `<div class="kv"><div class="k">${k}</div><div class="v">${nb(v)}</div></div>`;
const ncSheets = ncr.map((rec) => {
  const v = rec.payload || {};
  const h = v.headerTop || {};
  const ref = v.reference || {};
  const cb = (b, label) => `${b ? "☑" : "□"} ${label}&nbsp;&nbsp;`;
  const evidenceImgs = (v.evidenceImages || v.images || []).slice(0, 10);
  return `
<div class="page">
  <div class="sheet">
    <div class="hdrGrid">
      <div class="hdrLogo"><img src="${LOGO}"/></div>
      <div style="border-inline-end:1px solid #000">
        ${kvRow("Document Title:", h.documentTitle)}${kvRow("Issue Date:", h.issueDate)}${kvRow("Area:", h.area)}${kvRow("Controlling Officer:", h.controllingOfficer)}
      </div>
      <div>
        ${kvRow("Document No:", h.documentNo)}${kvRow("Revision No:", h.revisionNo)}${kvRow("Issued By:", h.issuedBy)}${kvRow("Approved By:", h.approvedBy)}
      </div>
    </div>
    <div class="bandGray">${HEADER_LINE}</div>
    <div class="bandGray2">NON-CONFORMANCE REPORT</div>
    <div class="dateLine"><span style="font-weight:900;text-decoration:underline">Date:</span><span>${nb(v.headRow?.reportDate)}</span></div>

    <table><tr><td style="width:22mm"><b>Location:</b></td><td>${nb(v.location)}</td></tr></table>

    <table class="mt6"><colgroup><col style="width:12%"/><col style="width:38%"/><col style="width:12%"/><col style="width:38%"/></colgroup>
      <tr><td><b>Date:</b></td><td>${nb(v.headRow?.reportDate)}</td><td><b>NC No.:</b></td><td>${nb(v.headRow?.ncNo)}</td></tr>
      <tr><td><b>Issued to:</b></td><td>${nb(v.headRow?.issuedTo)}</td><td><b>Issued by:</b></td><td>${nb(v.headRow?.issuedBy)}</td></tr>
    </table>

    <table class="mt6"><tr><td style="width:22mm"><b>Reference</b></td><td>${cb(ref.inhouseQC, "In-house QC")}${cb(ref.customerComplaint, "Customer Complaint")}${cb(ref.internalAudit, "Internal Audit")}${cb(ref.externalAudit, "External Audit")}</td></tr></table>

    <table class="mt6"><tr><td style="width:60mm"><b>Nonconformance/Report Details</b></td><td>${nb(v.detailsBlock)}</td></tr></table>
    <table class="mt6"><tr><td style="width:60mm"><b>Corrective Action</b></td><td>${nb(v.correctiveAction)}</td></tr></table>

    <div class="sectionTitle">Corrective Action – Tracking</div>
    <table><colgroup><col style="width:25%"/><col style="width:25%"/><col style="width:25%"/><col style="width:25%"/></colgroup>
      <tr><td><b>Implementation Owner</b></td><td>${nb(v.correctiveActionExtras?.implementationOwner)}</td><td><b>Target Completion Date</b></td><td>${nb(v.correctiveActionExtras?.targetCompletionDateISO)}</td></tr>
      <tr><td><b>Status</b></td><td colspan="3">${nb(v.correctiveActionExtras?.status)}</td></tr>
    </table>

    <div class="sectionTitle">Evidence / Attachments (Images)</div>
    <table><tr><td style="width:60mm"><b>Images</b></td><td>${evidenceImgs.length ? evidenceImgs.map((s) => `<img class="evImg" src="${esc(s)}"/>`).join("") : "&nbsp;"}</td></tr></table>

    <table class="mt6"><colgroup><col style="width:17%"/><col style="width:33%"/><col style="width:17%"/><col style="width:33%"/></colgroup>
      <tr><td><b>Performed by:</b></td><td>${nb(v.performedBy)}</td><td><b>Department:</b></td><td>${nb(v.department)}</td></tr>
    </table>

    <table class="mt6"><tr><td style="width:60mm"><b>Verification of Corrective Action:</b></td><td>${nb(v.verificationOfCorrectiveAction)}</td></tr></table>

    <div class="sectionTitle">QA Verification</div>
    <table><colgroup><col style="width:25%"/><col style="width:25%"/><col style="width:25%"/><col style="width:25%"/></colgroup>
      <tr><td><b>Verified by (QA)</b></td><td>${nb(v.qaVerification?.verifiedByQA)}</td><td><b>Date</b></td><td>${nb(v.qaVerification?.dateISO)}</td></tr>
      <tr><td><b>Result</b></td><td>${nb(v.qaVerification?.result)}</td><td><b>Closure Date</b></td><td>${nb(v.qaVerification?.closureDateISO)}</td></tr>
      <tr><td><b>Follow-up Actions Required</b></td><td colspan="3">${nb(v.qaVerification?.followupActionsRequired)}</td></tr>
      <tr><td><b>Follow-up Responsible</b></td><td>${nb(v.qaVerification?.followupResponsible)}</td><td><b>Target Date</b></td><td>${nb(v.qaVerification?.followupTargetDateISO)}</td></tr>
    </table>

    <div class="sectionTitle">Final QA Closure</div>
    <table><colgroup><col style="width:25%"/><col style="width:25%"/><col style="width:25%"/><col style="width:25%"/></colgroup>
      <tr><td><b>Name</b></td><td>${nb(v.finalQaClosure?.name)}</td><td><b>Date</b></td><td>${nb(v.finalQaClosure?.dateISO)}</td></tr>
      <tr><td><b>Approved</b></td><td colspan="3">${v.finalQaClosure?.approved ? "YES" : "NO"}</td></tr>
    </table>
  </div>
</div>`;
}).join("");

// ---------- CAPA sheets ----------
const carSheets = capa.map((rec) => {
  const p = rec.payload || {};
  const h = p.header || {};
  const b = p.body || {};
  const f = p.footer || {};
  const imgs = (p.images || b.images || []).slice(0, 10);
  return `
<div class="page">
  <div class="sheet">
    <div class="hdrGrid2">
      <div class="hdrLogo"><img src="${LOGO}"/></div>
      <div>
        <div style="background:#c0c0c0;text-align:center;font-weight:900;padding:6px 8px;border-bottom:1px solid #000">${HEADER_LINE}</div>
        <div style="background:#d6d6d6;text-align:center;font-weight:900;padding:6px 8px;border-bottom:1px solid #000">CORRECTIVE ACTION REPORT</div>
        <div style="display:flex;gap:8px;align-items:center;padding:6px 8px"><span style="font-weight:900;text-decoration:underline">Report Date:</span><span>${nb(h.dateIssued)}</span></div>
      </div>
    </div>
    <table class="mt6"><colgroup><col style="width:38mm"/><col/></colgroup>
      <tr><td><b>Report Date</b></td><td>${nb(h.dateIssued)}</td></tr>
      <tr><td><b>Department involved</b></td><td>${nb(h.departmentInvolved)}</td></tr>
      <tr><td><b>Initiated by</b></td><td>${nb(h.initiatedBy)}</td></tr>
      <tr><td><b>Origin of non-conformity</b></td><td>${nb(h.originOfNonConformity)}</td></tr>
      <tr><td><b>CAR Completed date</b></td><td>${nb(h.carCompletedDate)}</td></tr>
    </table>
    <table class="mt6"><colgroup><col style="width:38mm"/><col/></colgroup>
      <tr><td><b>Details of Non-Conformity</b></td><td>${nb(b.detailsOfNC)}</td></tr>
      <tr><td><b>Root Cause(s) of Nonconformance</b></td><td>${nb(b.rootCause)}</td></tr>
      <tr><td><b>Corrective Action</b></td><td>${nb(b.correctiveAction)}</td></tr>
      <tr><td><b>Action taken to prevent recurrence</b></td><td>${nb(b.preventiveAction)}</td></tr>
    </table>
    ${imgs.length ? `<div class="sectionTitle">Attachments</div><div>${imgs.map((s) => `<img class="evImg" src="${esc(s)}"/>`).join("")}</div>` : ""}
    <table class="mt6"><colgroup><col style="width:38mm"/><col/><col style="width:38mm"/><col/></colgroup>
      <tr><td><b>Signed QA</b></td><td>${nb(f.signedQA)}</td><td><b>Date Closed out</b></td><td>${nb(f.dateClosedOut)}</td></tr>
    </table>
  </div>
</div>`;
}).join("");

// ---------- Cleaning Programme Schedule (monthly UNION COOP layout) ----------
const fcell = (label, value) => `<div class="fcell"><div class="flabel">${label}</div><div class="fvalue">${nb(value) === "&nbsp;" ? "—" : nb(value)}</div></div>`;
const cpsBlocks = cps.map((rec) => {
  const p = rec.payload || {};
  const rows = p.schedule || [];
  return `
<div class="page">
<div class="cps">
  <div class="banner">
    <div class="bannerTitle">CLEANING PROGRAMME SCHEDULE</div>
    <div class="bannerSub">Cleaning Program Schedule (Butchery)</div>
  </div>
  <div class="fields">
    ${fcell("Form Ref", p.formRef || "UC/HACCP/BR/F13A-1")}
    ${fcell("Branch", p.branch || "POS 19")}
    ${fcell("Classification", p.classification || "Official")}
    ${fcell("Month", p.month)}
    ${fcell("Page", "1 of 11")}
    ${fcell("Rev. Date", p.revDate)}
    ${fcell("Rev. No", p.revNo)}
    ${fcell("Location", p.location || "BUTCHERY")}
  </div>
  <div class="standard">Standard ${nb(p.standard || "Free of dirt, grease, and food debris")}</div>
  <table>
    <colgroup><col style="width:13%"/><col style="width:19%"/><col style="width:28%"/><col style="width:13%"/><col style="width:9%"/><col style="width:9%"/><col style="width:9%"/></colgroup>
    <thead><tr>
      <th>Item/Area\nto Clean</th><th>Equipment / Chemical</th><th>Cleaning Method</th><th>Frequency &amp;\nProposed Date\nW1 • W2 • W3 • W4</th><th>Date of\nCleaning</th><th>Cleaned\nBy</th><th>Monitored\nBy</th>
    </tr></thead>
    <tbody>
      ${rows.map((r) => {
        const pr = r.proposed || {};
        return `<tr>
          <td><b>${nb(r.item) === "&nbsp;" ? "-" : nb(r.item)}</b></td>
          <td>${nb(r.equipment) === "&nbsp;" ? "-" : nb(r.equipment)}</td>
          <td>${nb(r.method) === "&nbsp;" ? "-" : nb(r.method)}</td>
          <td><b>${nb(r.frequency) === "&nbsp;" ? "-" : nb(r.frequency)}</b><div class="wgrid"><div>W1</div><div>${nb(pr.W1) === "&nbsp;" ? "-" : nb(pr.W1)}</div><div>W2</div><div>${nb(pr.W2) === "&nbsp;" ? "-" : nb(pr.W2)}</div><div>W3</div><div>${nb(pr.W3) === "&nbsp;" ? "-" : nb(pr.W3)}</div><div>W4</div><div>${nb(pr.W4) === "&nbsp;" ? "-" : nb(pr.W4)}</div></div></td>
          <td>${nb(r.dateOfCleaning) === "&nbsp;" ? "-" : nb(r.dateOfCleaning)}</td>
          <td>${nb(r.cleanedBy) === "&nbsp;" ? "-" : nb(r.cleanedBy)}</td>
          <td>${nb(r.monitoredBy) === "&nbsp;" ? "-" : nb(r.monitoredBy)}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="foot">
    <div><b>Report ID:</b> ${nb(rec.id)}</div>
    <div><b>Saved:</b> ${nb(p.createdAtClient || rec.created_at)}</div>
    <div><b>Branch:</b> ${nb(p.branch || "POS 19")}</div>
  </div>
</div>
</div>`;
}).join("");

const cpsSection = `
<div class="page cover">
  <div class="secTitle">البند 7 — نماذج Checklists التشغيلية: Cleaning Programme Schedule — POS 19 (سجلات 2025)</div>
  <div class="note">عينة من النماذج التشغيلية المعتمدة بالنظام، بنفس طريقة العرض (نموذج شهري — ${cps.length} سجل ضمن 2025). توجد نماذج تشغيلية أخرى بالنظام (نظافة يومية، نظافة شخصية، مراقبة حرارة، استلام، تتبع...) إلا أن سجلاتها المعبأة تبدأ من 2026 خارج فترة التدقيق.</div>
  <table>
    <tr><th>#</th><th>الشهر</th><th>الموقع</th><th>عدد البنود</th></tr>
    ${cps.map((r, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${esc(r.payload?.month)}</td><td>${esc(r.payload?.location || "BUTCHERY")}</td><td style="text-align:center">${(r.payload?.schedule || []).length}</td></tr>`).join("")}
  </table>
</div>
${cpsBlocks}`;

// ---------- not-available section ----------
const naSection = `
<div class="page cover">
  <div class="secTitle">البنود غير المتوفرة ضمن الفترة (يناير – ديسمبر 2025)</div>

  <h4 style="margin:12px 0 4px">البند 21 — سجلات التدريب</h4>
  <div class="noteRed">لا توجد جلسات تدريب موثقة بالنظام بتاريخ 2025. يحتوي النظام على <b>${training.length} جلسة تدريب</b> كاملة التوثيق (سجل حضور بالأسماء، درجات اختبار، مادة تدريبية، اعتمادات) تبدأ من <b>03/01/2026</b>. التدريبات المنفذة خلال 2025 — إن وُجدت — موثقة ورقياً خارج النظام.</div>

  <h4 style="margin:12px 0 4px">البند 27 — تقارير التفتيش الصحي والسلامة</h4>
  <div class="noteRed">لا توجد تقارير تفتيش/تدقيق بتاريخ 2025. يحتوي النظام على <b>${audits.length} تقارير تدقيق داخلي</b> تبدأ من <b>مارس 2026</b>. تقارير تفتيش الجهات الخارجية (البلدية وغيرها) غير مدخلة بالنظام لهذه الفترة.</div>

  <h4 style="margin:12px 0 4px">البند 17 — مكونات غير متوفرة</h4>
  <div class="noteRed">المتوفر من البند 17 هو تقارير الإتلاف المصورة (مرفقة في قسم هدر اللحوم). غير متوفر بالنظام: المراسلات مع مشرفي الفروع، تأكيدات شركات الإتلاف، والتقارير الربعية/السنوية للإتلاف.</div>

  <h4 style="margin:12px 0 4px">البند 20 — مستندات نقل النفايات</h4>
  <div class="noteRed">غير متوفرة بالنظام بأي فترة (لا أوامر نقل، لا تفويضات، لا مستندات نقل، لا تأكيدات تسليم).</div>
</div>`;

// ---------- NCR/CAPA section header page ----------
const caHeader = `
<div class="page cover">
  <div class="secTitle">البند 28 — الإجراءات التصحيحية: NCR + CAPA (سجلات 2025)</div>
  <div class="note">يلي هذه الصفحة <b>${ncr.length} تقارير عدم مطابقة (Non-Conformance Report)</b> و<b>${capa.length} تقارير إجراء تصحيحي (Corrective Action Report)</b> تقع ضمن فترة التدقيق، كل تقرير بصفحته المستقلة وبنفس نموذج النظام المعتمد (Document No. مدوَّن على كل تقرير).</div>
  <table>
    <tr><th>#</th><th>النوع</th><th>التاريخ</th><th>المرجع / القسم</th></tr>
    ${ncr.map((r, i) => `<tr><td style="text-align:center">${i + 1}</td><td>NCR</td><td>${esc(r.payload?.headRow?.reportDate)}</td><td>${esc(r.payload?.headRow?.ncNo || r.payload?.location || "—")}</td></tr>`).join("")}
    ${capa.map((r, i) => `<tr><td style="text-align:center">${ncr.length + i + 1}</td><td>CAPA</td><td>${esc(r.payload?.header?.dateIssued)}</td><td>${esc(r.payload?.header?.departmentInvolved || "—")}</td></tr>`).join("")}
  </table>
</div>`;

const html = `<!DOCTYPE html>
<html lang="ar"><head><meta charset="utf-8"/><title>Audit Quality Items 2025</title><style>${css}</style></head>
<body>
${cover}
${cpsSection}
${meatSection}
${caHeader}
${ncSheets}
${carSheets}
${naSection}
</body></html>`;

fs.writeFileSync(path.join(DIR, "Audit_Quality_Items_2025.html"), html, "utf8");
console.log(`HTML generated. meat=${meat.length} ncr=${ncr.length} capa=${capa.length} cps=${cps.length} training2025=${training2025.length}`);
