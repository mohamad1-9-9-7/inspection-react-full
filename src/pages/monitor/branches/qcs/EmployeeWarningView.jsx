// src/pages/monitor/branches/qcs/EmployeeWarningView.jsx
// Employee Warnings — searchable list (level / month filters) + the selected
// warning with its photos, the employee's other warnings, print, PDF, e-mail.
// EN / AR built in (shared app language switch); print + e-mail follow it,
// the PDF stays English (jsPDF cannot shape Arabic).
// ⚠️ Changing text is always ONE string — see the note in EmployeeWarningInput.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { canDelete } from "../../../../utils/perms";
import { thumbUrl, deleteImage } from "../../../../utils/imageUpload";
import SignatureName from "../../../shared/SignatureName";
import EmailSendModal from "../../../shared/EmailSendModal";
import { useSettingsLang } from "../../../settings/_shared/settingsI18n";
import {
  TYPE, LEVELS, levelById, levelName, catName, catEn, dmy, recId, tr, fetchWarnings, historyFor,
  consequenceOf, warningSubject, buildWarningHtml, buildWarningText, generateWarningPdf, printWarning,
} from "./employeeWarningCore";
import { hideSectionLangToggle } from "../../../../utils/appLang";

const panel = { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 8px 18px rgba(2,6,23,.06)", padding: 14 };
const input = { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 13 };
const btn = (bg, fg = "#fff", border = bg) => ({ background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 14px", fontWeight: 800, cursor: "pointer" });

function LevelPill({ id, lang }) {
  const l = levelById(id);
  return <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 999, background: l.color, color: "#fff", whiteSpace: "nowrap" }}>{levelName(id, lang)}</span>;
}

function Info({ k, v }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{k}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginTop: 2 }} dir="auto">{v || "—"}</div>
    </div>
  );
}

function Block({ title, text }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900, background: "#e5e7eb", padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a" }}>{title}</div>
      <div dir="auto" style={{ padding: 10, border: "1px solid #e2e8f0", borderTop: "none", whiteSpace: "pre-wrap", unicodeBidi: "plaintext", textAlign: "start" }}>{text || "—"}</div>
    </div>
  );
}

function SignBox({ title, name, date, note }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{title}</div>
      {note
        ? <div style={{ fontWeight: 800, color: "#b45309", marginTop: 4 }}>{note}</div>
        : <div style={{ marginTop: 2 }}><SignatureName name={name} underline={false} size={24} /></div>}
      <div style={{ fontSize: 12, color: "#64748b" }}>{date ? dmy(date) : ""}</div>
    </div>
  );
}

export default function EmployeeWarningView({ type = TYPE, reporter = "qcs" } = {}) {
  const { lang, toggle, dir } = useSettingsLang();
  const T = (k, v) => tr(lang, k, v);
  const cats = (list) => (list || []).map((c) => catName(c, lang)).join(lang === "ar" ? "، " : ", ");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [month, setMonth] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      setRecords(await fetchWarnings(reporter, type, abortRef.current.signal));
    } catch (e) {
      if (e.name !== "AbortError") setError("loadFailed");
    } finally {
      setLoading(false);
    }
  }, [reporter, type]);

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, [load]);

  const months = useMemo(
    () => [...new Set(records.map((r) => String(r.payload?.date || "").slice(0, 7)).filter(Boolean))].sort().reverse(),
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const p = r.payload || {};
      if (levelFilter && p.level !== levelFilter) return false;
      if (month && !String(p.date || "").startsWith(month)) return false;
      if (!q) return true;
      // Search matches both languages, whatever the screen shows.
      return [p.employeeNo, p.employeeName, p.position, p.site, p.location, p.description,
        levelById(p.level).en, levelById(p.level).ar,
        ...(p.categories || []).flatMap((c) => [catEn(c), catName(c, "ar")]), dmy(p.date), p.issuedBy?.name]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [records, search, levelFilter, month]);

  const countByLevel = useMemo(() => {
    const m = {};
    records.forEach((r) => { const k = r.payload?.level || "notice"; m[k] = (m[k] || 0) + 1; });
    return m;
  }, [records]);

  const selected = useMemo(() => records.find((r) => recId(r) === selectedId) || null, [records, selectedId]);
  const p = useMemo(() => selected?.payload || {}, [selected]);
  const others = useMemo(() => (selected ? historyFor(records, p, recId(selected)).list : []), [records, selected, p]);

  const emailConfig = useMemo(() => ({
    reportTitle: lang === "ar" ? "إنذار موظف" : "Employee Warning",
    reportType: type,
    allowServerSend: true,
    getSubject: (rep) => warningSubject(rep),
    generatePdf: async (rep) => generateWarningPdf(rep || sending),
    buildHtml: buildWarningHtml,
    buildText: buildWarningText,
    getImages: (rep) => (rep?.photos || []).filter((u) => u && !String(u).startsWith("blob:")),
    getCertificate: () => null,
    getSummary: (rep) => ({
      fields: [
        { label: tr(lang, "date"), value: dmy(rep?.date) },
        { label: tr(lang, "employee"), value: rep?.employeeName || "—" },
        { label: tr(lang, "level"), value: levelName(rep?.level, lang) },
        { label: tr(lang, "photos"), value: String((rep?.photos || []).length) },
      ],
    }),
    getDefaultTo: () => [],
    getDefaultCc: () => [],
    getReportDate: (rep) => rep?.date || null,
    getReportRef: (rep) => `${rep?.employeeNo || rep?.employeeName || ""} ${rep?.date || ""}`.trim() || null,
  }), [type, sending, lang]);

  async function downloadPdf() {
    try {
      setPdfBusy(true);
      const { blob, filename } = await generateWarningPdf(p);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      alert(T("pdfFailed") + (e?.message || e));
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleDelete() {
    const id = recId(selected);
    if (!id || !window.confirm(T("delConfirm"))) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      (p.photos || []).forEach((u) => deleteImage(u).catch(() => {}));
      setRecords((list) => list.filter((r) => recId(r) !== id));
      setSelectedId(null);
    } catch {
      alert(T("delFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const lv = levelById(p.level);
  const ack = p.employeeAck || {};

  return (
    <div style={{ padding: "8px 0" }} dir={dir} lang={lang}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{T("records")}</h2>
          {!hideSectionLangToggle() && (
          <button onClick={toggle} style={{ ...btn("#fff", "#0f3d2e", "#0f3d2e"), borderRadius: 999 }}
            title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}>
            {lang === "ar" ? "🌐 English" : "🌐 عربي"}
          </button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          <button onClick={() => setLevelFilter("")} style={{ ...btn(levelFilter ? "#fff" : "#0f172a", levelFilter ? "#0f172a" : "#fff", "#0f172a"), padding: "4px 12px", fontSize: 12 }}>
            {`${T("all")} · ${records.length}`}
          </button>
          {LEVELS.map((l) => (
            <button key={l.id} onClick={() => setLevelFilter(levelFilter === l.id ? "" : l.id)}
              style={{ ...btn(levelFilter === l.id ? l.color : "#fff", levelFilter === l.id ? "#fff" : l.color, l.color), padding: "4px 12px", fontSize: 12 }}>
              {`${levelName(l.id, lang)} · ${countByLevel[l.id] || 0}`}
            </button>
          ))}
        </div>
      </div>

      {!!error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12, color: "#dc2626", fontWeight: 700, marginBottom: 12 }}>{`⚠️ ${T(error)}`}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* List */}
        <aside style={{ ...panel, flex: "0 0 320px", maxWidth: "100%", maxHeight: "82vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            <input style={input} dir="auto" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T("searchPh")} />
            <div style={{ display: "flex", gap: 8 }}>
              <select style={input} value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">{T("allMonths")}</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={load} disabled={loading} style={btn("#0f3d2e")}>{loading ? "⏳" : "🔄"}</button>
            </div>
          </div>
          {!loading && filtered.length === 0 && <div style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>{T("noneFound")}</div>}
          <div style={{ display: "grid", gap: 6 }}>
            {filtered.map((r) => {
              const id = recId(r), rp = r.payload || {}, on = id === selectedId;
              return (
                <button key={id} onClick={() => setSelectedId(id)}
                  style={{ textAlign: "start", padding: "9px 10px", borderRadius: 10, cursor: "pointer", background: on ? "#f1f5f9" : "#fff",
                    border: on ? "2px solid #0f172a" : "1px solid #e2e8f0", borderInlineStart: `5px solid ${levelById(rp.level).color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                    <b style={{ color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="auto">{rp.employeeName || "—"}</b>
                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{dmy(rp.date)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {`${cats(rp.categories)}${(rp.photos || []).length ? ` · 📷${rp.photos.length}` : ""}`}
                    </span>
                    <LevelPill id={rp.level} lang={lang} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Details */}
        <main style={{ ...panel, flex: 1, minWidth: 300, maxHeight: "82vh", overflowY: "auto" }}>
          {!selected ? (
            <div style={{ padding: 30, color: "#94a3b8", textAlign: "center" }}>{T("selectOne")}</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: lv.color }}>{levelName(p.level, lang)}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{`${p.headerTop?.documentNo || ""} · ${dmy(p.date)}`}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => printWarning(p, lang)} style={btn("#0f172a")}>{T("print")}</button>
                  <button onClick={downloadPdf} disabled={pdfBusy} title={T("pdfNote")} style={btn("#0369a1")}>{pdfBusy ? "⏳" : T("pdf")}</button>
                  <button onClick={() => setSending(p)} style={btn("#0f3d2e")}>{T("email")}</button>
                  {canDelete("daily") && (
                    <button onClick={handleDelete} disabled={deleting} style={btn("#fee2e2", "#dc2626", "#fecaca")} data-delete-action="true">
                      {deleting ? "…" : T("del")}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
                <Info k={T("employee")} v={p.employeeName} />
                <Info k={T("empNo")} v={p.employeeNo} />
                <Info k={T("position")} v={p.position} />
                <Info k={T("site")} v={p.site} />
                <Info k={T("incident")} v={`${dmy(p.incidentDate)}${p.incidentTime ? ` ${p.incidentTime}` : ""}`} />
                <Info k={T("location")} v={p.location} />
                <Info k={T("violation")} v={cats(p.categories)} />
                <Info k={T("previous")} v={String(p.previousCount ?? 0)} />
              </div>

              <Block title={T("description")} text={p.description} />
              {(p.photos || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>{T("photosN", { n: p.photos.length })}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {p.photos.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer">
                        <img src={thumbUrl(u, 320)} alt="" style={{ width: 150, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <Block title={`${T("corrective")}${p.improvementBy ? T("byDate", { d: dmy(p.improvementBy) }) : ""}`} text={p.correctiveAction} />
              <Block title={T("consequence")} text={consequenceOf(p, lang)} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, marginTop: 12 }}>
                <SignBox title={T("issuedBy")} name={p.issuedBy?.name} date={p.issuedBy?.date} />
                <SignBox title={T("employee")} name={ack.name} date={ack.date} note={ack.refused ? T("refusedShort") : ""} />
                <SignBox title={T("witness")} name={p.witness?.name} />
                <SignBox title={T("approvedBy")} name={p.approvedBy?.name} date={p.approvedBy?.date} />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>{T("others", { n: others.length })}</div>
                {others.length === 0 ? <div style={{ color: "#94a3b8" }}>{T("none")}</div> : (
                  <div style={{ display: "grid", gap: 4 }}>
                    {others.map((r) => (
                      <button key={recId(r)} onClick={() => setSelectedId(recId(r))}
                        style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>
                        <span>{`${dmy(r.payload?.date)} · ${cats(r.payload?.categories)}`}</span>
                        <LevelPill id={r.payload?.level} lang={lang} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <EmailSendModal open={!!sending} onClose={() => setSending(null)} payload={sending} config={emailConfig} />
    </div>
  );
}
