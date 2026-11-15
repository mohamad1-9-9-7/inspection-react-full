// src/pages/haccp and iso/MunicipalityInspectionInput.jsx
// Municipality inspections — log a visit, or edit one (?edit=<id>).
// Design: _shared/pageKit.jsx. Data + strings: dmInspectionShared.js.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../config/api";
import { useLangState } from "../../utils/appLang";
import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";
import { normText } from "../dashboard/dashboardSearch";
import { HaccpPage, Btn, Panel, Field, Note, useToast } from "./_shared/pageKit";
import {
  TYPE, DM_T, MUNICIPALITIES, BRANCHES, GRADES, VISIT_TYPES, OUTCOMES, normalizeVisit, todayDubai, newId,
} from "./dmInspectionShared";

const MAX_PDF = 10 * 1024 * 1024;

const blank = () => ({
  municipality: MUNICIPALITIES[0], branchName: "", inspectionDate: todayDubai(), inspectionGrade: "",
  visitType: "routine", outcome: "", inspectorName: "", referenceNo: "", fineAmount: "", notes: "",
});
const blankFinding = () => ({ id: newId(), text: "", action: "", owner: "", due: "", status: "open", closedAt: "" });

/* Shrink a photo in the browser before it is uploaded (base64 never enters the record). */
async function compressToFile(file, maxDim = 1600, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return file;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], `${String(file.name || "photo").replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // a format the browser cannot draw (HEIC…): the server converts it
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function MunicipalityInspectionInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const [lang] = useLangState("en");
  const t = DM_T[lang] || DM_T.en;
  const isAr = lang === "ar";
  const [toast, say] = useToast();

  const [form, setForm] = useState(blank);
  const [findings, setFindings] = useState([]);
  const [images, setImages] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [keep, setKeep] = useState({}); // the edited record's other payload fields
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadState, setLoadState] = useState(editId ? "loading" : "ready"); // loading | ready | missing

  const imgRef = useRef(null);
  const pdfRef = useRef(null);
  const busy = saving || !!uploading;

  /* Edit: GET /api/reports/:id answers { report: row } — the fields are in row.payload. */
  useEffect(() => {
    if (!editId) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const row = json?.report || json;
        if (!row?.payload) throw new Error("empty");
        if (!alive) return;
        const v = normalizeVisit(row);
        setForm({
          municipality: v.municipality || MUNICIPALITIES[0], branchName: v.branchName, inspectionDate: v.inspectionDate || todayDubai(),
          inspectionGrade: v.inspectionGrade, visitType: v.visitType, outcome: v.outcome, inspectorName: v.inspectorName,
          referenceNo: v.referenceNo, fineAmount: v.fineAmount, notes: v.notes,
        });
        setFindings(v.findings);
        setImages(v.images.map((x) => ({ ...x, id: newId() })));
        setPdfs(v.pdfs.map((x) => ({ ...x, id: newId() })));
        setKeep(row.payload);
        setLoadState("ready");
      } catch {
        if (alive) setLoadState("missing");
      }
    })();
    return () => { alive = false; };
  }, [editId]);

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [k]: value }));
    setErrors((p) => (p[k] ? { ...p, [k]: "" } : p));
  };
  const setFinding = (id, k, value) => setFindings((list) => list.map((x) => (x.id === id ? { ...x, [k]: value } : x)));

  async function addImages(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setUploading("img");
    try {
      const added = [];
      for (const file of picked) {
        const url = await uploadImageToServer(await compressToFile(file), TYPE);
        added.push({ id: newId(), name: file.name || "photo.jpg", mime: "image/jpeg", url });
      }
      setImages((p) => [...p, ...added]);
    } catch {
      say(t.upErr, "err");
    } finally {
      setUploading("");
    }
  }

  async function addPdfs(e) {
    const picked = Array.from(e.target.files || []).filter(
      (file) => file.type === "application/pdf" || String(file.name || "").toLowerCase().endsWith(".pdf")
    );
    e.target.value = "";
    if (!picked.length) return;
    setUploading("pdf");
    try {
      const added = [];
      for (const file of picked) {
        if (file.size > MAX_PDF) { say(t.pdfBig(file.name), "err"); continue; }
        const url = await uploadImageToServer(file, TYPE);
        added.push({ id: newId(), name: file.name || "file.pdf", mime: "application/pdf", url, size: file.size || 0 });
      }
      if (added.length) setPdfs((p) => [...p, ...added]);
    } catch {
      say(t.upErr, "err");
    } finally {
      setUploading("");
    }
  }

  async function save() {
    const bad = {};
    if (!form.branchName.trim()) bad.branchName = t.need;
    if (!form.inspectionDate) bad.inspectionDate = t.need;
    if (!form.inspectionGrade.trim() && !form.outcome) bad.inspectionGrade = t.need;
    setErrors(bad);
    if (Object.keys(bad).length) return;

    // a branch typed in another letter-case is stored in the list's spelling
    const typed = form.branchName.replace(/\s+/g, " ").trim();
    const branchName = BRANCHES.find((b) => normText(b) === normText(typed)) || typed;
    const payload = {
      ...keep, // keeps anything else an older record carries (reference number, …)
      municipality: form.municipality,
      branchName,
      inspectionDate: form.inspectionDate,
      inspectionGrade: form.inspectionGrade.trim(),
      visitType: form.visitType,
      outcome: form.outcome,
      inspectorName: form.inspectorName.trim(),
      referenceNo: form.referenceNo.trim(),
      fineAmount: form.outcome === "fine" ? String(form.fineAmount).trim() : "",
      notes: form.notes.trim(),
      findings: findings
        .filter((x) => x.text.trim() || x.action.trim())
        .map((x) => ({ ...x, text: x.text.trim(), action: x.action.trim(), owner: x.owner.trim() })),
      images: images.map(({ name, mime, url }) => ({ name, mime, url })),
      pdfs: pdfs.map(({ name, mime, url, size }) => ({ name, mime, url, size })),
      savedAt: Date.now(),
      storage: "cloudinary",
    };

    setSaving(true);
    try {
      // existing record → PUT :id (the generic PUT upserts by type + date and would overwrite another visit)
      const res = await fetch(editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { type: TYPE, payload } : { reporter: "haccp-iso", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      say(t.saved, "ok");
      setTimeout(() => navigate("/haccp-iso/dm-inspection/view"), 700);
    } catch (e) {
      say(`${t.saveErr} ${String(e?.message || "")}`, "err");
      setSaving(false);
    }
  }

  const toRegister = () => navigate("/haccp-iso/dm-inspection/view");

  return (
    <HaccpPage
      lang={lang}
      icon="🏢"
      title={editId ? t.titleEdit : t.titleNew}
      sub={t.subForm}
      clause={t.clause}
      backTo="/haccp-iso/dm-inspection/view"
      actions={<Btn onClick={toRegister}>📋 {t.register}</Btn>}
    >
      {toast}

      {loadState === "loading" && <Note>{t.loading}</Note>}
      {loadState === "missing" && <Note error>{t.notFound}</Note>}

      {loadState === "ready" && (
        <>
          <Panel title={`🏛️ ${t.details}`}>
            <div className="pgk-grid">
              <Field label={t.municipality}>
                <select className="pgk-in" value={form.municipality} onChange={set("municipality")}>
                  {[...new Set([...MUNICIPALITIES, form.municipality])].filter(Boolean).map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label={t.branch} required error={errors.branchName}>
                <input
                  className={`pgk-in${errors.branchName ? " bad" : ""}`}
                  list="dm-branches"
                  value={form.branchName}
                  onChange={set("branchName")}
                  placeholder={t.branchPh}
                />
                <datalist id="dm-branches">{BRANCHES.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field label={t.date} required error={errors.inspectionDate}>
                <input
                  className={`pgk-in${errors.inspectionDate ? " bad" : ""}`}
                  type="date" max={todayDubai()} value={form.inspectionDate} onChange={set("inspectionDate")}
                />
              </Field>
              <Field label={t.visitType}>
                <select className="pgk-in" value={form.visitType} onChange={set("visitType")}>
                  <option value="">—</option>
                  {VISIT_TYPES.map((o) => <option key={o.id} value={o.id}>{isAr ? o.ar : o.en}</option>)}
                </select>
              </Field>
              <Field label={t.outcome}>
                <select className="pgk-in" value={form.outcome} onChange={set("outcome")}>
                  <option value="">—</option>
                  {OUTCOMES.map((o) => <option key={o.id} value={o.id}>{isAr ? o.ar : o.en}</option>)}
                </select>
              </Field>
              <Field label={t.grade} required={!form.outcome} error={errors.inspectionGrade}>
                <input
                  className={`pgk-in${errors.inspectionGrade ? " bad" : ""}`}
                  list="dm-grades"
                  value={form.inspectionGrade}
                  onChange={set("inspectionGrade")}
                  placeholder={t.gradePh}
                />
                <datalist id="dm-grades">{GRADES.map((g) => <option key={g} value={g} />)}</datalist>
              </Field>
              {form.outcome === "fine" && (
                <Field label={t.fine}>
                  <input className="pgk-in" type="number" min="0" step="1" value={form.fineAmount} onChange={set("fineAmount")} />
                </Field>
              )}
              <Field label={t.inspector}>
                <input className="pgk-in" value={form.inspectorName} onChange={set("inspectorName")} />
              </Field>
              <Field label={t.reference}>
                <input className="pgk-in" value={form.referenceNo} onChange={set("referenceNo")} />
              </Field>
              <Field label={t.notes} wide>
                <textarea className="pgk-in" value={form.notes} onChange={set("notes")} placeholder={t.notesPh} />
              </Field>
            </div>
          </Panel>

          <Panel
            title={`📝 ${t.findings}`}
            hint={t.findingsHint}
            actions={<Btn small kind="primary" onClick={() => setFindings((l) => [...l, blankFinding()])}>{t.addFinding}</Btn>}
          >
            {findings.length > 0 && (
              <div className="pgk-tablewrap">
                <table className="pgk-table">
                  <thead>
                    <tr><th>#</th><th>{t.fText}</th><th>{t.fAction}</th><th>{t.fOwner}</th><th>{t.fDue}</th><th>{t.fStatus}</th><th /></tr>
                  </thead>
                  <tbody>
                    {findings.map((x, i) => (
                      <tr key={x.id}>
                        <td>{i + 1}</td>
                        <td style={{ minWidth: 200 }}>
                          <textarea className="pgk-in" style={{ minHeight: 56 }} value={x.text} onChange={(e) => setFinding(x.id, "text", e.target.value)} />
                        </td>
                        <td style={{ minWidth: 200 }}>
                          <textarea className="pgk-in" style={{ minHeight: 56 }} value={x.action} onChange={(e) => setFinding(x.id, "action", e.target.value)} />
                        </td>
                        <td style={{ minWidth: 130 }}>
                          <input className="pgk-in" value={x.owner} onChange={(e) => setFinding(x.id, "owner", e.target.value)} />
                        </td>
                        <td style={{ minWidth: 150 }}>
                          <input className="pgk-in" type="date" value={x.due} onChange={(e) => setFinding(x.id, "due", e.target.value)} />
                        </td>
                        <td style={{ minWidth: 120 }}>
                          <select
                            className="pgk-in"
                            value={x.status}
                            onChange={(e) => {
                              const closed = e.target.value === "closed";
                              setFindings((l) => l.map((y) => (y.id === x.id ? { ...y, status: closed ? "closed" : "open", closedAt: closed ? y.closedAt || todayDubai() : "" } : y)));
                            }}
                          >
                            <option value="open">{t.open}</option>
                            <option value="closed">{t.closed}</option>
                          </select>
                        </td>
                        <td>
                          {/* removing a row of the form is not a "delete" permission — no data-delete-action */}
                          <Btn small kind="danger" onClick={() => setFindings((l) => l.filter((y) => y.id !== x.id))} aria-label={t.remove}>✕</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            title={`📎 ${t.attach}`}
            hint={t.attachHint}
            actions={
              <>
                <Btn small onClick={() => imgRef.current?.click()} disabled={busy}>{uploading === "img" ? t.uploading : t.addImages}</Btn>
                <Btn small onClick={() => pdfRef.current?.click()} disabled={busy}>{uploading === "pdf" ? t.uploading : t.addPdfs}</Btn>
              </>
            }
          >
            <input ref={imgRef} type="file" accept="image/*" multiple onChange={addImages} style={{ display: "none" }} />
            <input ref={pdfRef} type="file" accept="application/pdf,.pdf" multiple onChange={addPdfs} style={{ display: "none" }} />

            {pdfs.length === 0 && images.length === 0 && <div className="pgk-drop">{t.noPdfs} {t.noImages}</div>}

            {pdfs.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: images.length ? 12 : 0 }}>
                {pdfs.map((p) => (
                  <div key={p.id} className="pgk-file">
                    <span className="pgk-file-ic" aria-hidden="true">PDF</span>
                    <span className="pgk-file-name" title={p.name}>{p.name}{p.size ? ` · ${Math.round(p.size / 1024)} KB` : ""}</span>
                    <a className="pgk-btn sm" href={p.url} target="_blank" rel="noreferrer">{t.openTab} ↗</a>
                    <Btn small kind="danger" onClick={() => setPdfs((l) => l.filter((y) => y.id !== p.id))}>{t.remove}</Btn>
                  </div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div className="pgk-thumbs">
                {images.map((img) => (
                  <div key={img.id} className="pgk-thumb" style={{ cursor: "default" }}>
                    <a href={img.url} target="_blank" rel="noreferrer"><img src={img.url} alt={img.name} loading="lazy" /></a>
                    <span className="pgk-thumb-cap">
                      <span title={img.name}>{img.name}</span>
                      <Btn small kind="danger" onClick={() => setImages((l) => l.filter((y) => y.id !== img.id))} aria-label={t.remove}>✕</Btn>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="pgk-actions" style={{ marginTop: 14 }}>
            <Btn onClick={toRegister} disabled={saving}>{t.cancel}</Btn>
            <Btn kind="ok" onClick={save} disabled={busy}>{saving ? t.saving : `💾 ${editId ? t.saveEdit : t.save}`}</Btn>
          </div>
        </>
      )}
    </HaccpPage>
  );
}
