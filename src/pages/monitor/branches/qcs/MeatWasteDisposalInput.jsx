// src/pages/monitor/branches/qcs/MeatWasteDisposalInput.jsx
// QCS — Meat Waste Disposal — Input form (multiple meat waste records + photos per record)

import React, { useRef, useState } from "react";

const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_meat_waste_disposal";
const MAX_IMAGES_PER_ENTRY = 10;

const MEAT_TYPES = [
  "Chicken / دجاج",
  "Beef / لحم بقري",
  "Mutton / لحم ضأن",
  "Lamb / لحم خروف",
  "Camel / لحم جمل",
  "Mixed / مختلط",
  "Other / أخرى",
];

const REASONS = [
  "Expired / منتهي الصلاحية",
  "Spoiled / فاسد",
  "Contaminated / ملوث",
  "Damaged Packaging / تعبئة تالفة",
  "Failed Inspection / فشل التفتيش",
  "Temperature Abuse / إساءة درجة حرارة",
  "Customer Return / مرتجع زبائن",
  "Other / أخرى",
];

const DISPOSAL_METHODS = [
  "Incineration / حرق",
  "Burial / دفن",
  "Sent to Disposal Vendor / إرسال لمتعهد",
  "Municipality Pickup / استلام البلدية",
  "Internal Dumpster / حاوية داخلية",
  "Other / أخرى",
];

const LOCATIONS = [
  "QCS Warehouse",
  "POS 10",
  "POS 11",
  "POS 15",
  "POS 19",
  "POS 24",
  "POS 26",
  "FTR 1 • Mushrif Park",
  "FTR 2 • Mamzar Park",
  "Production (PRD)",
  "OHC",
  "Other / أخرى",
];

async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST", body: fd,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) throw new Error(data?.error || "Upload failed");
  return data.optimized_url || data.url;
}
async function deleteImage(url) {
  if (!url) return;
  try {
    await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
      method: "DELETE", credentials: IS_SAME_ORIGIN ? "include" : "omit",
    });
  } catch {}
}

const S = {
  page: { padding: 4 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  entryCard: { background: "#fef9c3", border: "1.5px solid #fde047", borderRadius: 14, padding: 14, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 6px" },
  sub: { fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", minHeight: 60, resize: "vertical", boxSizing: "border-box" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  btnPrimary: { background: "linear-gradient(180deg,#dc2626,#b91c1c)", color: "#fff", border: "1.5px solid #991b1b", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnSecondary: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnAdd: { background: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "1.5px solid #15803d", padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 },
  btnDanger: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, padding: "5px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 8 },
  imgCard: { position: "relative", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc" },
  imgPreview: { width: "100%", height: 90, objectFit: "cover", display: "block" },
  imgRemove: { position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, width: 22, height: 22, fontWeight: 950, fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 4 },
  msg: (kind) => ({ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontWeight: 800, fontSize: 13, background: kind === "ok" ? "#dcfce7" : kind === "err" ? "#fee2e2" : "#e0f2fe", color: kind === "ok" ? "#166534" : kind === "err" ? "#991b1b" : "#075985" }),
};

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
};

const newEntry = () => ({
  meatType: MEAT_TYPES[0],
  quantityKg: "",
  reason: REASONS[0],
  reasonDetails: "",
  disposalMethod: DISPOSAL_METHODS[0],
  productCode: "",
  batchNo: "",
  notes: "",
  images: [],
});

export default function MeatWasteDisposalInput() {
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState("QCS Warehouse");
  const [disposedBy, setDisposedBy] = useState("");
  const [witness, setWitness] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const [entries, setEntries] = useState([newEntry()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const fileRefs = useRef({});

  function showMsg(kind, text, ms = 2500) {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg({ kind: "", text: "" }), ms);
  }

  function setEntryField(idx, key, value) {
    setEntries((arr) => arr.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  }

  function addEntry() { setEntries((arr) => [...arr, newEntry()]); }
  function removeEntry(idx) {
    if (!window.confirm("حذف هذا الإدخال؟")) return;
    const e = entries[idx];
    if (e?.images?.length) e.images.forEach(deleteImage);
    setEntries((arr) => arr.filter((_, i) => i !== idx));
  }

  async function pickImagesForEntry(idx, fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const cur = entries[idx]?.images || [];
    const remaining = MAX_IMAGES_PER_ENTRY - cur.length;
    if (remaining <= 0) { showMsg("err", `الحد الأقصى ${MAX_IMAGES_PER_ENTRY} صور لكل إدخال`); return; }
    try {
      setBusy(true);
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try { const u = await uploadImage(f); if (u) urls.push(u); } catch {}
      }
      if (urls.length) {
        setEntryField(idx, "images", [...cur, ...urls].slice(0, MAX_IMAGES_PER_ENTRY));
        showMsg("ok", `✅ تم رفع ${urls.length} صورة`);
      } else showMsg("err", "ما تم رفع أي صورة");
    } finally {
      setBusy(false);
      const ref = fileRefs.current[idx];
      if (ref) ref.value = "";
    }
  }

  async function removeImage(idx, imgIdx) {
    const url = entries[idx]?.images?.[imgIdx];
    setEntries((arr) => arr.map((e, i) => (i === idx ? { ...e, images: e.images.filter((_, j) => j !== imgIdx) } : e)));
    if (url) await deleteImage(url);
  }

  function resetForm() {
    if (busy) return;
    if (!window.confirm("إعادة تعيين النموذج؟ سيتم فقدان كل البيانات.")) return;
    entries.forEach((e) => e.images?.forEach(deleteImage));
    setDate(today());
    setLocation("QCS Warehouse");
    setDisposedBy("");
    setWitness("");
    setSupervisor("");
    setGeneralNotes("");
    setEntries([newEntry()]);
  }

  async function save() {
    if (!date) { showMsg("err", "اختر التاريخ"); return; }
    if (!disposedBy.trim()) { showMsg("err", "أدخل اسم الشخص الذي قام بالتخلص"); return; }
    if (entries.length === 0) { showMsg("err", "أضف إدخالاً واحداً على الأقل"); return; }
    if (entries.some((e) => !e.quantityKg)) { showMsg("err", "أدخل الكمية لكل إدخال"); return; }

    const totalKg = entries.reduce((sum, e) => sum + (Number(e.quantityKg) || 0), 0);

    const payload = {
      reportDate: date,
      location,
      disposedBy,
      witness,
      supervisor,
      generalNotes,
      entries: entries.map((e) => ({
        meatType: e.meatType,
        quantityKg: Number(e.quantityKg) || 0,
        reason: e.reason,
        reasonDetails: e.reasonDetails,
        disposalMethod: e.disposalMethod,
        productCode: e.productCode,
        batchNo: e.batchNo,
        notes: e.notes,
        images: e.images,
      })),
      totals: { totalKg, entryCount: entries.length },
      savedAt: Date.now(),
    };

    try {
      setBusy(true);
      showMsg("info", "جاري الحفظ...");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: IS_SAME_ORIGIN ? "include" : "omit",
        body: JSON.stringify({ reporter: "qcs", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg("ok", "✅ تم حفظ السجل بنجاح");
      // soft reset (don't delete already-uploaded images on success)
      setEntries([newEntry()]);
    } catch (e) {
      showMsg("err", "❌ فشل الحفظ: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h2 style={S.title}>🥩 سجل التخلص من هدر اللحوم / Meat Waste Disposal Log</h2>
        <div style={S.sub}>أدخل بيانات عملية التخلص من هدر اللحوم — يمكن إضافة أكثر من إدخال (نوع/سبب) في نفس اليوم</div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>التاريخ / Date *</label>
            <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>الموقع / Location</label>
            <select style={S.input} value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>قام بالتخلص / Disposed By *</label>
            <input style={S.input} value={disposedBy} onChange={(e) => setDisposedBy(e.target.value)} placeholder="اسم الموظف" />
          </div>
        </div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>الشاهد / Witness</label>
            <input style={S.input} value={witness} onChange={(e) => setWitness(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>المشرف / Supervisor</label>
            <input style={S.input} value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>إجمالي الكميات (كغ) — تلقائي</label>
            <input
              style={{ ...S.input, background: "#f1f5f9", fontWeight: 950 }}
              value={entries.reduce((s, e) => s + (Number(e.quantityKg) || 0), 0).toFixed(2)}
              readOnly
            />
          </div>
        </div>

        <label style={S.label}>ملاحظات عامة / General Notes</label>
        <textarea style={S.textarea} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
      </div>

      {/* Entries */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={S.title}>📋 الإدخالات ({entries.length})</h3>
        <button style={S.btnAdd} onClick={addEntry} disabled={busy}>+ إضافة إدخال</button>
      </div>

      {entries.map((e, idx) => (
        <div key={idx} style={S.entryCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 900, color: "#854d0e", fontSize: 14 }}>إدخال #{idx + 1}</span>
            {entries.length > 1 && (
              <button style={S.btnDanger} onClick={() => removeEntry(idx)} disabled={busy}>🗑️ حذف الإدخال</button>
            )}
          </div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>نوع اللحم / Meat Type</label>
              <select style={S.input} value={e.meatType} onChange={(ev) => setEntryField(idx, "meatType", ev.target.value)}>
                {MEAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>الكمية (كغ) / Qty (kg) *</label>
              <input type="number" min="0" step="0.01" style={S.input} value={e.quantityKg} onChange={(ev) => setEntryField(idx, "quantityKg", ev.target.value)} />
            </div>
            <div>
              <label style={S.label}>السبب / Reason</label>
              <select style={S.input} value={e.reason} onChange={(ev) => setEntryField(idx, "reason", ev.target.value)}>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>طريقة التخلص / Disposal Method</label>
              <select style={S.input} value={e.disposalMethod} onChange={(ev) => setEntryField(idx, "disposalMethod", ev.target.value)}>
                {DISPOSAL_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>كود المنتج / Product Code</label>
              <input style={S.input} value={e.productCode} onChange={(ev) => setEntryField(idx, "productCode", ev.target.value)} />
            </div>
            <div>
              <label style={S.label}>رقم الدفعة / Batch No.</label>
              <input style={S.input} value={e.batchNo} onChange={(ev) => setEntryField(idx, "batchNo", ev.target.value)} />
            </div>
          </div>

          <label style={S.label}>تفاصيل السبب / Reason Details</label>
          <textarea style={S.textarea} value={e.reasonDetails} onChange={(ev) => setEntryField(idx, "reasonDetails", ev.target.value)} placeholder="وصف تفصيلي..." />

          <label style={S.label}>ملاحظات / Notes</label>
          <input style={S.input} value={e.notes} onChange={(ev) => setEntryField(idx, "notes", ev.target.value)} />

          <label style={S.label}>📷 صور / Photos (حتى {MAX_IMAGES_PER_ENTRY})</label>
          <input
            ref={(r) => { fileRefs.current[idx] = r; }}
            type="file"
            accept="image/*"
            multiple
            onChange={(ev) => pickImagesForEntry(idx, ev.target.files)}
            disabled={busy || (e.images?.length || 0) >= MAX_IMAGES_PER_ENTRY}
            style={S.input}
          />
          <div style={S.hint}>{(e.images?.length || 0)} / {MAX_IMAGES_PER_ENTRY}</div>

          {e.images?.length > 0 && (
            <div style={S.imgGrid}>
              {e.images.map((u, j) => (
                <div key={`${u}-${j}`} style={S.imgCard}>
                  <a href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt={`Attachment ${j + 1}`} style={S.imgPreview} />
                  </a>
                  <button type="button" onClick={() => removeImage(idx, j)} style={S.imgRemove}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnSecondary} onClick={resetForm} disabled={busy}>إلغاء / Reset</button>
        <button style={S.btnPrimary} onClick={save} disabled={busy}>
          {busy ? "⏳ جاري..." : "💾 حفظ / Save"}
        </button>
      </div>

      {msg.text && <div style={S.msg(msg.kind)}>{msg.text}</div>}
    </div>
  );
}
