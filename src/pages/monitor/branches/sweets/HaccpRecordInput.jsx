// src/pages/monitor/branches/sweets/HaccpRecordInput.jsx
// Generic "manual record" entry form reused across every HACCP hub module
// (Supplier Evaluation, SOP, CCP Monitoring, Dubai Municipality Inspection,
// Mock Recall). Each module is a fully standalone sweets_* report type — none
// of them read or write anything from the Al Mawashi HACCP pages. A record is
// deliberately generic (title/date/status/remarks + one attachment) since
// these are uploaded/typed by hand rather than driven by a structured form.
import React, { useState } from "react";
import API_BASE from "../../../../config/api";
import { uploadImage } from "../../../../utils/imageUpload";

const STATUS_OPTIONS = ["", "Compliant", "Non-Compliant", "Pending Review"];

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

export default function HaccpRecordInput({ reportType, title, icon, onSaved }) {
  const [form, setForm] = useState({
    refTitle: "",
    date: new Date().toISOString().slice(0, 10),
    status: "",
    remarks: "",
  });
  const [fileUrl, setFileUrl] = useState("");
  const [fileMeta, setFileMeta] = useState({ name: "", type: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setMsg({ type: "", text: "" });
  };

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const okType = /^image\//.test(file.type) || file.type === "application/pdf";
    if (!okType) {
      setMsg({ type: "error", text: "Please select an image or a PDF file." });
      e.target.value = "";
      return;
    }
    try {
      setMsg({ type: "", text: "⏳ Uploading file…" });
      const url = await uploadImage(file, reportType);
      setFileUrl(url);
      setFileMeta({ name: file.name, type: file.type });
      setMsg({ type: "", text: "" });
    } catch (err) {
      setMsg({ type: "error", text: `Upload failed: ${err?.message || err}` });
    } finally {
      e.target.value = "";
    }
  }

  function removeFile() {
    setFileUrl("");
    setFileMeta({ name: "", type: "" });
  }

  async function handleSave() {
    if (!String(form.date || "").trim()) {
      setMsg({ type: "error", text: "Please set a date before saving." });
      return;
    }
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      // The `reports` table enforces one row per (type, reportDate) — plain
      // "YYYY-MM-DD" would collide the moment a second record is saved for
      // the same module on the same day. Appending the wall-clock time keeps
      // the user-picked date (still the first 10 chars, used for display/sort)
      // while making every save's key unique.
      const payload = {
        refTitle: form.refTitle,
        reportDate: `${form.date}T${new Date().toISOString().slice(11, 23)}`,
        status: form.status || undefined,
        remarks: form.remarks,
        fileUrl: fileUrl || undefined,
        fileName: fileUrl ? fileMeta.name : undefined,
        fileType: fileUrl ? fileMeta.type : undefined,
        savedAt: new Date().toISOString(),
      };
      const { ok, status, data } = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({ reporter: "sweets", type: reportType, payload }),
      });
      setBusy(false);
      if (!ok) {
        setMsg({
          type: "error",
          text: `Failed to save (HTTP ${status}). ${data?.message || "Please try again."}`,
        });
        return;
      }
      setMsg({ type: "ok", text: "✅ Saved successfully." });
      setForm({ refTitle: "", date: new Date().toISOString().slice(0, 10), status: "", remarks: "" });
      setFileUrl("");
      setFileMeta({ name: "", type: "" });
      onSaved && onSaved();
    } catch (err) {
      setBusy(false);
      setMsg({ type: "error", text: "Network error while contacting the server." });
    }
  }

  return (
    <div style={S.wrap}>
      <style>{`
        .hri-in{transition:border-color .15s ease, box-shadow .15s ease, background .15s ease}
        .hri-in:focus{border-color:#0f766e !important;background:#fff !important;box-shadow:0 0 0 4px rgba(15,118,110,.14) !important}
      `}</style>

      <div style={S.head}>
        <div style={S.headIcon}>{icon}</div>
        <div>
          <div style={S.headEyebrow}>HACCP · Manual Record</div>
          <div style={S.headTitle}>{title}</div>
        </div>
      </div>

      {msg.text && (
        <div
          style={{
            ...S.msg,
            background: msg.type === "ok" ? "linear-gradient(135deg,#ecfdf5,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)",
            color: msg.type === "ok" ? "#065f46" : "#991b1b",
            border: `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}`,
          }}
        >
          {msg.text}
        </div>
      )}

      <div style={S.grid}>
        <Field label="Title / Reference" value={form.refTitle} onChange={(v) => setField("refTitle", v)} placeholder="e.g. supplier name, document name, inspector…" />
        <DateField label="Date" value={form.date} onChange={(v) => setField("date", v)} />
        <Select
          label="Status (optional)"
          value={form.status}
          onChange={(v) => setField("status", v)}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s || "-- Not set --" }))}
        />
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={S.label}>
            Remarks / Notes
            <textarea
              className="hri-in"
              value={form.remarks}
              onChange={(e) => setField("remarks", e.target.value)}
              rows={4}
              style={S.textarea}
            />
          </label>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={S.label}>
            Attachment — photo or PDF of the report (optional)
            <input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} style={S.fileInput} />
          </label>
          {fileUrl && (
            <div style={S.fileRow}>
              {fileMeta.type === "application/pdf" ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={S.fileLink}>📄 {fileMeta.name || "View PDF"}</a>
              ) : (
                <img src={fileUrl} alt="Attachment preview" style={S.filePreview} />
              )}
              <button type="button" onClick={removeFile} style={S.removeBtn}>Remove</button>
            </div>
          )}
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" disabled={busy} onClick={handleSave} style={S.save}>
          {busy ? "Saving…" : "💾 Save Record"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={S.label}>
      {label}
      <input className="hri-in" type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={S.input} />
    </label>
  );
}
function DateField({ label, value, onChange }) {
  return (
    <label style={S.label}>
      {label}
      <input className="hri-in" type="date" value={value} max="2099-12-31" onChange={(e) => onChange(e.target.value)} style={S.input} />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label style={S.label}>
      {label}
      <select className="hri-in" value={value} onChange={(e) => onChange(e.target.value)} style={S.input}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

const S = {
  wrap: { width: "min(760px,100%)", margin: "0 auto", padding: "4px 4px 24px" },
  head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  headIcon: { width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontSize: 22, flexShrink: 0 },
  headEyebrow: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em" },
  headTitle: { fontSize: 19, fontWeight: 1000, color: "#0f172a", marginTop: 2 },
  msg: { margin: "0 0 14px", padding: "10px 14px", borderRadius: 12, fontWeight: 700 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontWeight: 700, color: "#0f172a", fontSize: 13 },
  input: { padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, outline: "none", fontFamily: "inherit" },
  textarea: { padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" },
  fileInput: { padding: 10, borderRadius: 10, border: "1.5px dashed #99f6e4", background: "#f0fdfa", fontSize: 12, cursor: "pointer" },
  fileRow: { marginTop: 10, display: "flex", alignItems: "center", gap: 12 },
  filePreview: { height: 80, borderRadius: 10, border: "1px solid #e2e8f0", objectFit: "cover" },
  fileLink: { fontWeight: 800, color: "#0f766e", textDecoration: "none" },
  removeBtn: { padding: "7px 12px", borderRadius: 999, border: "none", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  actions: { marginTop: 18, display: "flex", justifyContent: "flex-end" },
  save: { padding: "11px 22px", borderRadius: 999, border: "none", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer", boxShadow: "0 14px 30px rgba(15,118,110,.34)" },
};
