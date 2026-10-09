// src/pages/monitor/branches/qcs/EmployeeWarningInput.jsx
// Employee Warning / Notice (إنذار / تنبيه داخلي) — one employee per record,
// with violation photos (Cloudinary) and the employee's earlier warnings shown
// as soon as the person is picked, so the right next step is suggested.
import React, { useEffect, useMemo, useState } from "react";
import { queuedMessage, saveReport } from "../../../../utils/reportOutbox";
import { uploadImage, deleteImage, thumbUrl } from "../../../../utils/imageUpload";
import { keepPhotoOrUpload, isKeptPhoto, dropKeptPhoto } from "../../../../utils/offlineOutbox";
import { useStaffDirectory, normalizeEmpNo, normalizeName } from "../_shared/staffRegistry";
import {
  TYPE, DOC_META, LEVELS, CATEGORIES, SITES, levelById, dmy,
  fetchWarnings, historyFor,
} from "./employeeWarningCore";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EMPTY = () => ({
  date: todayISO(),
  employeeNo: "", employeeName: "", position: "", site: "QCS",
  level: "notice", levelTouched: false,
  categories: [],
  incidentDate: todayISO(), incidentTime: "", location: "",
  description: "", correctiveAction: "", improvementBy: "",
  consequence: "",
  photos: [],
  issuedBy: { name: "", date: todayISO() },
  employeeAck: { name: "", date: "", refused: false },
  witness: { name: "" },
  approvedBy: { name: "", date: "" },
});

/* ===== styles (same family as the other QCS people forms) ===== */
const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 };
const input = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", boxSizing: "border-box", background: "#fff", fontSize: 13 };
const textarea = { ...input, minHeight: 90, resize: "vertical" };
const label = { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 };
const section = { marginTop: 14, padding: 14, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" };
const grid = (min = 220) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12 });
const submitBtn = (disabled) => ({
  width: "100%", background: disabled ? "#94a3b8" : "linear-gradient(135deg,#0f3d2e,#0b5236)", color: "#fff",
  border: "none", borderRadius: 12, padding: "14px 18px", fontWeight: 900, fontSize: 16,
  cursor: disabled ? "not-allowed" : "pointer", boxShadow: "0 6px 16px rgba(11,82,54,.25)", marginTop: 16,
});

function Field({ title, children }) {
  return <div><span style={label}>{title}</span>{children}</div>;
}

export default function EmployeeWarningInput({ type = TYPE, reporter = "qcs" } = {}) {
  const [f, setF] = useState(EMPTY);
  const [records, setRecords] = useState([]);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const { roster: staff, byNo, byName } = useStaffDirectory(TYPE);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchWarnings(reporter, type, ctrl.signal).then(setRecords).catch(() => {});
    return () => ctrl.abort();
  }, [reporter, type]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setIn = (k, sub, v) => setF((p) => ({ ...p, [k]: { ...p[k], [sub]: v } }));

  const setEmpNo = (v) => setF((p) => {
    const m = byNo.get(normalizeEmpNo(v));
    return { ...p, employeeNo: v, ...(m ? { employeeName: m.name } : {}) };
  });
  const setEmpName = (v) => setF((p) => {
    const m = byName.get(normalizeName(v));
    return { ...p, employeeName: v, ...(m ? { employeeNo: m.empNo } : {}) };
  });

  const hasWho = !!(f.employeeNo.trim() || f.employeeName.trim());
  const history = useMemo(
    () => (hasWho ? historyFor(records, f) : { list: [], active: [], suggested: "notice" }),
    [records, f, hasWho]
  );

  /* Follow the suggested step until the user picks a level by hand. */
  useEffect(() => {
    if (!f.levelTouched && hasWho && f.level !== history.suggested) {
      setF((p) => ({ ...p, level: history.suggested }));
    }
  }, [history.suggested, f.levelTouched, f.level, hasWho]);

  const toggleCat = (id) => set("categories",
    f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id]);

  async function addPhotos(files) {
    const list = Array.from(files || []).filter((x) => x && x.type.startsWith("image/"));
    if (!list.length) return;
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const url = await keepPhotoOrUpload(file, (x) => uploadImage(x, "employee_warning"));
        setF((p) => ({ ...p, photos: [...p.photos, url] }));
      } catch (e) {
        alert(`Photo upload failed: ${e?.message || e}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function removePhoto(url) {
    setF((p) => ({ ...p, photos: p.photos.filter((u) => u !== url) }));
    if (isKeptPhoto(url)) dropKeptPhoto(url);
    else deleteImage(url).catch(() => {});
  }

  function reset() { setF(EMPTY()); }

  async function handleSave() {
    if (!f.date) return alert("Please select the date.");
    if (!f.employeeName.trim()) return alert("Please enter the employee name.");
    if (!f.categories.length) return alert("Please choose at least one violation type.");
    if (!f.description.trim()) return alert("Please describe the violation.");
    if (!f.issuedBy.name.trim()) return alert("Please enter who is issuing the warning.");
    if (uploading) return alert("Please wait for the photos to finish uploading.");

    const lv = levelById(f.level);
    const payload = {
      headerTop: {
        documentTitle: DOC_META.docTitle, documentNo: DOC_META.docNo, issueDate: DOC_META.issueDate,
        area: DOC_META.area, controllingOfficer: DOC_META.controllingOfficer,
        issuedBy: DOC_META.issuedBy, approvedBy: DOC_META.approvedBy,
      },
      date: f.date,
      employeeNo: f.employeeNo.trim(),
      employeeName: f.employeeName.trim(),
      position: f.position.trim(),
      site: f.site.trim(),
      level: f.level,
      categories: f.categories,
      incidentDate: f.incidentDate,
      incidentTime: f.incidentTime,
      location: f.location.trim(),
      description: f.description.trim(),
      correctiveAction: f.correctiveAction.trim(),
      improvementBy: f.improvementBy,
      consequence: f.consequence.trim() || lv.consequence,
      previousCount: history.active.length,
      photos: f.photos,
      issuedBy: { name: f.issuedBy.name.trim(), date: f.issuedBy.date },
      employeeAck: { name: f.employeeAck.refused ? "" : f.employeeAck.name.trim(), date: f.employeeAck.date, refused: !!f.employeeAck.refused },
      witness: { name: f.witness.name.trim() },
      approvedBy: { name: f.approvedBy.name.trim(), date: f.approvedBy.date },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setMsg("Saving…");
      const { queued } = await saveReport({ body: { reporter, type, payload }, label: "Employee Warning" });
      setMsg(queued ? queuedMessage("en") : "✅ Saved — print or e-mail it from the viewer");
      if (!queued) setRecords((p) => [{ _id: `local-${payload.savedAt}`, payload }, ...p]);
      reset();
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  const lv = levelById(f.level);

  return (
    <div style={card}>
      {/* Header band */}
      <div style={{ background: "linear-gradient(135deg,#0f3d2e,#0b5236)", color: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>AL MAWASHI</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{DOC_META.docTitle} — QA</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.7 }}>
          <div>Doc No: <b>{DOC_META.docNo}</b></div>
          <div>Area: <b>{DOC_META.area}</b></div>
        </div>
      </div>

      <datalist id="ew-empno">{staff.map((s) => <option key={s.empNo} value={s.empNo}>{s.name}</option>)}</datalist>
      <datalist id="ew-empname">{staff.map((s) => <option key={s.empNo} value={s.name}>{s.empNo}</option>)}</datalist>
      <datalist id="ew-sites">{SITES.map((s) => <option key={s} value={s} />)}</datalist>

      {/* Employee */}
      <div style={grid()}>
        <Field title="Date"><input style={input} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field title="Employee No"><input style={input} list="ew-empno" placeholder="No." value={f.employeeNo} onChange={(e) => setEmpNo(e.target.value)} /></Field>
        <Field title="Employee Name *"><input style={input} list="ew-empname" placeholder="Name" value={f.employeeName} onChange={(e) => setEmpName(e.target.value)} /></Field>
        <Field title="Position"><input style={input} placeholder="e.g. Butcher" value={f.position} onChange={(e) => set("position", e.target.value)} /></Field>
        <Field title="Site / Branch"><input style={input} list="ew-sites" value={f.site} onChange={(e) => set("site", e.target.value)} /></Field>
      </div>

      {/* History */}
      {hasWho && (
        <div style={{ ...section, background: history.active.length ? "#fff7ed" : "#f0fdf4", borderColor: history.active.length ? "#fed7aa" : "#bbf7d0" }}>
          {history.list.length === 0 ? (
            <b style={{ color: "#166534" }}>No earlier warnings for this employee.</b>
          ) : (
            <>
              <b style={{ color: "#9a3412" }}>
                {history.active.length} active warning{history.active.length === 1 ? "" : "s"} in the last 12 months
                {history.list.length > history.active.length ? ` (${history.list.length} in total)` : ""} — suggested step: {levelById(history.suggested).en}
              </b>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {history.list.slice(0, 8).map((r) => {
                  const l = levelById(r.payload?.level);
                  return (
                    <span key={r._id} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, border: `1px solid ${l.color}`, color: l.color, background: "#fff", fontWeight: 700 }}>
                      {dmy(r.payload?.date)} · {l.en}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Level */}
      <div style={section}>
        <span style={label}>Warning level</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {LEVELS.map((l) => {
            const on = f.level === l.id;
            return (
              <button key={l.id} type="button"
                onClick={() => setF((p) => ({ ...p, level: l.id, levelTouched: true }))}
                style={{ padding: "9px 14px", borderRadius: 10, fontWeight: 800, cursor: "pointer",
                  border: `2px solid ${l.color}`, background: on ? l.color : "#fff", color: on ? "#fff" : l.color }}>
                {l.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Violation */}
      <div style={section}>
        <span style={label}>Type of violation *</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {CATEGORIES.map((c) => {
            const on = f.categories.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 700,
                  border: `1px solid ${on ? "#0f3d2e" : "#cbd5e1"}`, background: on ? "#0f3d2e" : "#fff", color: on ? "#fff" : "#334155" }}>
                {on ? "✓ " : ""}{c.en}
              </button>
            );
          })}
        </div>
        <div style={grid(180)}>
          <Field title="Incident date"><input style={input} type="date" value={f.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} /></Field>
          <Field title="Time"><input style={input} type="time" value={f.incidentTime} onChange={(e) => set("incidentTime", e.target.value)} /></Field>
          <Field title="Location / Area"><input style={input} placeholder="e.g. Chiller 2, cutting room" value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field title="Description of the violation *">
            <textarea style={textarea} placeholder="What happened, what was observed…" value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>

        {/* Photos */}
        <div style={{ marginTop: 12 }}>
          <span style={label}>Photos of the violation</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {f.photos.map((u) => (
              <div key={u} style={{ position: "relative" }}>
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={isKeptPhoto(u) ? u : thumbUrl(u, 240)} alt="" style={{ width: 110, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid #cbd5e1", display: "block" }} />
                </a>
                <button type="button" onClick={() => removePhoto(u)} title="Remove photo"
                  style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: 999, border: "none", background: "#dc2626", color: "#fff", fontWeight: 900, cursor: "pointer" }}>×</button>
              </div>
            ))}
            <label style={{ width: 110, height: 84, borderRadius: 10, border: "2px dashed #94a3b8", display: "grid", placeItems: "center", cursor: "pointer", color: "#475569", fontWeight: 800, textAlign: "center", fontSize: 12, background: "#fff" }}>
              {uploading ? `⏳ ${uploading}…` : <span>📷<br />Add photo</span>}
              <input type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      </div>

      {/* Action */}
      <div style={section}>
        <div style={grid(260)}>
          <Field title="Required corrective action">
            <textarea style={textarea} placeholder="What the employee must do / change…" value={f.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} />
          </Field>
          <Field title="Consequence of repetition">
            <textarea style={textarea} placeholder={lv.consequence} value={f.consequence} onChange={(e) => set("consequence", e.target.value)} />
          </Field>
        </div>
        <div style={{ maxWidth: 260, marginTop: 12 }}>
          <Field title="Improvement required by"><input style={input} type="date" value={f.improvementBy} onChange={(e) => set("improvementBy", e.target.value)} /></Field>
        </div>
      </div>

      {/* Sign-off */}
      <div style={{ ...grid(240), marginTop: 14 }}>
        <div style={section}>
          <span style={label}>Issued by *</span>
          <input style={{ ...input, marginBottom: 8 }} placeholder="Full name" value={f.issuedBy.name} onChange={(e) => setIn("issuedBy", "name", e.target.value)} />
          <input style={input} type="date" value={f.issuedBy.date} onChange={(e) => setIn("issuedBy", "date", e.target.value)} />
        </div>
        <div style={section}>
          <span style={label}>Employee acknowledgement</span>
          <input style={{ ...input, marginBottom: 8 }} placeholder="Employee name" disabled={f.employeeAck.refused}
            value={f.employeeAck.name} onChange={(e) => setIn("employeeAck", "name", e.target.value)} />
          <input style={input} type="date" value={f.employeeAck.date} onChange={(e) => setIn("employeeAck", "date", e.target.value)} />
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
            <input type="checkbox" checked={f.employeeAck.refused} onChange={(e) => setIn("employeeAck", "refused", e.target.checked)} />
            Employee refused to sign
          </label>
        </div>
        <div style={section}>
          <span style={label}>Witness</span>
          <input style={input} placeholder="Full name" value={f.witness.name} onChange={(e) => setIn("witness", "name", e.target.value)} />
        </div>
        <div style={section}>
          <span style={label}>Approved by</span>
          <input style={{ ...input, marginBottom: 8 }} placeholder="Manager name" value={f.approvedBy.name} onChange={(e) => setIn("approvedBy", "name", e.target.value)} />
          <input style={input} type="date" value={f.approvedBy.date} onChange={(e) => setIn("approvedBy", "date", e.target.value)} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || !!uploading} style={submitBtn(saving || !!uploading)}>
        {saving ? "Saving…" : `📝 Issue ${lv.en}`}
      </button>
      {msg && (
        <div style={{ textAlign: "center", marginTop: 10, fontWeight: 800, color: msg.startsWith("✅") ? "#16a34a" : msg.startsWith("❌") ? "#dc2626" : "#334155" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
