// src/pages/haccp and iso/Calibration/CalibrationInput.jsx
// Calibration Log — Input form (HACCP Clause 8.7)

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "calibration_record";

const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
];

function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function isPdf(file) {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  return t === "application/pdf" || n.endsWith(".pdf");
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  const url =
    data?.url || data?.secure_url || data?.fileUrl ||
    data?.file_url || data?.path || data?.result?.secure_url || "";
  if (!url) throw new Error("No URL returned");
  return url;
}

const empty = {
  branch: BRANCHES[0],
  equipmentId: "",
  equipmentName: "",
  equipmentType: "Thermometer",
  serialNumber: "",
  location: "",
  manufacturer: "",
  range: "",
  accuracy: "",
  lastCalibrationDate: new Date().toISOString().slice(0, 10),
  nextDueDate: "",
  intervalMonths: 12,
  calibrationMethod: "",
  calibratedBy: "",
  calibrationCertNo: "",
  result: "PASS",
  notes: "",
  fileUrls: [],
  fileNames: [],
};

const EQUIPMENT_TYPES = [
  "Thermometer", "Probe (Digital)", "Data Logger", "Weighing Scale",
  "pH Meter", "Sanitizer Concentration Tester", "Oven Temperature",
  "Chiller / Freezer Display", "Other",
];

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#ecfeff" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #cffafe", boxShadow: "0 8px 22px rgba(8,145,178,0.08)" },
  title: { fontSize: 22, fontWeight: 950, color: "#155e75" },
  sectionTitle: { fontSize: 14, fontWeight: 950, color: "#155e75", margin: "12px 0 8px", borderBottom: "2px solid #06b6d4", paddingBottom: 4 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#155e75", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  textarea: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 60, resize: "vertical" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  hint: { fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 4 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700,
    margin: "4px 4px 0 0",
  },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #06b6d4, #0891b2)", color: "#fff", border: "#0e7490" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff", color: "#155e75", border: "#cffafe" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
};

export default function CalibrationInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p, fileUrls: p.fileUrls || [], fileNames: p.fileNames || [] });
      })
      .catch(() => {});
  }, [editId]);

  function setField(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Auto-calculate next due date
      if (k === "lastCalibrationDate" || k === "intervalMonths") {
        next.nextDueDate = addMonths(
          k === "lastCalibrationDate" ? v : f.lastCalibrationDate,
          Number(k === "intervalMonths" ? v : f.intervalMonths)
        );
      }
      return next;
    });
  }

  async function pickFiles(fileList) {
    const list = Array.from(fileList || []).slice(0, 20);
    if (!list.length) return;

    const pdfs = list.filter(isPdf);
    const imgs = list.filter((f) => !isPdf(f));

    if (pdfs.length && imgs.length) {
      alert(t("calibPdfOrImagesOnly"));
      return;
    }
    if (pdfs.length > 1) {
      alert(t("calibOnlyOnePdf"));
      return;
    }

    try {
      setUploading(true);
      setUploadProgress("");

      if (pdfs.length === 1) {
        setUploadProgress(t("calibUploading"));
        const url = await uploadFile(pdfs[0]);
        setForm((f) => ({
          ...f,
          fileUrls: [...(f.fileUrls || []), url],
          fileNames: [...(f.fileNames || []), pdfs[0].name],
        }));
        return;
      }

      const uploaded = [];
      const names = [];
      for (let i = 0; i < imgs.length; i++) {
        setUploadProgress(`${t("calibUploading")} (${i + 1}/${imgs.length})`);
        uploaded.push(await uploadFile(imgs[i]));
        names.push(imgs[i].name);
      }
      setForm((f) => ({
        ...f,
        fileUrls: [...(f.fileUrls || []), ...uploaded].slice(0, 20),
        fileNames: [...(f.fileNames || []), ...names].slice(0, 20),
      }));
    } catch (e) {
      alert(`${t("calibUploadFailed")}: ${e?.message || e}`);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function removeFile(i) {
    setForm((f) => ({
      ...f,
      fileUrls: (f.fileUrls || []).filter((_, j) => j !== i),
      fileNames: (f.fileNames || []).filter((_, j) => j !== i),
    }));
  }

  async function save() {
    if (!form.equipmentName) { alert(t("requiredField")); return; }
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = { ...form, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.calibratedBy || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/calibration/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploading;

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("calibTitle")}</div>
            <HaccpLinkBadge clauses={["8.7"]} label={lang === "ar" ? "ضبط المراقبة والقياس" : "Control of Monitoring & Measuring"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/calibration/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("calibIdent")}</div>

          <label style={S.label}>{t("calibBranch")} *</label>
          <select style={S.input} value={form.branch} onChange={(e) => setField("branch", e.target.value)}>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("calibId")}</label>
              <input style={S.input} value={form.equipmentId} onChange={(e) => setField("equipmentId", e.target.value)} placeholder="EQ-001" />
            </div>
            <div>
              <label style={S.label}>{t("calibType")}</label>
              <select style={S.input} value={form.equipmentType} onChange={(e) => setField("equipmentType", e.target.value)}>
                {EQUIPMENT_TYPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>{t("calibSerial")}</label>
              <input style={S.input} value={form.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} />
            </div>
          </div>
          <label style={S.label}>{t("calibName")}</label>
          <input style={S.input} value={form.equipmentName} onChange={(e) => setField("equipmentName", e.target.value)} placeholder={t("calibNamePlaceholder")} />
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("calibLocation")}</label>
              <input style={S.input} value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder={t("calibLocationPlaceholder")} />
            </div>
            <div>
              <label style={S.label}>{t("calibManufacturer")}</label>
              <input style={S.input} value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("calibRange")}</label>
              <input style={S.input} value={form.range} onChange={(e) => setField("range", e.target.value)} placeholder="-50°C to +200°C" />
            </div>
            <div>
              <label style={S.label}>{t("calibAccuracy")}</label>
              <input style={S.input} value={form.accuracy} onChange={(e) => setField("accuracy", e.target.value)} placeholder="±0.5°C" />
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("calibDetails")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("calibLastDate")}</label>
              <input type="date" style={S.input} value={form.lastCalibrationDate} onChange={(e) => setField("lastCalibrationDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("calibInterval")}</label>
              <input type="number" min="1" max="60" style={S.input} value={form.intervalMonths} onChange={(e) => setField("intervalMonths", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("calibNextDue")}</label>
              <input type="date" style={{ ...S.input, background: "#fef3c7", fontWeight: 950 }} value={form.nextDueDate} onChange={(e) => setField("nextDueDate", e.target.value)} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("calibBy")}</label>
              <input style={S.input} value={form.calibratedBy} onChange={(e) => setField("calibratedBy", e.target.value)} placeholder={t("calibByPlaceholder")} />
            </div>
            <div>
              <label style={S.label}>{t("calibCertNo")}</label>
              <input style={S.input} value={form.calibrationCertNo} onChange={(e) => setField("calibrationCertNo", e.target.value)} />
            </div>
          </div>
          <label style={S.label}>{t("calibMethod")}</label>
          <textarea style={S.textarea} value={form.calibrationMethod} onChange={(e) => setField("calibrationMethod", e.target.value)} placeholder={t("calibMethodPlaceholder")} />
          <label style={S.label}>{t("calibResult")}</label>
          <select style={S.input} value={form.result} onChange={(e) => setField("result", e.target.value)}>
            <option value="PASS">{t("calibResultPass")}</option>
            <option value="ADJUSTED">{t("calibResultAdjusted")}</option>
            <option value="FAIL">{t("calibResultFail")}</option>
          </select>

          <label style={S.label}>{t("calibAttachments")}</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={(e) => pickFiles(e.target.files)}
            style={{ ...S.input, padding: "7px 10px" }}
            disabled={uploading}
          />
          <div style={S.hint}>
            {uploading ? (uploadProgress || t("calibUploading")) : t("calibAttachmentsHint")}
          </div>
          {(form.fileUrls || []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              {(form.fileUrls || []).map((u, i) => (
                <span key={`${u}-${i}`} style={S.chip}>
                  <a href={u} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "none" }}>
                    {(form.fileNames || [])[i] || `${t("calibFile")} ${i + 1}`}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#ef4444", fontWeight: 900, padding: "0 2px",
                      fontSize: 14, lineHeight: 1,
                    }}
                  >✕</button>
                </span>
              ))}
            </div>
          )}

          <label style={S.label}>{t("calibNotes")}</label>
          <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={busy}>
            {saving ? t("saving") : t("calibSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
