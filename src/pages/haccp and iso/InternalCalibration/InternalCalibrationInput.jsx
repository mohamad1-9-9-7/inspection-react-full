// src/pages/haccp and iso/InternalCalibration/InternalCalibrationInput.jsx
// Internal Calibration Log — Input form
// Daily/weekly verification of working thermometers & probes, performed in-house
// (ice-point, boiling-point, or master-probe comparison). Supplements the
// external Calibration module (annual lab certification per §8.7).
// Covers ALL branches without exception (kitchen, food trucks, all POSes, production).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "internal_calibration_record";

/* ALL branches — internal calibration covers every site that uses thermometers,
   even those outside the FSMS certification scope (kitchen, food trucks). */
const ALL_BRANCHES = [
  "Al Qusais (QCS) — Central Warehouse",
  "Production",
  "POS 10 — Abu Dhabi Butchery",
  "POS 11 — Al Ain Butchery",
  "POS 15 — Al Barsha Butchery",
  "POS 19 — Al Warqa Kitchen (مطبخ الورقاء)",
  "POS 24 — Silicon Oasis",
  "POS 26 — Al Barsha South",
  "FTR 1 — Mushrif Park (شاحنة طعام)",
  "FTR 2 — Mamzar Park (شاحنة طعام)",
  "Other",
];

const METHODS = [
  { v: "ice_point",     ar: "نقطة التجمّد (ماء + ثلج 0°C)",         en: "Ice-point check (ice slurry @ 0°C)",         ref: 0,   tol: 1,    unit: "°C"   },
  { v: "boiling",       ar: "نقطة الغليان (100°C)",                 en: "Boiling-point check (@ 100°C)",              ref: 100, tol: 2,    unit: "°C"   },
  { v: "master_probe",  ar: "مقارنة بالمسبار المرجعي",               en: "Master-probe comparison",                    ref: "",  tol: 1,    unit: "°C"   },
  { v: "reference_oil", ar: "زيت مرجعي / محلول معايرة (Testo)",      en: "Reference oil / calibration fluid (Testo)",  ref: 3,   tol: 2,    unit: "%TPM" },
  { v: "other",         ar: "أخرى (وصف الطريقة في الملاحظات)",       en: "Other (describe method in notes)",           ref: "",  tol: 1,    unit: ""     },
];

const EQUIPMENT_TYPES = [
  "Probe Thermometer",
  "Infrared Thermometer",
  "Data Logger",
  "Chiller/Freezer Display",
  "Oven Probe",
  "Oil Quality Tester (Testo)",
  "Other",
];

const empty = {
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  branch: ALL_BRANCHES[0],
  equipmentId: "",
  equipmentName: "",
  equipmentType: "Probe Thermometer",
  serialNumber: "",
  method: "ice_point",
  referenceValue: 0,
  actualReading: "",
  tolerance: 1,
  unit: "°C",
  result: "",        // Pass | Fail (auto-computed but editable)
  actionTaken: "",
  performedBy: "",
  notes: "",
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg, #fefce8 0%, #fff7ed 60%, #f8fafc 100%)" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #fde68a", boxShadow: "0 8px 22px rgba(202,138,4,0.08)" },
  title: { fontSize: 20, fontWeight: 950, color: "#854d0e", marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 950, color: "#854d0e", margin: "12px 0 8px", borderBottom: "2px solid #eab308", paddingBottom: 4 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#854d0e", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  textarea: { width: "100%", padding: "9px 11px", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  select: { width: "100%", padding: "8px 10px", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #eab308, #ca8a04)", color: "#fff", border: "#a16207" },
      secondary: { bg: "#fff", color: "#854d0e", border: "#fde68a" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  resultBadge: (pass) => ({
    display: "inline-block", padding: "6px 14px", borderRadius: 999,
    fontWeight: 900, fontSize: 13,
    background: pass === true ? "#dcfce7" : pass === false ? "#fee2e2" : "#f1f5f9",
    color: pass === true ? "#166534" : pass === false ? "#991b1b" : "#475569",
    border: `2px solid ${pass === true ? "#86efac" : pass === false ? "#fca5a5" : "#cbd5e1"}`,
  }),
};

export default function InternalCalibrationInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  /* When method changes → auto-set the standard reference value, tolerance & unit */
  function applyMethodDefaults(methodKey) {
    const m = METHODS.find((x) => x.v === methodKey);
    if (!m) return;
    setForm((f) => ({
      ...f,
      method: methodKey,
      referenceValue: m.ref !== "" ? m.ref : f.referenceValue,
      tolerance: m.tol,
      unit: m.unit !== "" ? m.unit : f.unit,
    }));
  }

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p });
      })
      .catch(() => {});
  }, [editId]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /* Auto-evaluation: compare |actualReading - referenceValue| ≤ tolerance */
  const autoResult = useMemo(() => {
    const a = parseFloat(form.actualReading);
    const r = parseFloat(form.referenceValue);
    const t = Math.abs(parseFloat(form.tolerance));
    if (isNaN(a) || isNaN(r) || isNaN(t)) return null;
    return Math.abs(a - r) <= t ? "Pass" : "Fail";
  }, [form.actualReading, form.referenceValue, form.tolerance]);

  /* Sync auto-result to result field unless user manually overrode */
  useEffect(() => {
    if (autoResult && !form.result) {
      setField("result", autoResult);
    }
  }, [autoResult]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form.date || !form.branch || !form.equipmentName || !form.actualReading || !form.performedBy) {
      alert(isAr ? "⚠️ التاريخ، الفرع، اسم الجهاز، القراءة، والمنفذ — كلها إلزامية" : "⚠️ Date, branch, equipment name, reading, and performer are required");
      return;
    }
    if (form.result === "Fail" && !form.actionTaken.trim()) {
      alert(isAr ? "⚠️ النتيجة فشل — يجب توثيق الإجراء المتخذ" : "⚠️ Result is FAIL — action taken must be documented");
      return;
    }
    setSaving(true);
    try {
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const finalResult = form.result || autoResult || "";
      const payload = { ...form, result: finalResult, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.performedBy || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/internal-calibration/view");
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const finalResult = form.result || autoResult;
  const isPass = finalResult === "Pass";
  const isFail = finalResult === "Fail";

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>
              {isAr ? "🌡 سجل المعايرة الداخلية" : "🌡 Internal Calibration Log"}
            </div>
            <div style={{ fontSize: 12, color: "#a16207", fontWeight: 700, marginTop: 4 }}>
              {isAr
                ? "تحقق يومي/أسبوعي من المسابر والأجهزة قبل الاستخدام (ice-point / boiling / master-probe)"
                : "Daily/weekly verification of probes & devices before use (ice-point / boiling / master-probe)"}
            </div>
            <HaccpLinkBadge clauses={["8.7"]} label={isAr ? "معايرة المراقبة والقياس (داخلية)" : "Monitoring & Measurement (Internal)"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/internal-calibration/view")}>
              {isAr ? "السجلات السابقة" : "Past records"}
            </button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>
              {isAr ? "← الرئيسية" : "← Hub"}
            </button>
          </div>
        </div>

        {/* Section: When & Where */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "متى وأين" : "When & Where"}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{isAr ? "التاريخ *" : "Date *"}</label>
              <input type="date" style={S.input} value={form.date} onChange={(e) => setField("date", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{isAr ? "الوقت" : "Time"}</label>
              <input type="time" style={S.input} value={form.time} onChange={(e) => setField("time", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{isAr ? "الفرع / الموقع *" : "Branch / Location *"}</label>
              <select style={S.select} value={form.branch} onChange={(e) => setField("branch", e.target.value)}>
                {ALL_BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Section: Equipment */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "الجهاز / المسبار" : "Equipment / Probe"}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{isAr ? "معرّف الجهاز" : "Equipment ID"}</label>
              <input style={S.input} value={form.equipmentId} onChange={(e) => setField("equipmentId", e.target.value)}
                placeholder={isAr ? "مثلاً: TH-QCS-01" : "e.g., TH-QCS-01"} />
            </div>
            <div>
              <label style={S.label}>{isAr ? "اسم الجهاز *" : "Equipment Name *"}</label>
              <input style={S.input} value={form.equipmentName} onChange={(e) => setField("equipmentName", e.target.value)}
                placeholder={isAr ? "مسبار الـchiller" : "Chiller probe"} />
            </div>
            <div>
              <label style={S.label}>{isAr ? "النوع" : "Type"}</label>
              <select style={S.select} value={form.equipmentType} onChange={(e) => setField("equipmentType", e.target.value)}>
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>{isAr ? "الرقم التسلسلي" : "Serial Number"}</label>
            <input style={S.input} value={form.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} />
          </div>
        </div>

        {/* Section: Method & Reading */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "الطريقة والقراءة" : "Method & Reading"}</div>

          <label style={S.label}>{isAr ? "طريقة المعايرة" : "Calibration Method"}</label>
          <select style={S.select} value={form.method} onChange={(e) => applyMethodDefaults(e.target.value)}>
            {METHODS.map((m) => <option key={m.v} value={m.v}>{m[lang]}</option>)}
          </select>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{isAr ? "القيمة المرجعية (Reference)" : "Reference Value"}</label>
              <input
                type="number"
                step="0.1"
                style={S.input}
                value={form.referenceValue}
                onChange={(e) => setField("referenceValue", e.target.value)}
              />
            </div>
            <div>
              <label style={S.label}>{isAr ? "القراءة الفعلية *" : "Actual Reading *"}</label>
              <input
                type="number"
                step="0.1"
                style={S.input}
                value={form.actualReading}
                onChange={(e) => setField("actualReading", e.target.value)}
                placeholder={isAr ? "ماذا قرأ الجهاز؟" : "What did the device read?"}
              />
            </div>
            <div>
              <label style={S.label}>{isAr ? "السماحية ± (Tolerance)" : "Tolerance ±"}</label>
              <input
                type="number"
                step="0.1"
                style={S.input}
                value={form.tolerance}
                onChange={(e) => setField("tolerance", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={S.label}>{isAr ? "الوحدة" : "Unit"}</label>
            <input style={{ ...S.input, maxWidth: 120 }} value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
          </div>

          {/* Auto-evaluated result */}
          {finalResult && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#fefce8", border: "1.5px solid #fde68a" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#854d0e", marginBottom: 6 }}>
                {isAr ? "النتيجة التلقائية:" : "Auto-evaluated result:"}
              </div>
              <span style={S.resultBadge(isPass ? true : isFail ? false : null)}>
                {isPass
                  ? (isAr ? "✓ ضمن السماحية — قابل للاستخدام" : "✓ Within tolerance — usable")
                  : isFail
                    ? (isAr ? "✗ خارج السماحية — لا يُستخدم" : "✗ Out of tolerance — DO NOT USE")
                    : "—"}
              </span>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, fontWeight: 700 }}>
                |{form.actualReading || 0} − {form.referenceValue || 0}| = {
                  (Math.abs((parseFloat(form.actualReading) || 0) - (parseFloat(form.referenceValue) || 0))).toFixed(2)
                } {form.unit} (tolerance ±{form.tolerance})
              </div>
            </div>
          )}

          {/* Manual override */}
          <label style={S.label}>{isAr ? "النتيجة (يدوي إذا لزم)" : "Result (manual override if needed)"}</label>
          <select style={S.select} value={form.result} onChange={(e) => setField("result", e.target.value)}>
            <option value="">{isAr ? "(تلقائي)" : "(auto)"}</option>
            <option value="Pass">{isAr ? "Pass — قبول" : "Pass"}</option>
            <option value="Fail">{isAr ? "Fail — رفض" : "Fail"}</option>
          </select>

          {/* If FAIL — action required */}
          {isFail && (
            <>
              <label style={{ ...S.label, color: "#991b1b" }}>{isAr ? "الإجراء المتخذ * (إلزامي عند الفشل)" : "Action Taken * (required on FAIL)"}</label>
              <textarea
                style={{ ...S.textarea, borderColor: "#fca5a5" }}
                value={form.actionTaken}
                onChange={(e) => setField("actionTaken", e.target.value)}
                placeholder={isAr
                  ? "مثلاً: استبدال الجهاز، إرسال للمعايرة الخارجية، عزل عن الاستخدام…"
                  : "e.g., Replaced device, sent for external calibration, isolated from use…"}
              />
            </>
          )}
        </div>

        {/* Section: Sign-off */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "التوقيع والملاحظات" : "Sign-off & Notes"}</div>
          <div>
            <label style={S.label}>{isAr ? "تم بواسطة *" : "Performed By *"}</label>
            <input style={S.input} value={form.performedBy} onChange={(e) => setField("performedBy", e.target.value)}
              placeholder={isAr ? "اسم المنفذ" : "Performer name"} />
          </div>
          <label style={S.label}>{isAr ? "ملاحظات" : "Notes"}</label>
          <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{isAr ? "إلغاء" : "Cancel"}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? (isAr ? "جاري الحفظ…" : "Saving…") : (isAr ? "💾 حفظ" : "💾 Save")}
          </button>
        </div>
      </div>
    </main>
  );
}
