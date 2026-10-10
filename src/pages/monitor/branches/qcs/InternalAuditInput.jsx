// src/pages/monitor/branches/qcs/InternalAuditInput.jsx
// QCS Internal Audit — input.
//
// ~200 questions in 31 sections. Instead of one endless page of dropdowns the
// auditor works ONE section at a time: a section list with live progress on
// the side, big Yes / OK / No / N/A buttons per question, "mark the rest" for
// sections that are all fine, and a one-click "Add as finding" on any No.
// Findings and sign-off are the last two steps; Save works from any step.
//
// The saved payload is unchanged (headerTop / headRow / checklist /
// auditRecommendation / footer), so the view and old records are unaffected.
import React, { useMemo, useState } from "react";
import { queuedMessage, saveReport } from "../../../../utils/reportOutbox";
import { AUDIT_DOC, AUDIT_GROUPS } from "./internalAuditChecklist";

const TYPE = "qcs_internal_audit";

/* Stored values stay exactly what the old form saved. */
const ANSWERS = [
  { value: "Yes", label: "Yes", tone: "yes" },
  { value: "OK",  label: "OK",  tone: "ok" },
  { value: "No",  label: "No",  tone: "no" },
  { value: "NA",  label: "N/A", tone: "na" },
];
const FINDING_STATUS = ["OPEN", "IN PROGRESS", "CLOSED", "ON HOLD"];
const FINDING_TYPES = ["Major non-conformity", "Minor non-conformity", "Observation", "Opportunity for improvement"];

const STEP_FINDINGS = "findings";
const STEP_SIGN = "sign";

const blankChecklist = () => {
  const o = {};
  AUDIT_GROUPS.forEach((g) => g.items.forEach((it) => { o[it.code] = { status: "", remarks: "" }; }));
  return o;
};
const blankRec = () => ({ finding: "", type: "", action: "", resp: "", targetDate: "", status: "OPEN" });
const blankMeta = () => ({ conductedBy: "", verifiedBy: "", dateOfAudit: "", area: "", auditorName: "", auditorSignDate: "" });
const firstLine = (t) => String(t || "").split("\n")[0].trim();
const shortTitle = (t) => String(t).replace(/^\d+\s+/, "");

/* Doubled class + !important: globals.css forces #root * to 14px. Sizes follow
   the Aa text-size setting through --app-fs. */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .ia.ia { color:#0f172a; background:#f5f8fc; border-radius:16px; padding:16px; }
#root .ia.ia * { box-sizing:border-box; }
#root .ia.ia .ia-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
#root .ia.ia .ia-title { font-size:${fs(22)}; font-weight:900; margin:0; }
#root .ia.ia .ia-doc { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
#root .ia.ia .ia-doc span { font-size:${fs(12)}; font-weight:700; color:#475569; background:#fff; border:1px solid #e2e8f0; border-radius:999px; padding:3px 10px; }

#root .ia.ia .ia-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; margin-bottom:12px; }
#root .ia.ia .ia-card-t { font-size:${fs(13)}; font-weight:900; color:#334155; letter-spacing:.06em; text-transform:uppercase; margin-bottom:10px; }
#root .ia.ia .ia-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr)); gap:10px; }
#root .ia.ia label.ia-f { display:flex; flex-direction:column; gap:5px; }
#root .ia.ia .ia-f > span { font-size:${fs(12.5)}; font-weight:800; color:#475569; }
#root .ia.ia .ia-f > span b { color:#dc2626; }
#root .ia.ia .ia-in { width:100%; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px 12px; font-size:${fs(15)}; font-family:inherit; color:#0f172a; background:#fff; min-height:44px; }
#root .ia.ia .ia-in:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,.15); }
#root .ia.ia textarea.ia-in { min-height:84px; resize:vertical; line-height:1.5; }

/* progress strip */
#root .ia.ia .ia-prog { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
#root .ia.ia .ia-bar { flex:1 1 220px; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
#root .ia.ia .ia-bar > i { display:block; height:100%; background:linear-gradient(90deg,#0ea5e9,#14b8a6); border-radius:999px; transition:width .25s; }
#root .ia.ia .ia-prog-n { font-size:${fs(14)}; font-weight:900; }
#root .ia.ia .ia-pills { display:flex; gap:6px; flex-wrap:wrap; }
#root .ia.ia .ia-pill { font-size:${fs(12.5)}; font-weight:800; border-radius:999px; padding:3px 10px; }
#root .ia.ia .t-yes { background:#dcfce7; color:#15803d; }
#root .ia.ia .t-ok  { background:#dbeafe; color:#1d4ed8; }
#root .ia.ia .t-no  { background:#fee2e2; color:#b91c1c; }
#root .ia.ia .t-na  { background:#f1f5f9; color:#475569; }
#root .ia.ia .t-score { background:#0f766e; color:#fff; }

/* body: section list + step */
#root .ia.ia .ia-body { display:grid; grid-template-columns:300px minmax(0,1fr); gap:12px; align-items:start; }
#root .ia.ia .ia-nav { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:8px; max-height:calc(100vh - 140px); overflow-y:auto; }
#root .ia.ia .ia-nav-btn { width:100%; display:flex; align-items:center; gap:8px; text-align:left; background:transparent; border:1px solid transparent; border-radius:10px; padding:8px 10px; cursor:pointer; font-family:inherit; color:#0f172a; }
#root .ia.ia .ia-nav-btn:hover { background:#f1f5f9; }
#root .ia.ia .ia-nav-btn.on { background:#e0f2fe; border-color:#7dd3fc; }
#root .ia.ia .ia-nav-no { flex-shrink:0; width:26px; height:26px; border-radius:8px; display:grid; place-items:center; font-size:${fs(12)}; font-weight:900; background:#f1f5f9; color:#475569; }
#root .ia.ia .ia-nav-btn.done .ia-nav-no { background:#14b8a6; color:#fff; }
#root .ia.ia .ia-nav-tx { flex:1; min-width:0; }
#root .ia.ia .ia-nav-name { font-size:${fs(13)}; font-weight:800; line-height:1.25; display:block; }
#root .ia.ia .ia-nav-sub { font-size:${fs(11.5)}; font-weight:700; color:#64748b; display:block; margin-top:2px; }
#root .ia.ia .ia-nav-bad { flex-shrink:0; font-size:${fs(11.5)}; font-weight:900; color:#b91c1c; background:#fee2e2; border-radius:999px; padding:1px 8px; }
#root .ia.ia .ia-nav-sep { height:1px; background:#e2e8f0; margin:6px 4px; }
#root .ia.ia .ia-nav-pick { display:none; }

#root .ia.ia .ia-sec-h { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
#root .ia.ia .ia-sec-t { font-size:${fs(19)}; font-weight:900; margin:0; }
#root .ia.ia .ia-sec-s { font-size:${fs(13)}; font-weight:700; color:#64748b; margin-top:2px; }
#root .ia.ia .ia-bulk { display:flex; gap:6px; flex-wrap:wrap; }

#root .ia.ia .ia-q { border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:10px; background:#fff; }
#root .ia.ia .ia-q.is-no { border-color:#fca5a5; background:#fffafa; }
#root .ia.ia .ia-q.is-done { border-color:#d1fae5; }
#root .ia.ia .ia-q-top { display:flex; gap:10px; align-items:flex-start; }
#root .ia.ia .ia-code { flex-shrink:0; font-size:${fs(12)}; font-weight:900; color:#0369a1; background:#e0f2fe; border-radius:8px; padding:3px 8px; margin-top:2px; }
#root .ia.ia .ia-q-tx { flex:1; font-size:${fs(15.5)}; line-height:1.55; white-space:pre-wrap; font-weight:600; color:#1e293b; }
#root .ia.ia .ia-q-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px; }
#root .ia.ia .ia-seg { display:inline-flex; border:1.5px solid #cbd5e1; border-radius:11px; overflow:hidden; flex-shrink:0; }
#root .ia.ia .ia-seg button { border:0; border-right:1px solid #e2e8f0; background:#fff; min-width:64px; min-height:42px; padding:0 12px; font-size:${fs(14)}; font-weight:900; color:#475569; cursor:pointer; font-family:inherit; }
#root .ia.ia .ia-seg button:last-child { border-right:0; }
#root .ia.ia .ia-seg button:hover { background:#f8fafc; }
#root .ia.ia .ia-seg button.on.yes { background:#16a34a; color:#fff; }
#root .ia.ia .ia-seg button.on.ok  { background:#2563eb; color:#fff; }
#root .ia.ia .ia-seg button.on.no  { background:#dc2626; color:#fff; }
#root .ia.ia .ia-seg button.on.na  { background:#64748b; color:#fff; }
#root .ia.ia .ia-rem { flex:1 1 240px; min-height:42px; }
#root .ia.ia .ia-q.is-no .ia-rem { border-color:#fca5a5; }

#root .ia.ia .ia-btn { border-radius:10px; min-height:40px; padding:0 14px; font-size:${fs(13.5)}; font-weight:800; cursor:pointer; font-family:inherit; border:1.5px solid #cbd5e1; background:#fff; color:#334155; }
#root .ia.ia .ia-btn:hover { border-color:#0ea5e9; color:#0369a1; }
#root .ia.ia .ia-btn.pri { background:#0f766e; border-color:#0f766e; color:#fff; }
#root .ia.ia .ia-btn.pri:hover { filter:brightness(1.08); color:#fff; }
#root .ia.ia .ia-btn.red { background:#fff1f2; border-color:#fecaca; color:#b91c1c; }
#root .ia.ia .ia-btn.added { background:#f0fdf4; border-color:#bbf7d0; color:#15803d; cursor:default; }
#root .ia.ia .ia-btn:disabled { opacity:.55; cursor:not-allowed; }
#root .ia.ia .ia-stepnav { display:flex; justify-content:space-between; gap:10px; margin-top:6px; flex-wrap:wrap; }

#root .ia.ia .ia-rec { border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; margin-bottom:10px; background:#fff; }
#root .ia.ia .ia-rec-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
#root .ia.ia .ia-rec-n { font-size:${fs(14)}; font-weight:900; color:#0f766e; }
#root .ia.ia .ia-empty { padding:22px; text-align:center; color:#64748b; font-weight:700; font-size:${fs(14)}; border:1.5px dashed #cbd5e1; border-radius:12px; background:#fff; }

#root .ia.ia .ia-save { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-top:12px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:12px 16px; }
#root .ia.ia .ia-msg { font-size:${fs(14)}; font-weight:800; }
#root .ia.ia .ia-msg.ok { color:#15803d; }
#root .ia.ia .ia-msg.err { color:#b91c1c; }

@media (max-width: 1000px) {
  #root .ia.ia .ia-body { grid-template-columns:1fr; }
  #root .ia.ia .ia-nav { display:none; }
  #root .ia.ia .ia-nav-pick { display:block; margin-bottom:10px; }
}
@media (max-width: 560px) {
  #root .ia.ia { padding:10px; }
  #root .ia.ia .ia-seg { width:100%; }
  #root .ia.ia .ia-seg button { flex:1; min-width:0; }
}
`;

export default function InternalAuditInput() {
  const [meta, setMeta] = useState(blankMeta);
  const [checklist, setChecklist] = useState(blankChecklist);
  const [recs, setRecs] = useState([]);
  const [step, setStep] = useState(0); // section index, or STEP_FINDINGS / STEP_SIGN
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", tone: "" });

  const setMetaVal = (k, v) => setMeta((p) => ({ ...p, [k]: v }));
  const setCell = (code, field, v) => setChecklist((p) => ({ ...p, [code]: { ...(p[code] || {}), [field]: v } }));
  const answer = (code, v) => setCell(code, "status", checklist[code]?.status === v ? "" : v); // tap again = clear

  /* ── progress ── */
  const stats = useMemo(() => {
    let yes = 0, ok = 0, no = 0, na = 0, total = 0;
    const perGroup = AUDIT_GROUPS.map((g) => {
      let done = 0, bad = 0;
      g.items.forEach((it) => {
        total += 1;
        const s = checklist[it.code]?.status;
        if (s) done += 1;
        if (s === "Yes") yes += 1; else if (s === "OK") ok += 1; else if (s === "No") { no += 1; bad += 1; } else if (s === "NA") na += 1;
      });
      return { done, bad, total: g.items.length };
    });
    const answered = yes + ok + no + na;
    const scored = yes + ok + no;
    return { yes, ok, no, na, total, answered, perGroup, score: scored ? Math.round(((yes + ok) / scored) * 100) : null };
  }, [checklist]);

  const findingCodes = useMemo(() => new Set(recs.map((r) => r.fromCode).filter(Boolean)), [recs]);
  const noWithoutRemark = useMemo(
    () => AUDIT_GROUPS.flatMap((g) => g.items).filter((it) => checklist[it.code]?.status === "No" && !String(checklist[it.code]?.remarks || "").trim()).length,
    [checklist]
  );

  /* ── bulk + findings ── */
  const markRest = (gi, value) => setChecklist((p) => {
    const next = { ...p };
    AUDIT_GROUPS[gi].items.forEach((it) => { if (!next[it.code]?.status) next[it.code] = { ...(next[it.code] || {}), status: value }; });
    return next;
  });
  const addFinding = (it) => {
    const remark = String(checklist[it.code]?.remarks || "").trim();
    setRecs((p) => [...p, {
      ...blankRec(),
      fromCode: it.code,
      finding: `${it.code} — ${firstLine(it.text)}${remark ? `\nFound: ${remark}` : ""}`,
      type: "Minor non-conformity",
    }]);
  };
  const setRec = (i, k, v) => setRecs((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const delRec = (i) => setRecs((p) => p.filter((_, j) => j !== i));

  const goto = (s) => { setStep(s); try { document.querySelector(".ia-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* old browsers */ } };
  const sectionCount = AUDIT_GROUPS.length;
  const stepIndex = typeof step === "number" ? step : step === STEP_FINDINGS ? sectionCount : sectionCount + 1;
  const stepOrder = [...AUDIT_GROUPS.map((_, i) => i), STEP_FINDINGS, STEP_SIGN];

  /* ── save ── */
  async function handleSave() {
    if (!meta.dateOfAudit) { setMsg({ text: "⚠️ Enter the Date of Audit (top of the page).", tone: "err" }); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const left = stats.total - stats.answered;
    if (left > 0 && !window.confirm(`${left} question(s) are still unanswered. Save anyway?`)) return;
    if (noWithoutRemark > 0 && !window.confirm(`${noWithoutRemark} "No" answer(s) have no remarks. Save anyway?`)) return;

    const payload = {
      headerTop: {
        documentTitle: AUDIT_DOC.docTitle,
        documentNo: AUDIT_DOC.docNo,
        issueNo: AUDIT_DOC.issueNo,
        revisionNo: AUDIT_DOC.revision,
        issueDate: AUDIT_DOC.issueDate,
      },
      headRow: {
        conductedBy: meta.conductedBy,
        verifiedBy: meta.verifiedBy,
        dateOfAudit: meta.dateOfAudit,
        area: meta.area,
      },
      checklist: AUDIT_GROUPS.map((g) => ({
        title: g.title,
        items: g.items.map((it) => ({
          code: it.code,
          text: it.text,
          status: checklist[it.code]?.status || "",
          remarks: checklist[it.code]?.remarks || "",
        })),
      })),
      auditRecommendation: recs.filter((r) => String(r.finding || r.action || "").trim()),
      footer: {
        auditorName: meta.auditorName,
        auditorSignDate: meta.auditorSignDate,
      },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setMsg({ text: "Saving…", tone: "" });
      const { queued } = await saveReport({ body: { reporter: "qcs", type: TYPE, payload }, label: "Internal Audit" });
      // Start a clean sheet so a second Save cannot file the same audit twice.
      setMeta(blankMeta()); setChecklist(blankChecklist()); setRecs([]); setStep(0);
      setMsg({ text: queued ? queuedMessage("en") : "✅ Audit saved. The form is ready for the next one.", tone: "ok" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      setMsg({ text: "❌ Save failed: " + (e?.message || "please try again"), tone: "err" });
    } finally {
      setSaving(false);
    }
  }

  /* ── renderers ── */
  const navButton = (i) => {
    const g = AUDIT_GROUPS[i];
    const st = stats.perGroup[i];
    const done = st.done === st.total;
    return (
      <button key={g.title} type="button" className={`ia-nav-btn ${step === i ? "on" : ""} ${done ? "done" : ""}`} onClick={() => goto(i)}>
        <span className="ia-nav-no">{done ? "✓" : i + 1}</span>
        <span className="ia-nav-tx">
          <span className="ia-nav-name">{shortTitle(g.title)}</span>
          <span className="ia-nav-sub">{st.done} / {st.total} answered</span>
        </span>
        {st.bad > 0 && <span className="ia-nav-bad">{st.bad} No</span>}
      </button>
    );
  };

  const renderSection = (gi) => {
    const g = AUDIT_GROUPS[gi];
    const st = stats.perGroup[gi];
    return (
      <>
        <div className="ia-sec-h">
          <div>
            <h3 className="ia-sec-t">{shortTitle(g.title)}</h3>
            <div className="ia-sec-s">Section {gi + 1} of {sectionCount} · {st.done} / {st.total} answered{st.bad ? ` · ${st.bad} No` : ""}</div>
          </div>
          {st.done < st.total && (
            <div className="ia-bulk">
              <button type="button" className="ia-btn" onClick={() => markRest(gi, "Yes")}>✓ Mark the rest Yes</button>
              <button type="button" className="ia-btn" onClick={() => markRest(gi, "NA")}>Mark the rest N/A</button>
            </div>
          )}
        </div>

        {g.items.map((it) => {
          const cur = checklist[it.code] || {};
          const isNo = cur.status === "No";
          return (
            <div key={it.code} className={`ia-q ${isNo ? "is-no" : cur.status ? "is-done" : ""}`}>
              <div className="ia-q-top">
                <span className="ia-code">{it.code}</span>
                <div className="ia-q-tx">{it.text}</div>
              </div>
              <div className="ia-q-row">
                <div className="ia-seg" role="group" aria-label={`Answer ${it.code}`}>
                  {ANSWERS.map((a) => (
                    <button key={a.value} type="button" className={`${a.tone} ${cur.status === a.value ? "on" : ""}`}
                      onClick={() => answer(it.code, a.value)} aria-pressed={cur.status === a.value}>{a.label}</button>
                  ))}
                </div>
                <input className="ia-in ia-rem" value={cur.remarks || ""} onChange={(e) => setCell(it.code, "remarks", e.target.value)}
                  placeholder={isNo ? "What was found? (needed for a finding)" : "Remarks (optional)"} />
                {isNo && (findingCodes.has(it.code)
                  ? <button type="button" className="ia-btn added" disabled>✓ Added to findings</button>
                  : <button type="button" className="ia-btn red" onClick={() => addFinding(it)}>＋ Add as finding</button>)}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  const renderFindings = () => (
    <>
      <div className="ia-sec-h">
        <div>
          <h3 className="ia-sec-t">Findings &amp; actions</h3>
          <div className="ia-sec-s">Each finding needs an action, an owner and a target date. “Add as finding” on a No answer fills one in for you.</div>
        </div>
        <button type="button" className="ia-btn" onClick={() => setRecs((p) => [...p, blankRec()])}>＋ Add finding</button>
      </div>
      {recs.length === 0 && <div className="ia-empty">No findings yet{stats.no ? ` — there are ${stats.no} "No" answers you can turn into findings.` : "."}</div>}
      {recs.map((r, i) => (
        <div key={i} className="ia-rec">
          <div className="ia-rec-h">
            <span className="ia-rec-n">Finding {i + 1}{r.fromCode ? ` · from ${r.fromCode}` : ""}</span>
            <button type="button" className="ia-btn red" onClick={() => delRec(i)}>Remove</button>
          </div>
          <div className="ia-grid">
            <label className="ia-f" style={{ gridColumn: "1 / -1" }}><span>Audit finding</span>
              <textarea className="ia-in" value={r.finding} onChange={(e) => setRec(i, "finding", e.target.value)} /></label>
            <label className="ia-f"><span>Finding type</span>
              <select className="ia-in" value={r.type} onChange={(e) => setRec(i, "type", e.target.value)}>
                <option value="">—</option>
                {[...new Set([...FINDING_TYPES, r.type].filter(Boolean))].map((t) => <option key={t}>{t}</option>)}
              </select></label>
            <label className="ia-f"><span>Responsibility</span>
              <input className="ia-in" value={r.resp} onChange={(e) => setRec(i, "resp", e.target.value)} placeholder="Who will fix it" /></label>
            <label className="ia-f"><span>Target date</span>
              <input type="date" className="ia-in" value={r.targetDate} onChange={(e) => setRec(i, "targetDate", e.target.value)} /></label>
            <label className="ia-f"><span>Status</span>
              <select className="ia-in" value={r.status} onChange={(e) => setRec(i, "status", e.target.value)}>
                {FINDING_STATUS.map((s) => <option key={s}>{s}</option>)}
              </select></label>
            <label className="ia-f" style={{ gridColumn: "1 / -1" }}><span>Action to be taken</span>
              <textarea className="ia-in" value={r.action} onChange={(e) => setRec(i, "action", e.target.value)} /></label>
          </div>
        </div>
      ))}
    </>
  );

  const renderSign = () => (
    <>
      <div className="ia-sec-h">
        <div>
          <h3 className="ia-sec-t">Sign-off</h3>
          <div className="ia-sec-s">{stats.answered} of {stats.total} answered · {recs.length} finding(s){stats.score != null ? ` · ${stats.score}% compliance` : ""}</div>
        </div>
      </div>
      <div className="ia-grid">
        <label className="ia-f"><span>Auditor name</span>
          <input className="ia-in" value={meta.auditorName} onChange={(e) => setMetaVal("auditorName", e.target.value)} /></label>
        <label className="ia-f"><span>Sign date</span>
          <input type="date" className="ia-in" value={meta.auditorSignDate} onChange={(e) => setMetaVal("auditorSignDate", e.target.value)} /></label>
      </div>
    </>
  );

  const pct = Math.round((stats.answered / stats.total) * 100);
  const prev = stepOrder[stepIndex - 1];
  const next = stepOrder[stepIndex + 1];
  const stepName = (s) => (s === STEP_FINDINGS ? "Findings" : s === STEP_SIGN ? "Sign-off" : shortTitle(AUDIT_GROUPS[s].title));

  return (
    <div className="ia" dir="ltr" lang="en">
      <style>{CSS}</style>

      <div className="ia-head">
        <div>
          <h2 className="ia-title">Internal Audit — QCS</h2>
          <div className="ia-doc">
            <span>Doc {AUDIT_DOC.docNo}</span><span>Issue {AUDIT_DOC.issueNo}</span>
            <span>Rev {AUDIT_DOC.revision}</span><span>Issued 01/11/2025</span>
          </div>
        </div>
      </div>

      <div className="ia-card">
        <div className="ia-card-t">Audit details</div>
        <div className="ia-grid">
          <label className="ia-f"><span>Date of audit <b>*</b></span>
            <input type="date" className="ia-in" value={meta.dateOfAudit} onChange={(e) => setMetaVal("dateOfAudit", e.target.value)} /></label>
          <label className="ia-f"><span>Area</span>
            <input className="ia-in" value={meta.area} onChange={(e) => setMetaVal("area", e.target.value)} placeholder="e.g. QCS warehouse" /></label>
          <label className="ia-f"><span>Conducted by</span>
            <input className="ia-in" value={meta.conductedBy} onChange={(e) => setMetaVal("conductedBy", e.target.value)} /></label>
          <label className="ia-f"><span>Verified by</span>
            <input className="ia-in" value={meta.verifiedBy} onChange={(e) => setMetaVal("verifiedBy", e.target.value)} /></label>
        </div>
      </div>

      <div className="ia-card">
        <div className="ia-prog">
          <span className="ia-prog-n">{stats.answered} / {stats.total} answered</span>
          <div className="ia-bar" aria-label={`${pct}% answered`}><i style={{ width: `${pct}%` }} /></div>
          <div className="ia-pills">
            <span className="ia-pill t-yes">Yes {stats.yes}</span>
            <span className="ia-pill t-ok">OK {stats.ok}</span>
            <span className="ia-pill t-no">No {stats.no}</span>
            <span className="ia-pill t-na">N/A {stats.na}</span>
            {stats.score != null && <span className="ia-pill t-score">{stats.score}% compliance</span>}
          </div>
        </div>
      </div>

      <div className="ia-anchor" />
      <div className="ia-body">
        <nav className="ia-nav" aria-label="Audit sections">
          {AUDIT_GROUPS.map((_, i) => navButton(i))}
          <div className="ia-nav-sep" />
          <button type="button" className={`ia-nav-btn ${step === STEP_FINDINGS ? "on" : ""}`} onClick={() => goto(STEP_FINDINGS)}>
            <span className="ia-nav-no">📌</span>
            <span className="ia-nav-tx"><span className="ia-nav-name">Findings &amp; actions</span><span className="ia-nav-sub">{recs.length} finding(s)</span></span>
          </button>
          <button type="button" className={`ia-nav-btn ${step === STEP_SIGN ? "on" : ""}`} onClick={() => goto(STEP_SIGN)}>
            <span className="ia-nav-no">✍️</span>
            <span className="ia-nav-tx"><span className="ia-nav-name">Sign-off</span><span className="ia-nav-sub">Auditor + date</span></span>
          </button>
        </nav>

        <div>
          <select className="ia-in ia-nav-pick" value={String(step)} aria-label="Go to section"
            onChange={(e) => { const v = e.target.value; goto(/^\d+$/.test(v) ? Number(v) : v); }}>
            {AUDIT_GROUPS.map((g, i) => (
              <option key={g.title} value={i}>{i + 1}. {shortTitle(g.title)} — {stats.perGroup[i].done}/{stats.perGroup[i].total}{stats.perGroup[i].bad ? ` · ${stats.perGroup[i].bad} No` : ""}</option>
            ))}
            <option value={STEP_FINDINGS}>📌 Findings &amp; actions ({recs.length})</option>
            <option value={STEP_SIGN}>✍️ Sign-off</option>
          </select>

          <div className="ia-card">
            {typeof step === "number" ? renderSection(step) : step === STEP_FINDINGS ? renderFindings() : renderSign()}
            <div className="ia-stepnav">
              {prev !== undefined ? <button type="button" className="ia-btn" onClick={() => goto(prev)}>← {stepName(prev)}</button> : <span />}
              {next !== undefined && <button type="button" className="ia-btn pri" onClick={() => goto(next)}>{stepName(next)} →</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="ia-save">
        <span className={`ia-msg ${msg.tone}`}>{msg.text || `${stats.answered} of ${stats.total} answered · ${recs.length} finding(s)`}</span>
        <button type="button" className="ia-btn pri" onClick={handleSave} disabled={saving} style={{ minWidth: 160 }}>
          {saving ? "Saving…" : "💾 Save audit"}
        </button>
      </div>
    </div>
  );
}
