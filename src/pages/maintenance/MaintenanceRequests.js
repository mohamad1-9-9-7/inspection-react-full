// src/pages/maintenance/MaintenanceRequests.js
// Stage 1 — Requester form. Bilingual, mirrors the paper "Maintenance Enquiry Form".
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BRANCHES, PRIORITIES, STATUS, nextRequestNo, saveMaintenance, pushTimeline,
} from "./maintenanceShared";
import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";
import { useFontScale, FontScaleControl } from "./useFontScale";

const MAX_IMAGES = 20;

const emptyProblem = () => ({ location: "", problem: "", startedDate: "", deadline: "" });

export default function MaintenanceRequests() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [requestNo, setRequestNo] = useState("…");
  const [form, setForm] = useState({
    branch: "", dateOfForm: today, applicant: "", dateReceived: "", recipient: "",
    priority: "", reporter: "",
  });
  const [problems, setProblems] = useState([emptyProblem(), emptyProblem(), emptyProblem()]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const fontScale = useFontScale();

  useEffect(() => { nextRequestNo().then(setRequestNo).catch(() => setRequestNo("MR-NEW")); }, []);

  const ch = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  const chProb = (i, k, v) =>
    setProblems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addProb = () => setProblems((r) => [...r, emptyProblem()]);
  const delProb = (i) => setProblems((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));

  const onImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setErr("");
    try {
      const urls = [];
      for (const f of files) {
        try {
          const url = await uploadImageToServer(f, "maintenance_request");
          if (url) urls.push(url);
        } catch (ex) {
          console.warn("upload failed:", ex);
        }
      }
      if (!urls.length) setErr("❌ فشل رفع الصور / Image upload failed");
      setImages((s) => Array.from(new Set([...s, ...urls])).slice(0, MAX_IMAGES));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const delImage = (i) => setImages((s) => s.filter((_, idx) => idx !== i));

  const reset = () => {
    setForm({ branch: "", dateOfForm: today, applicant: "", dateReceived: "", recipient: "", priority: "", reporter: "" });
    setProblems([emptyProblem(), emptyProblem(), emptyProblem()]);
    setImages([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setToast("");
    const cleanProblems = problems.filter(
      (p) => p.location.trim() || p.problem.trim() || p.startedDate || p.deadline
    );
    if (!form.branch) { setErr("الرجاء اختيار الفرع / Please select a branch"); return; }
    if (!form.applicant.trim()) { setErr("الرجاء إدخال مقدّم الطلب / Applicant is required"); return; }
    if (cleanProblems.length === 0) { setErr("أضف مشكلة واحدة على الأقل / Add at least one problem"); return; }

    setSubmitting(true);
    try {
      // Never persist the "…" / "MR-NEW" placeholder — resolve a real number first.
      const rn = /^MR-\d{4}-\d+$/.test(requestNo)
        ? requestNo
        : await nextRequestNo(requestNo);
      if (rn !== requestNo) setRequestNo(rn);

      const rec = {
        requestNo: rn,
        ...form,
        reporter: form.applicant,
        problems: cleanProblems,
        images,
        status: STATUS.NEW,
        maintenanceComment: "", workshop: "", materials: [], totalCost: "",
        procurement: { name: "", date: "" }, management: { name: "", date: "" },
      };
      rec.timeline = pushTimeline(rec, "تم إنشاء الطلب / Request created", form.applicant);
      await saveMaintenance(rec, { by: form.applicant });
      setToast(`✅ تم حفظ الطلب ${rn} / Saved successfully`);
      reset();
      nextRequestNo(rn).then(setRequestNo).catch(() => {});
      setTimeout(() => setToast(""), 3500);
    } catch (ex) {
      setErr("❌ فشل الحفظ على السيرفر / Save failed\n" + (ex?.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={sx.page} dir="rtl">
      <div style={{ position: "fixed", top: 0, left: 0, height: 3, width: submitting ? "100%" : 0, background: "#b91c1c", transition: "width .25s", zIndex: 50 }} />
      <div style={{ ...sx.shell, zoom: fontScale.scale }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <FontScaleControl {...fontScale} />
        </div>
        {/* Header — mirrors paper form */}
        <div style={sx.brandRow}>
          <div style={{ color: "#b91c1c", fontWeight: 900, fontSize: 22 }}>
            المواشي
            <small style={{ display: "block", color: "#475569", fontWeight: 600, fontSize: 11 }}>
              Trans Emirates Livestock Trading L.L.C.
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={sx.title}>طلب أعمال صيانة عامة</h2>
            <div style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>Maintenance Enquiry Form</div>
          </div>
          <div style={{ color: "#b91c1c", fontWeight: 900, fontSize: 20 }}>AL&nbsp;MAWASHI</div>
        </div>

        <div style={sx.reqNo}>رقم الطلب / Request No: <b>{requestNo}</b></div>

        {err && <div style={sx.alertErr}>{err}</div>}
        {toast && <div style={sx.alertOk}>{toast}</div>}

        <form onSubmit={submit}>
          {/* Meta grid */}
          <div style={sx.grid2}>
            <Field label="الفرع / Branch *">
              <select name="branch" value={form.branch} onChange={ch} style={sx.input} required>
                <option value="">— اختر / Select —</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="تاريخ تقديم الطلب / Date of form">
              <input type="date" name="dateOfForm" value={form.dateOfForm} onChange={ch} style={sx.input} />
            </Field>
            <Field label="مقدم الطلب / Applicant *">
              <input name="applicant" value={form.applicant} onChange={ch} style={sx.input} placeholder="الاسم / Name" required />
            </Field>
            <Field label="الأولوية / Priority">
              <select name="priority" value={form.priority} onChange={ch} style={sx.input}>
                <option value="">— اختر / Select —</option>
                {PRIORITIES.map((p, i) => <option key={i} value={p.en}>{p.ar} / {p.en}</option>)}
              </select>
            </Field>
          </div>

          {/* Problems table */}
          <div style={sx.secT}>الرجاء القيام بأعمال الصيانة التالية / Please provide maintenance as follows</div>
          <div style={{ overflowX: "auto" }}>
            <table style={sx.table}>
              <thead>
                <tr>
                  <th style={{ ...sx.th, width: 40 }}>S. م</th>
                  <th style={sx.th}>الموقع بالضبط<br />Exact location</th>
                  <th style={sx.th}>المشكلة<br />Problem</th>
                  <th style={sx.th}>تاريخ بداية المشكلة<br />Problem started</th>
                  <th style={sx.th}>وقت التنفيذ<br />Deadline</th>
                  <th style={{ ...sx.th, width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p, i) => (
                  <tr key={i}>
                    <td style={sx.tdC}>{i + 1}</td>
                    <td style={sx.td}><input style={sx.cell} value={p.location} onChange={(e) => chProb(i, "location", e.target.value)} /></td>
                    <td style={sx.td}><input style={sx.cell} value={p.problem} onChange={(e) => chProb(i, "problem", e.target.value)} /></td>
                    <td style={sx.td}><input type="date" style={sx.cell} value={p.startedDate} onChange={(e) => chProb(i, "startedDate", e.target.value)} /></td>
                    <td style={sx.td}><input type="date" style={sx.cell} value={p.deadline} onChange={(e) => chProb(i, "deadline", e.target.value)} /></td>
                    <td style={sx.tdC}>
                      <button type="button" onClick={() => delProb(i)} style={sx.delBtn} title="حذف الصف">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addProb} style={sx.addBtn}>➕ إضافة صف / Add row</button>

          {/* Images */}
          <div style={sx.secT}>الصور / Images</div>
          <input type="file" accept="image/*" multiple onChange={onImages} disabled={uploading} />
          <div style={sx.hint}>
            {uploading ? "⏳ جارٍ الرفع على Cloudinary…" : `تُرفع على Cloudinary. الحد الأقصى ${MAX_IMAGES}.`}
          </div>
          {!!images.length && (
            <div style={sx.imgGrid}>
              {images.map((src, i) => (
                <div key={i} style={sx.imgTile}>
                  <img src={src} alt={`img-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => delImage(i)} style={sx.imgX}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={sx.note}>
            ℹ️ أقسام (تعليق الصيانة / المواد / التكلفة / الموافقات) تُعبّأ من قسم الصيانة والإدارة عبر صفحة "تصفّح الطلبات".
            <br/>Maintenance comment, materials, cost &amp; approvals are filled later by the Maintenance dept &amp; Management via "Browse Requests".
          </div>

          <div style={sx.actions}>
            <button type="button" onClick={() => navigate("/maintenance-home")} style={sx.btnGhost}>↩ رجوع / Back</button>
            <button type="button" onClick={reset} disabled={submitting} style={sx.btnGhost}>🧹 مسح / Clear</button>
            <button type="submit" disabled={submitting || uploading} style={sx.btnPrimary}>
              {submitting ? "جارٍ الحفظ…" : uploading ? "⏳ جارٍ رفع الصور…" : "💾 حفظ الطلب / Save Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

const sx = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg,#f1f5f9,#e0e7ff)", padding: 20, fontFamily: "Cairo, system-ui, sans-serif" },
  shell: { maxWidth: 920, margin: "16px auto", background: "#fff", padding: 24, borderRadius: 16, boxShadow: "0 16px 40px rgba(2,6,23,.14)", border: "1px solid #e2e8f0" },
  brandRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #b91c1c", paddingBottom: 10 },
  title: { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  reqNo: { textAlign: "center", margin: "12px 0", fontSize: 15, color: "#b91c1c", fontWeight: 700 },
  alertErr: { whiteSpace: "pre-wrap", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px", fontWeight: 700, marginBottom: 10 },
  alertOk: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 10, padding: "10px 12px", fontWeight: 700, marginBottom: 10 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 },
  label: { fontWeight: 800, color: "#0f172a", fontSize: 13 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", fontSize: 14, boxSizing: "border-box" },
  secT: { marginTop: 20, marginBottom: 8, fontWeight: 900, color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: 4, fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { border: "1px solid #334155", background: "#b91c1c", color: "#fff", padding: "7px 6px", fontWeight: 800, textAlign: "center" },
  td: { border: "1px solid #334155", padding: 3 },
  tdC: { border: "1px solid #334155", padding: 3, textAlign: "center", fontWeight: 700 },
  cell: { width: "100%", border: "none", outline: "none", padding: "7px 6px", background: "transparent", fontSize: 13, boxSizing: "border-box" },
  delBtn: { border: "none", background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 800 },
  addBtn: { marginTop: 8, border: "1px dashed #94a3b8", background: "#f8fafc", color: "#334155", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 800 },
  hint: { marginTop: 6, fontSize: 12, color: "#64748b" },
  imgGrid: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 },
  imgTile: { position: "relative", width: 110, height: 110, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff" },
  imgX: { position: "absolute", top: 5, left: 5, background: "rgba(239,68,68,.95)", color: "#fff", border: "none", borderRadius: 8, padding: "2px 7px", fontWeight: 800, cursor: "pointer" },
  note: { marginTop: 18, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.7 },
  actions: { marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  btnPrimary: { background: "linear-gradient(90deg,#b91c1c,#dc2626)", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", minWidth: 190 },
  btnGhost: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", padding: "12px 18px", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer" },
};
