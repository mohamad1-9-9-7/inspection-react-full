// src/pages/haccp and iso/Licenses and Contracts/LicensesContractsInput.jsx
//
// New Licenses & Contracts entry for one branch.
//   • warns when the branch already has a record (opens it in the register)
//   • license + contracts with quick expiry buttons, live status, suggestions
//     from earlier records, drag & drop documents
//   • contract-type chips, "copy contracts from another branch"
//   • completeness checklist; after saving → open in register / new entry
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HaccpPage, Btn } from "../_shared/pageKit";
import API_BASE from "../../../config/api";
import { useLangState, hideSectionLangToggle } from "../../../utils/appLang";
import {
  TYPE, safeArr, getId, isImageUrl, isPdfUrl, displayUrl, todayYmd, addPeriod, fmtDate,
  STATUS, statusOf, mkEvent, newUid, BRANCHES, LICENSE_NAMES, CONTRACT_TYPES, CORE_LICENSES, hasAny, ensureUids, diffPayloads,
} from "./licensesKit";
import { uploadPicked, writeRecord } from "./licensesNet";
import BranchManager from "./BranchManager";
import { useLicenseBranches } from "./licensesBranches";
import { canEdit } from "../../../utils/perms";

const T = {
  en: {
    title: "New Licenses & Contracts Entry", sub: "AL MAWASHI — Licenses & Contracts",
    back: "← Hub", register: "📜 Open register", save: "✓ Save entry", saving: "Saving…",
    underNote: (p) => `This branch works under the licence of ${p} — add the licence there, contracts here.`, manageBranches: "⚙ Manage branches", branchesSaved: "Branches saved.", branch: "Branch", existing: (n) => `This branch already has ${n} record(s) in the register.`, openExisting: "Open it",
    license: "🪪 Licenses", licName: "License name", licNamePh: "e.g. Trade License", addOtherLic: "+ Other license", licType: "Licence type", licTypePh: "e.g. Trade License", licNameOpt: "Name on the licence (optional)", licNameOptPh: "e.g. TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    licHint: "Fill the ones you have now — an empty license is skipped.", cLic: (n) => `${n}: expiry date`, cLicDocN: (n) => `${n}: document`,
    cAnyLic: "At least one license filled",
    expiry: "Expiry date", notes: "Notes (optional)", notesPh: "Short note",
    plus1: "+1 year", plus2: "+2 years", plus3: "+3 years",
    docs: "Documents", drop: "Drop a PDF or images here, or click to choose", pdfOrImgs: "PDF: 1 file • Images: up to 20",
    uploading: "Uploading…",
    contracts: "📄 Contracts", quickAdd: "Quick add:", addBlank: "+ Blank contract", copyFrom: "Copy contracts from…",
    copyHint: "Copies types + companies only (no dates or files)", copied: (n) => `${n} contract(s) copied.`,
    cType: "Contract type", cCompany: "Company / supplier", cCompanyPh: "Company name", remove: "Remove",
    checklist: "Completeness", cBranch: "Branch selected", cLicName: "License name", cLicExp: "License expiry date",
    cLicDoc: "License document attached", cConRow: (i) => `Contract ${i}: type, company, expiry`, cConDoc: (i) => `Contract ${i}: document`,
    summary: "Summary", sLicense: "License", sContracts: "Contracts", sFiles: "Documents",
    reset: "Reset", confirmReset: "Clear the whole form?", nothing: "Nothing to save yet.",
    missingWarn: (n) => `${n} checklist item(s) still missing. Save anyway?`,
    savedTitle: "Saved ✓", savedText: "The entry is in the register now.", newEntry: "+ New entry", openReg: "Open in register",
    saveFail: "Save failed: ", empty: "No contracts yet — use the quick-add chips above.",
    what: "What are you adding?", mContract: "📄 Contract only", mLicense: "🪪 License only", mBoth: "Both",
    mergeNote: (b) => `${b} already has a record — what you add here goes into it (nothing else is touched).`,
    replaceLic: (n) => `This branch already has: ${n}. Replace it with the new one?`,
    savedMerged: "Added to the branch's existing record.",
  },
  ar: {
    title: "إدخال جديد — الرخص والعقود", sub: "المواشي — الرخص والعقود",
    back: "→ الرئيسية", register: "📜 فتح السجل", save: "✓ حفظ الإدخال", saving: "جارٍ الحفظ…",
    underNote: (p) => `هذا الفرع يعمل تحت رخصة ${p} — أضف الرخصة هناك، والعقود هنا.`, manageBranches: "⚙ إدارة الفروع", branchesSaved: "تم حفظ الفروع.", branch: "الفرع", existing: (n) => `هذا الفرع لديه ${n} سجل في السجل مسبقاً.`, openExisting: "فتحه",
    license: "🪪 الرخص", licName: "اسم الرخصة", licNamePh: "مثال: رخصة تجارية", addOtherLic: "+ رخصة أخرى", licType: "نوع الرخصة", licTypePh: "مثال: Trade License", licNameOpt: "الاسم على الرخصة (اختياري)", licNameOptPh: "مثال: TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    licHint: "عبّئ الموجود عندك الآن — الرخصة الفارغة لا تُحفظ.", cLic: (n) => `${n}: تاريخ الانتهاء`, cLicDocN: (n) => `${n}: المستند`,
    cAnyLic: "رخصة واحدة على الأقل معبأة",
    expiry: "تاريخ الانتهاء", notes: "ملاحظات (اختياري)", notesPh: "ملاحظة قصيرة",
    plus1: "+ سنة", plus2: "+ سنتين", plus3: "+ 3 سنوات",
    docs: "المستندات", drop: "اسحب ملف PDF أو صوراً هنا، أو اضغط للاختيار", pdfOrImgs: "PDF: ملف واحد • صور: حتى 20",
    uploading: "جارٍ الرفع…",
    contracts: "📄 العقود", quickAdd: "إضافة سريعة:", addBlank: "+ عقد فارغ", copyFrom: "نسخ العقود من فرع…",
    copyHint: "ينسخ الأنواع والشركات فقط (بدون تواريخ أو ملفات)", copied: (n) => `تم نسخ ${n} عقد.`,
    cType: "نوع العقد", cCompany: "الشركة / المورّد", cCompanyPh: "اسم الشركة", remove: "إزالة",
    checklist: "اكتمال البيانات", cBranch: "تم اختيار الفرع", cLicName: "اسم الرخصة", cLicExp: "تاريخ انتهاء الرخصة",
    cLicDoc: "مستند الرخصة مرفق", cConRow: (i) => `العقد ${i}: النوع، الشركة، الانتهاء`, cConDoc: (i) => `العقد ${i}: المستند`,
    summary: "الملخص", sLicense: "الرخصة", sContracts: "العقود", sFiles: "المستندات",
    reset: "مسح", confirmReset: "مسح النموذج بالكامل؟", nothing: "لا يوجد شيء للحفظ بعد.",
    missingWarn: (n) => `${n} بند ناقص في قائمة الاكتمال. الحفظ على أي حال؟`,
    savedTitle: "تم الحفظ ✓", savedText: "الإدخال موجود الآن في السجل.", newEntry: "+ إدخال جديد", openReg: "فتح في السجل",
    saveFail: "فشل الحفظ: ", empty: "لا توجد عقود بعد — استخدم أزرار الإضافة السريعة أعلاه.",
    what: "ماذا تريد أن تضيف؟", mContract: "📄 عقد فقط", mLicense: "🪪 رخصة فقط", mBoth: "الاثنين",
    mergeNote: (b) => `${b} لديه سجل مسبقاً — ما تضيفه هنا يُضاف إليه (بدون المساس بالباقي).`,
    replaceLic: (n) => `هذا الفرع لديه مسبقاً: ${n}. استبدالها بالجديدة؟`,
    savedMerged: "تمت الإضافة إلى سجل الفرع الحالي.",
  },
};

/* ───────────── styles ───────────── */
const C = { ink: "#0f172a", sub: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f8fafc", brand: "#4f46e5", ok: "#10b981" };
const S = {
  shell: {
    minHeight: "100vh", padding: "18px 22px",
    background: "linear-gradient(150deg,#eef2ff 0%,#f8fafc 55%,#ecfdf5 100%)",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif', color: C.ink,
  },
  card: { background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 16, boxShadow: "0 2px 10px rgba(15,23,42,0.04)", padding: 18 },
  label: { fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" },
  input: {
    width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.line}`, borderRadius: 10,
    padding: "10px 12px", fontSize: 14, fontWeight: 600, outline: "none", background: C.soft, color: C.ink,
  },
  h2: { margin: 0, fontSize: 17, fontWeight: 900 },
};
const btn = (bg, fg = "#fff") => ({ background: bg, color: fg, border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 800, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" });
const ghost = { background: "#fff", color: "#334155", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" };
const chip = (on) => ({
  background: on ? "#eef2ff" : "#fff", border: `1.5px solid ${on ? "#a5b4fc" : C.line}`, color: on ? "#3730a3" : "#334155",
  borderRadius: 999, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
});
const mini = { background: "rgba(79,70,229,0.07)", border: "1px solid rgba(79,70,229,0.25)", color: "#4338ca", borderRadius: 8, padding: "5px 10px", fontWeight: 700, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" };

// licType = what the licence is (Trade / Industrial …, matched against Required documents);
// name = what is printed on it (often the company name) — optional, falls back to the type
const mkLicense = (licType = "") => ({ uid: newUid("l"), licType, name: "", expiryDate: "", fileUrls: [], fileNames: [], notes: "" });
const licKey = (l) => String(l?.licType || l?.name || "").trim().toLowerCase();
// a licence counts once it has a date, a document or a note — the preset name alone is not data
const licReal = (l) => filled(l.expiryDate) || l.fileUrls.length > 0 || filled(l.notes);
const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const stripUid = ({ uid, ...rest }) => rest; // eslint-disable-line no-unused-vars
const mkContract = (type = "", company = "") => ({ uid: newUid(), contractType: type, companyName: company, expiryDate: "", fileUrls: [], fileNames: [], notes: "" });
const filled = (v) => String(v ?? "").trim() !== "";
const hasData = (o) => Object.entries(o || {}).some(([k, v]) => k !== "uid" && (Array.isArray(v) ? v.length > 0 : filled(v)));

/* ───────────── pieces ───────────── */
function StatusPill({ expiryDate, lang }) {
  const st = statusOf(expiryDate);
  if (st.key === "none") return null;
  const s = STATUS[st.key];
  const d = st.days;
  const txt = lang === "ar"
    ? (d < 0 ? `منتهية منذ ${-d} يوم` : `باقي ${d} يوم`)
    : (d < 0 ? `Expired ${-d}d ago` : `${d}d left`);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: s.bg, border: `1px solid ${s.bd}`, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: s.dot }} />{txt}
    </span>
  );
}

function ExpiryField({ t, lang, value, onChange }) {
  return (
    <div>
      <label style={S.label}>{t.expiry}</label>
      <input type="date" style={S.input} value={value} onChange={(e) => onChange(e.target.value)} />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
        {[[t.plus1, 1], [t.plus2, 2], [t.plus3, 3]].map(([l, y]) => (
          <button key={y} type="button" style={mini} onClick={() => onChange(addPeriod(todayYmd(), { years: y }))}>{l}</button>
        ))}
        <StatusPill expiryDate={value} lang={lang} />
      </div>
    </div>
  );
}

function DropZone({ t, busy, locked, urls, names, onFiles, onRemove }) {
  const [over, setOver] = useState(false);
  const id = useMemo(() => newUid("f"), []);
  return (
    <div>
      <label style={S.label}>{t.docs} ({urls.length})</label>
      <label htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy && !locked) onFiles(e.dataTransfer.files); }}
        style={{
          display: "block", cursor: busy || locked ? "wait" : "pointer", opacity: locked && !busy ? 0.6 : 1, textAlign: "center", padding: "14px 10px", borderRadius: 12,
          border: `2px dashed ${over ? C.brand : "#cbd5e1"}`, background: over ? "#eef2ff" : C.soft,
          color: busy ? C.brand : C.sub, fontWeight: 700, fontSize: 13,
        }}>
        {busy || <>⬆ {t.drop}<div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{t.pdfOrImgs}</div></>}
      </label>
      <input id={id} type="file" accept="application/pdf,image/*" multiple hidden disabled={!!busy || locked}
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      {urls.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {urls.map((u, i) => (
            <div key={u} style={{ position: "relative" }}>
              {isImageUrl(u) ? (
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={displayUrl(u, 240)} alt="" style={{ width: 66, height: 50, objectFit: "cover", borderRadius: 8, border: `1.5px solid ${C.line}`, display: "block" }} />
                </a>
              ) : (
                <a href={u} target="_blank" rel="noreferrer" style={{ display: "grid", placeItems: "center", width: 66, height: 50, borderRadius: 8, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontWeight: 900, fontSize: 11, textDecoration: "none", overflow: "hidden" }} title={names[i]}>
                  {isPdfUrl(u) ? "PDF" : "FILE"}
                </a>
              )}
              <button type="button" onClick={() => onRemove(i)} title="Remove"
                style={{ position: "absolute", top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: 99, border: "none", background: "#ef4444", color: "#fff", fontWeight: 900, fontSize: 11, cursor: "pointer", lineHeight: "20px", padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── main ───────────── */
export default function LicensesContractsInput() {
  const navigate = useNavigate();
  const [lang, setLang] = useLangState(() => {
    try { return localStorage.getItem("haccp_modules_lang_v1") === "ar" ? "ar" : "en"; } catch { return "en"; }
  });
  const t = T[lang] || T.en;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [params] = useSearchParams();
  const { branches: branchCfg, names: branchNames, parents: branchParents, save: saveBranchList } = useLicenseBranches();
  const [branchMgr, setBranchMgr] = useState(false);
  const mayManage = canEdit("iso");
  const [branch, setBranch] = useState(() => String(params.get("branch") || "").trim() || BRANCHES[0]);
  // "+ Add" on a Missing row arrives as ?mode=license|contract&add=<name>
  const addParam = String(params.get("add") || "").trim();
  const modeParam = params.get("mode");
  const [licenses, setLicenses] = useState(() => (addParam && modeParam === "license" ? [mkLicense(addParam)] : CORE_LICENSES.map(mkLicense)));
  const setL = (uid, patch) => setLicenses((p) => p.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  const [contracts, setContracts] = useState(() => [mkContract(addParam && modeParam === "contract" ? addParam : "")]);
  const [mode, setMode] = useState(() => (["license", "contract", "both"].includes(modeParam) ? modeParam : "contract")); // contract | license | both
  const showLic = mode !== "contract";
  const showCon = mode !== "license";
  const [merged, setMerged] = useState(false);
  const [existing, setExisting] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ key: "", text: "" });
  const [savedId, setSavedId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => { if (alive) setExisting(safeArr(Array.isArray(j) ? j : j?.data || j?.items || j?.rows)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [savedId]);

  /* suggestions from earlier records */
  const sugg = useMemo(() => {
    const lic = new Set(LICENSE_NAMES); const types = new Set(CONTRACT_TYPES); const cos = new Set(); const brs = new Set([...branchNames, branch]);
    existing.forEach((r) => {
      const p = r?.payload || {};
      if (filled(p.license?.name)) lic.add(String(p.license.name).trim());
      safeArr(p.licenses).forEach((l) => { if (filled(l?.licType)) lic.add(String(l.licType).trim()); });
      if (filled(p.license?.licType)) lic.add(String(p.license.licType).trim());
      safeArr(p.contracts).forEach((c) => {
        if (filled(c.contractType)) types.add(String(c.contractType).trim());
        if (filled(c.companyName)) cos.add(String(c.companyName).trim());
      });
    });
    return { lic: [...lic], types: [...types], cos: [...cos].sort(), branches: [...brs] };
  }, [existing, branchNames]); // eslint-disable-line react-hooks/exhaustive-deps

  const sameBranch = existing
    .filter((r) => String(r?.payload?.branch || "").trim() === branch)
    .sort((a, b) => (Number(b?.payload?.savedAt) || 0) - (Number(a?.payload?.savedAt) || 0));
  const target = sameBranch[0] || null; // new items are merged into the branch's newest record
  const copySources = useMemo(() => {
    const m = new Map();
    existing.forEach((r) => {
      const p = r?.payload || {};
      const b = String(p.branch || "").trim();
      const n = safeArr(p.contracts).filter((c) => filled(c.contractType)).length;
      if (b && n && (!m.has(b) || m.get(b).n < n)) m.set(b, { n, r });
    });
    return [...m.entries()].map(([b, v]) => ({ branch: b, n: v.n, r: v.r }));
  }, [existing]);

  function flash(msg) { setToast(msg); window.setTimeout(() => setToast(""), 2800); }

  /* uploads */
  async function addFiles(key, fileList, cur, apply) {
    try {
      setUploading({ key, text: t.uploading });
      const r = await uploadPicked(fileList, (p) => setUploading({ key, text: `${t.uploading} ${p}` }));
      apply([...cur.fileUrls, ...r.urls].slice(0, 20), [...cur.fileNames, ...r.names].slice(0, 20));
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading({ key: "", text: "" });
    }
  }

  const setC = (uid, patch) => setContracts((p) => p.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));

  function copyContractsFrom(src) {
    const list = safeArr(src?.r?.payload?.contracts).filter((c) => filled(c.contractType));
    const have = new Set(contracts.map((c) => c.contractType.trim().toLowerCase()));
    const add = list.filter((c) => !have.has(String(c.contractType).trim().toLowerCase())).map((c) => mkContract(c.contractType, c.companyName || ""));
    setContracts((p) => [...p.filter(hasDataExceptType), ...add]);
    flash(t.copied(add.length));
  }
  // drop untouched blank rows when copying
  function hasDataExceptType(c) { return filled(c.contractType) || filled(c.companyName) || filled(c.expiryDate) || c.fileUrls.length; }

  /* checklist */
  const checks = useMemo(() => {
    const out = [{ ok: filled(branch), label: t.cBranch }];
    if (showLic) {
      const real = licenses.filter(licReal);
      if (!real.length) out.push({ ok: false, label: t.cAnyLic });
      real.forEach((l, i) => {
        const n = l.licType.trim() || l.name.trim() || `#${i + 1}`;
        out.push({ ok: (filled(l.licType) || filled(l.name)) && filled(l.expiryDate), label: t.cLic(n) });
        out.push({ ok: l.fileUrls.length > 0, label: t.cLicDocN(n) });
      });
    }
    (showCon ? contracts : []).forEach((c, i) => {
      out.push({ ok: filled(c.contractType) && filled(c.companyName) && filled(c.expiryDate), label: t.cConRow(i + 1) });
      out.push({ ok: c.fileUrls.length > 0, label: t.cConDoc(i + 1) });
    });
    return out;
  }, [branch, licenses, contracts, t, showLic, showCon]);
  const doneN = checks.filter((c) => c.ok).length;
  const pct = Math.round((doneN / checks.length) * 100);
  const licsOut = showLic ? licenses.filter(licReal) : [];
  const consOut = showCon ? contracts.filter(hasData) : [];
  const canSave = licsOut.length > 0 || consOut.length > 0;
  const totalFiles = (showLic ? licenses.reduce((n, l) => n + l.fileUrls.length, 0) : 0) + (showCon ? contracts.reduce((n, c) => n + c.fileUrls.length, 0) : 0);

  async function handleSave() {
    if (!canSave) return alert(t.nothing);
    const missing = checks.length - doneN;
    if (missing && !window.confirm(t.missingWarn(missing))) return;
    const cons = consOut.map((c) => ({ ...c, fileUrl: c.fileUrls[0] || "", fileName: c.fileNames[0] || "" }));
    const lics = licsOut.map((l) => ({ ...l, licType: l.licType.trim(), name: l.name.trim() || l.licType.trim() || "License", fileUrl: l.fileUrls[0] || "", fileName: l.fileNames[0] || "" }));
    try {
      setSaving(true);
      if (target && getId(target)) {
        // merge into the branch's existing record — only what was added here changes
        const old = target.payload || {};
        // a licence with the same name replaces that one (after a confirm); a new name is added beside it
        let primary = old.license || {};
        const extras = safeArr(old.licenses).map((l) => ({ ...l }));
        const same = (a, b) => licKey(a) && licKey(a) === licKey(b);
        const clashes = lics.filter((l) => same(l, primary) || extras.some((x) => same(x, l)));
        if (clashes.length && !window.confirm(t.replaceLic(clashes.map((l) => l.licType || l.name).join(", ")))) { setSaving(false); return; }
        lics.forEach((l) => {
          if (same(l, primary)) { primary = { ...stripUid(l), renewals: primary.renewals }; return; }
          const pos = extras.findIndex((x) => same(x, l));
          if (pos >= 0) { extras[pos] = { ...l, uid: extras[pos].uid || l.uid, renewals: extras[pos].renewals }; return; }
          if (!hasAny(primary)) primary = stripUid(l);
          else extras.push(l);
        });
        const next = ensureUids({
          ...old,
          branch,
          license: primary,
          licenses: extras,
          contracts: [...safeArr(old.contracts), ...cons],
          savedAt: Date.now(),
        });
        next.history = [...safeArr(old.history), ...diffPayloads(old, next)];
        await writeRecord(getId(target), next);
        setMerged(true);
        setSavedId(getId(target));
      } else {
        const payload = {
          branch,
          license: lics[0] ? stripUid(lics[0]) : stripUid(mkLicense()),
          licenses: lics.slice(1),
          contracts: cons,
          savedAt: Date.now(),
          history: [mkEvent("created", { kind: "record", uid: "record", label: (lics[0] && lics[0].name) || branch }, {
            note: `${lics.length} license(s), ${cons.length} contract(s)`,
          })],
        };
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ reporter: "haccp-iso", type: TYPE, payload }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json().catch(() => ({}));
        setMerged(false);
        setSavedId(getId(j?.report || j) || "ok");
      }
    } catch (e) {
      alert(t.saveFail + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  function resetForm(ask = true) {
    if (ask && !window.confirm(t.confirmReset)) return;
    setLicenses(CORE_LICENSES.map(mkLicense));
    setContracts([mkContract()]);
    setMerged(false);
    setSavedId(null);
  }

  const busy = saving || !!uploading.key;

  const frame = (body, actions) => (
    <HaccpPage
      lang={lang}
      icon="📑"
      title={t.title}
      sub={lang === "ar" ? "رخصة فرع أو عقد خدمة، مع تاريخ الانتهاء والوثيقة." : "A branch licence or a service contract, with its expiry date and document."}
      clause={lang === "ar" ? "البند 4.4" : "ISO 4.4"}
      backTo="/haccp-iso/licenses-contracts/view"
      backLabel={t.register}
      actions={actions}
    >
      <div style={{ ...S.shell, minHeight: 0, padding: 0, background: "none", marginTop: 14 }} dir={dir}>{body}</div>
    </HaccpPage>
  );

  /* ───────────── saved screen ───────────── */
  if (savedId) {
    return frame((
      <div style={{ display: "grid", placeItems: "center", paddingBlock: 30 }}>
        <div style={{ ...S.card, textAlign: "center", maxWidth: 460, padding: 30 }}>
          <div style={{ fontSize: 46 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{t.savedTitle}</div>
          <div style={{ color: C.sub, fontWeight: 700, marginTop: 6 }}>{branch} — {merged ? t.savedMerged : t.savedText}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            <button style={btn(C.brand)} onClick={() => navigate("/haccp-iso/licenses-contracts/view")}>{t.openReg}</button>
            <button style={ghost} onClick={() => resetForm(false)}>{t.newEntry}</button>
          </div>
        </div>
      </div>
    ));
  }

  return frame((
    <>
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 10000, background: C.ink, color: "#fff", padding: "10px 18px", borderRadius: 12, fontWeight: 700 }}>{toast}</div>
      )}
      <datalist id="lc-lic-names">{sugg.lic.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="lc-types">{sugg.types.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="lc-companies">{sugg.cos.map((x) => <option key={x} value={x} />)}</datalist>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          {/* branch */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <label style={S.label}>{t.branch}</label>
              {mayManage && <button type="button" style={mini} onClick={() => setBranchMgr(true)}>{t.manageBranches}</button>}
            </div>
            {branchMgr && (
              <BranchManager lang={lang} branches={branchCfg} reports={existing} onSave={saveBranchList}
                onClose={() => setBranchMgr(false)}
                onDone={(msg) => {
                  setBranchMgr(false); flash(msg || t.branchesSaved);
                  fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then((j) => setExisting(safeArr(Array.isArray(j) ? j : j?.data || j?.items || j?.rows))).catch(() => {});
                }} />
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sugg.branches.map((b) => (
                <button key={b} type="button" style={chip(b === branch)} onClick={() => setBranch(b)}>{b}</button>
              ))}
            </div>
            <label style={{ ...S.label, marginTop: 14 }}>{t.what}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["contract", t.mContract], ["license", t.mLicense], ["both", t.mBoth]].map(([k, l]) => (
                <button key={k} type="button" style={{ ...chip(mode === k), fontSize: 13, padding: "8px 14px" }} onClick={() => setMode(k)}>{l}</button>
              ))}
            </div>
            {branchParents[branch] && (
              <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span>🔗 {t.underNote(branchParents[branch])}</span>
                <button type="button" style={mini} onClick={() => setBranch(branchParents[branch])}>↗ {branchParents[branch]}</button>
              </div>
            )}
            {target && (
              <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span>ℹ {t.mergeNote(branch)}</span>
                <button type="button" style={mini} onClick={() => navigate("/haccp-iso/licenses-contracts/view")}>{t.openExisting} ↗</button>
              </div>
            )}
          </div>

          {/* licenses */}
          {showLic && <div style={S.card}>
            <h2 style={{ ...S.h2, marginBottom: 4 }}>{t.license} ({licenses.length})</h2>
            <div style={{ color: C.sub, fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{t.licHint}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>{t.quickAdd}</span>
              {CORE_LICENSES.map((nm) => {
                const on = licenses.some((l) => sameName(l.licType, nm));
                return (
                  <button key={nm} type="button" style={chip(on)} disabled={on} onClick={() => setLicenses((p) => [...p, mkLicense(nm)])}>
                    {on ? "✓ " : "+ "}{nm}
                  </button>
                );
              })}
              <button type="button" style={chip(false)} onClick={() => setLicenses((p) => [...p, mkLicense()])}>{t.addOtherLic}</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {licenses.map((l, i) => {
                const st = statusOf(l.expiryDate);
                return (
                  <div key={l.uid} style={{ border: `1.5px solid ${C.line}`, borderInlineStart: `5px solid ${STATUS[st.key].dot}`, borderRadius: 14, padding: 14, background: "#fcfcfd" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <b style={{ fontSize: 14 }}>#{i + 1} {l.licType || l.name || ""}</b>
                      <button type="button" style={{ ...mini, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", color: "#991b1b" }}
                        onClick={() => setLicenses((p) => p.filter((x) => x.uid !== l.uid))}>{t.remove}</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14 }}>
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={S.label}>{t.licType}</label>
                            <input list="lc-lic-names" style={S.input} value={l.licType} placeholder={t.licTypePh}
                              onChange={(e) => setL(l.uid, { licType: e.target.value })} />
                          </div>
                          <div>
                            <label style={S.label}>{t.licNameOpt}</label>
                            <input style={S.input} value={l.name} placeholder={t.licNameOptPh}
                              onChange={(e) => setL(l.uid, { name: e.target.value })} />
                          </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <label style={S.label}>{t.notes}</label>
                          <input style={S.input} value={l.notes} placeholder={t.notesPh}
                            onChange={(e) => setL(l.uid, { notes: e.target.value })} />
                        </div>
                      </div>
                      <ExpiryField t={t} lang={lang} value={l.expiryDate} onChange={(v) => setL(l.uid, { expiryDate: v })} />
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <DropZone t={t} busy={uploading.key === l.uid ? uploading.text : ""} locked={!!uploading.key}
                        urls={l.fileUrls} names={l.fileNames}
                        onFiles={(fl) => addFiles(l.uid, fl, l, (u, n) => setL(l.uid, { fileUrls: u, fileNames: n }))}
                        onRemove={(fi) => setL(l.uid, { fileUrls: l.fileUrls.filter((_, j) => j !== fi), fileNames: l.fileNames.filter((_, j) => j !== fi) })} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* contracts */}
          {showCon && <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <h2 style={S.h2}>{t.contracts} ({contracts.length})</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {copySources.length > 0 && (
                  <select style={{ ...S.input, width: "auto", padding: "8px 10px", fontSize: 13 }} value="" title={t.copyHint}
                    onChange={(e) => { const s = copySources.find((x) => x.branch === e.target.value); if (s) copyContractsFrom(s); }}>
                    <option value="">{t.copyFrom}</option>
                    {copySources.map((s) => <option key={s.branch} value={s.branch}>{s.branch} ({s.n})</option>)}
                  </select>
                )}
                <button type="button" style={ghost} onClick={() => setContracts((p) => [...p, mkContract()])}>{t.addBlank}</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>{t.quickAdd}</span>
              {CONTRACT_TYPES.map((ty) => {
                const on = contracts.some((c) => c.contractType.trim().toLowerCase() === ty.toLowerCase());
                return (
                  <button key={ty} type="button" style={chip(on)} disabled={on} onClick={() => setContracts((p) => [...p.filter(hasDataExceptType), mkContract(ty)])}>
                    {on ? "✓ " : "+ "}{ty}
                  </button>
                );
              })}
            </div>

            {contracts.length === 0 && <div style={{ color: C.faint, fontWeight: 700, padding: 10 }}>{t.empty}</div>}
            <div style={{ display: "grid", gap: 12 }}>
              {contracts.map((c, i) => {
                const st = statusOf(c.expiryDate);
                return (
                  <div key={c.uid} style={{ border: `1.5px solid ${C.line}`, borderInlineStart: `5px solid ${STATUS[st.key].dot}`, borderRadius: 14, padding: 14, background: "#fcfcfd" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <b style={{ fontSize: 14 }}>#{i + 1} {c.contractType || ""}</b>
                      <button type="button" style={{ ...mini, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", color: "#991b1b" }}
                        onClick={() => setContracts((p) => p.filter((x) => x.uid !== c.uid))}>{t.remove}</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: 12 }}>
                      <div>
                        <label style={S.label}>{t.cType}</label>
                        <input list="lc-types" style={S.input} value={c.contractType} onChange={(e) => setC(c.uid, { contractType: e.target.value })} />
                      </div>
                      <div>
                        <label style={S.label}>{t.cCompany}</label>
                        <input list="lc-companies" style={S.input} value={c.companyName} placeholder={t.cCompanyPh} onChange={(e) => setC(c.uid, { companyName: e.target.value })} />
                      </div>
                      <ExpiryField t={t} lang={lang} value={c.expiryDate} onChange={(v) => setC(c.uid, { expiryDate: v })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      <DropZone t={t} busy={uploading.key === c.uid ? uploading.text : ""} locked={!!uploading.key}
                        urls={c.fileUrls} names={c.fileNames}
                        onFiles={(fl) => addFiles(c.uid, fl, c, (u, n) => setC(c.uid, { fileUrls: u, fileNames: n }))}
                        onRemove={(fi) => setC(c.uid, { fileUrls: c.fileUrls.filter((_, j) => j !== fi), fileNames: c.fileNames.filter((_, j) => j !== fi) })} />
                      <div>
                        <label style={S.label}>{t.notes}</label>
                        <textarea rows={3} style={{ ...S.input, resize: "vertical" }} value={c.notes} placeholder={t.notesPh}
                          onChange={(e) => setC(c.uid, { notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}
        </div>

        {/* side panel */}
        <div style={{ display: "grid", gap: 14 }}>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 14 }}>{t.checklist}</b>
              <b style={{ fontSize: 14, color: pct === 100 ? "#047857" : C.brand }}>{pct}%</b>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "#eef2f7", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.ok : C.brand, transition: "width .25s" }} />
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {checks.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 700, color: c.ok ? "#047857" : C.sub }}>
                  <span style={{ width: 18, height: 18, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 11, background: c.ok ? "#d1fae5" : "#f1f5f9", color: c.ok ? "#047857" : C.faint, flex: "none" }}>{c.ok ? "✓" : "•"}</span>
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <b style={{ fontSize: 14 }}>{t.summary}</b>
            <div style={{ display: "grid", gap: 6, marginTop: 10, fontSize: 13, fontWeight: 700 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.sub }}>{t.branch}</span><span>{branch}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: C.sub }}>{t.sLicense}</span><span>{licsOut.length ? licsOut.map((l) => l.licType || l.name).join(" · ") : "—"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.sub }}>{t.sContracts}</span><span>{consOut.length}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.sub }}>{t.sFiles}</span><span>{totalFiles}</span></div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <button style={{ ...btn(C.ok), flex: 1 }} onClick={handleSave} disabled={busy}>{saving ? t.saving : t.save}</button>
              <button style={ghost} onClick={() => resetForm(true)} disabled={busy}>{t.reset}</button>
            </div>
          </div>
        </div>
      </div>

    </>
  ), (
    <>
      {!hideSectionLangToggle() && <Btn onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "EN" : "ع"}</Btn>}
      <Btn kind="ok" onClick={handleSave} disabled={busy}>{saving ? t.saving : t.save}</Btn>
    </>
  ));
}
