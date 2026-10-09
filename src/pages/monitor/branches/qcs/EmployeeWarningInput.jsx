// src/pages/monitor/branches/qcs/EmployeeWarningInput.jsx
// Employee Warning / Notice (إنذار / تنبيه داخلي) — one employee per record,
// with violation photos (Cloudinary) and the employee's earlier warnings shown
// as soon as the person is picked, so the right next step is suggested.
// EN / AR built in (the app's shared language switch) — one language at a time.
//
// ⚠️ Every piece of text that changes is ONE string (template literal), never
// text siblings that appear/disappear: browser auto-translation swaps text nodes
// and React then crashes with "insertBefore … not a child of this node".
import React, { useEffect, useMemo, useState } from "react";
import { queuedMessage, saveReport } from "../../../../utils/reportOutbox";
import { uploadImage, deleteImage, thumbUrl } from "../../../../utils/imageUpload";
import { keepPhotoOrUpload, isKeptPhoto, dropKeptPhoto } from "../../../../utils/offlineOutbox";
import { useStaffDirectory, normalizeEmpNo, normalizeName, COMPANY_DIRECTORY } from "../_shared/staffRegistry";
import { useSettingsLang, LangToggle } from "../../../settings/_shared/settingsI18n";
import {
  TYPE, DOC_META, LEVELS, CATEGORIES, SITES, levelName, catName, defaultConsequence, dmy, tr,
  fetchWarnings, historyFor,
} from "./employeeWarningCore";

/* Company register (OHC EMPLOYEES) — the same source the training and OHC
   screens read: typing the employee number fills the name, job and branch. */
const COMPANY_BY_NO = new Map(COMPANY_DIRECTORY.map((d) => [normalizeEmpNo(d.empNo), d]));
const COMPANY_BY_NAME = new Map(COMPANY_DIRECTORY.map((d) => [normalizeName(d.name), d]));

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
const label = { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: ".03em", marginBottom: 6 };
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
  const { lang, toggle, dir } = useSettingsLang();
  const T = (k, v) => tr(lang, k, v);

  const [f, setF] = useState(EMPTY);
  const [records, setRecords] = useState([]);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  /* The QA staff directory wins (its job/branch are kept current); the company
     register covers everyone else. */
  const { byNo, byName } = useStaffDirectory(TYPE);
  const fill = (dirRec, co) => {
    if (!dirRec && !co) return {};
    return {
      employeeNo: dirRec?.empNo || co?.empNo || "",
      employeeName: dirRec?.name || co?.name || "",
      ...((dirRec?.job || co?.job) ? { position: dirRec?.job || co?.job } : {}),
      ...(co?.branch ? { site: co.branch } : {}),
    };
  };

  useEffect(() => {
    const ctrl = new AbortController();
    fetchWarnings(reporter, type, ctrl.signal).then(setRecords).catch(() => {});
    return () => ctrl.abort();
  }, [reporter, type]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setIn = (k, sub, v) => setF((p) => ({ ...p, [k]: { ...p[k], [sub]: v } }));

  const setEmpNo = (v) => setF((p) => {
    const k = normalizeEmpNo(v);
    return { ...p, ...fill(byNo.get(k), COMPANY_BY_NO.get(k)), employeeNo: v };
  });
  const setEmpName = (v) => setF((p) => {
    const k = normalizeName(v);
    return { ...p, ...fill(byName.get(k), COMPANY_BY_NAME.get(k)), employeeName: v };
  });
  const empFound = !!COMPANY_BY_NO.get(normalizeEmpNo(f.employeeNo)) || !!byNo.get(normalizeEmpNo(f.employeeNo));

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
        alert(T("uploadFailed") + (e?.message || e));
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

  async function handleSave() {
    if (!f.date) return alert(T("errDate"));
    if (!f.employeeName.trim()) return alert(T("errName"));
    if (!f.categories.length) return alert(T("errCat"));
    if (!f.description.trim()) return alert(T("errDesc"));
    if (!f.issuedBy.name.trim()) return alert(T("errIssuer"));
    if (uploading) return alert(T("errUploading"));

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
      // Left empty = the level's standard wording, shown in whichever language
      // the record is read/printed in.
      consequence: f.consequence.trim(),
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
      setMsg(T("saving"));
      const { queued } = await saveReport({ body: { reporter, type, payload }, label: "Employee Warning" });
      setMsg(queued ? queuedMessage(lang) : T("saved"));
      if (!queued) setRecords((p) => [{ _id: `local-${payload.savedAt}`, payload }, ...p]);
      setF(EMPTY());
    } catch (e) {
      console.error(e);
      setMsg(T("saveFailed"));
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  return (
    <div style={card} dir={dir} lang={lang}>
      {/* Header band */}
      <div style={{ background: "linear-gradient(135deg,#0f3d2e,#0b5236)", color: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{T("company")}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{lang === "ar" ? DOC_META.docTitleAr : DOC_META.docTitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div>{`${T("docNo")}: ${DOC_META.docNo}`}</div>
            <div>{`${T("area")}: ${T("areaVal")}`}</div>
          </div>
          <LangToggle lang={lang} toggle={toggle} />
        </div>
      </div>

      <datalist id="ew-empno">{COMPANY_DIRECTORY.map((d) => <option key={d.empNo} value={d.empNo}>{d.name}</option>)}</datalist>
      <datalist id="ew-empname">{COMPANY_DIRECTORY.map((d) => <option key={d.empNo} value={d.name}>{d.empNo}</option>)}</datalist>
      <datalist id="ew-sites">{SITES.map((s) => <option key={s} value={s} />)}</datalist>

      {/* Employee */}
      <div style={grid()}>
        <Field title={T("date")}><input style={input} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field title={T("empNo")}>
          <input style={input} dir="ltr" list="ew-empno" placeholder={T("empNoPh")} value={f.employeeNo} onChange={(e) => setEmpNo(e.target.value)} />
          {!!f.employeeNo.trim() && (
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: empFound ? "#16a34a" : "#b45309" }}>
              {empFound ? T("empFound") : T("empMissing")}
            </div>
          )}
        </Field>
        <Field title={T("empName")}><input style={input} dir="auto" list="ew-empname" placeholder={T("empNamePh")} value={f.employeeName} onChange={(e) => setEmpName(e.target.value)} /></Field>
        <Field title={T("position")}><input style={input} dir="auto" placeholder={T("positionPh")} value={f.position} onChange={(e) => set("position", e.target.value)} /></Field>
        <Field title={T("site")}><input style={input} dir="auto" list="ew-sites" value={f.site} onChange={(e) => set("site", e.target.value)} /></Field>
      </div>

      {/* History */}
      {hasWho && (
        <div style={{ ...section, background: history.active.length ? "#fff7ed" : "#f0fdf4", borderColor: history.active.length ? "#fed7aa" : "#bbf7d0" }}>
          {history.list.length === 0 ? (
            <b style={{ color: "#166534" }}>{T("noHistory")}</b>
          ) : (
            <>
              <b style={{ color: "#9a3412" }}>
                {`${T("activeN", { n: history.active.length })}${history.list.length > history.active.length ? T("totalN", { n: history.list.length }) : ""}${T("suggested", { x: levelName(history.suggested, lang) })}`}
              </b>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {history.list.slice(0, 8).map((r) => {
                  const l = LEVELS.find((x) => x.id === r.payload?.level) || LEVELS[0];
                  return (
                    <span key={r._id} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, border: `1px solid ${l.color}`, color: l.color, background: "#fff", fontWeight: 700 }}>
                      {`${dmy(r.payload?.date)} · ${levelName(l.id, lang)}`}
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
        <span style={label}>{T("level")}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {LEVELS.map((l) => {
            const on = f.level === l.id;
            return (
              <button key={l.id} type="button"
                onClick={() => setF((p) => ({ ...p, level: l.id, levelTouched: true }))}
                style={{ padding: "9px 14px", borderRadius: 10, fontWeight: 800, cursor: "pointer",
                  border: `2px solid ${l.color}`, background: on ? l.color : "#fff", color: on ? "#fff" : l.color }}>
                {levelName(l.id, lang)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Violation */}
      <div style={section}>
        <span style={label}>{T("violationType")}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {CATEGORIES.map((c) => {
            const on = f.categories.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 700,
                  border: `1px solid ${on ? "#0f3d2e" : "#cbd5e1"}`, background: on ? "#0f3d2e" : "#fff", color: on ? "#fff" : "#334155" }}>
                {`${on ? "✓ " : ""}${catName(c.id, lang)}`}
              </button>
            );
          })}
        </div>
        <div style={grid(180)}>
          <Field title={T("incidentDate")}><input style={input} type="date" value={f.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} /></Field>
          <Field title={T("time")}><input style={input} type="time" value={f.incidentTime} onChange={(e) => set("incidentTime", e.target.value)} /></Field>
          <Field title={T("location")}><input style={input} dir="auto" placeholder={T("locationPh")} value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field title={`${T("description")} *`}>
            <textarea style={textarea} dir="auto" placeholder={T("descriptionPh")} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>

        {/* Photos */}
        <div style={{ marginTop: 12 }}>
          <span style={label}>{T("photos")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {f.photos.map((u) => (
              <div key={u} style={{ position: "relative" }}>
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={isKeptPhoto(u) ? u : thumbUrl(u, 240)} alt="" style={{ width: 110, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid #cbd5e1", display: "block" }} />
                </a>
                <button type="button" onClick={() => removePhoto(u)} title={T("removePhoto")}
                  style={{ position: "absolute", top: -8, insetInlineEnd: -8, width: 24, height: 24, borderRadius: 999, border: "none", background: "#dc2626", color: "#fff", fontWeight: 900, cursor: "pointer" }}>×</button>
              </div>
            ))}
            <label style={{ width: 110, height: 84, borderRadius: 10, border: "2px dashed #94a3b8", display: "grid", placeItems: "center", cursor: "pointer", color: "#475569", fontWeight: 800, textAlign: "center", fontSize: 12, background: "#fff" }}>
              <span>{uploading ? `⏳ ${uploading}…` : T("addPhoto")}</span>
              <input type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      </div>

      {/* Action */}
      <div style={section}>
        <div style={grid(260)}>
          <Field title={T("corrective")}>
            <textarea style={textarea} dir="auto" placeholder={T("correctivePh")} value={f.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} />
          </Field>
          <Field title={T("consequence")}>
            <textarea style={textarea} dir="auto" placeholder={defaultConsequence(f.level, lang)} value={f.consequence} onChange={(e) => set("consequence", e.target.value)} />
          </Field>
        </div>
        <div style={{ maxWidth: 260, marginTop: 12 }}>
          <Field title={T("improvementBy")}><input style={input} type="date" value={f.improvementBy} onChange={(e) => set("improvementBy", e.target.value)} /></Field>
        </div>
      </div>

      {/* Sign-off */}
      <div style={{ ...grid(240), marginTop: 14 }}>
        <div style={section}>
          <span style={label}>{T("issuedByReq")}</span>
          <input style={{ ...input, marginBottom: 8 }} dir="auto" placeholder={T("fullName")} value={f.issuedBy.name} onChange={(e) => setIn("issuedBy", "name", e.target.value)} />
          <input style={input} type="date" value={f.issuedBy.date} onChange={(e) => setIn("issuedBy", "date", e.target.value)} />
        </div>
        <div style={section}>
          <span style={label}>{T("ack")}</span>
          <input style={{ ...input, marginBottom: 8 }} dir="auto" placeholder={T("ackName")} disabled={f.employeeAck.refused}
            value={f.employeeAck.name} onChange={(e) => setIn("employeeAck", "name", e.target.value)} />
          <input style={input} type="date" value={f.employeeAck.date} onChange={(e) => setIn("employeeAck", "date", e.target.value)} />
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
            <input type="checkbox" checked={f.employeeAck.refused} onChange={(e) => setIn("employeeAck", "refused", e.target.checked)} />
            <span>{T("refused")}</span>
          </label>
        </div>
        <div style={section}>
          <span style={label}>{T("witness")}</span>
          <input style={input} dir="auto" placeholder={T("fullName")} value={f.witness.name} onChange={(e) => setIn("witness", "name", e.target.value)} />
        </div>
        <div style={section}>
          <span style={label}>{T("approvedBy")}</span>
          <input style={{ ...input, marginBottom: 8 }} dir="auto" placeholder={T("managerName")} value={f.approvedBy.name} onChange={(e) => setIn("approvedBy", "name", e.target.value)} />
          <input style={input} type="date" value={f.approvedBy.date} onChange={(e) => setIn("approvedBy", "date", e.target.value)} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || !!uploading} style={submitBtn(saving || !!uploading)}>
        {saving ? T("saving") : T("issueBtn", { x: levelName(f.level, lang) })}
      </button>
      {!!msg && (
        <div style={{ textAlign: "center", marginTop: 10, fontWeight: 800, color: msg.startsWith("✅") ? "#16a34a" : msg.startsWith("❌") ? "#dc2626" : "#334155" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
