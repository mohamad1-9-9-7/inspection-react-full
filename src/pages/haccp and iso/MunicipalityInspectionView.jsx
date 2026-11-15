// src/pages/haccp and iso/MunicipalityInspectionView.jsx
// Municipality inspections — the register: every visit, its grade and
// outcome, and the findings still waiting for a corrective action.
// Design: _shared/pageKit.jsx. Data + strings: dmInspectionShared.js.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { useLangState } from "../../utils/appLang";
import { canWrite, canEdit } from "../../utils/perms";
import { normText, matches } from "../dashboard/dashboardSearch";
import ImageLightbox from "./_shared/ImageLightbox";
import { HaccpPage, Btn, Stats, Stat, Panel, Field, Pill, Note, Modal, useToast, downloadCsv } from "./_shared/pageKit";
import {
  TYPE, DM_T, VISIT_TYPES, OUTCOMES, listLabel, normalizeVisit, openFindings, overdueFindings,
  gradeTone, showDate, todayDubai,
} from "./dmInspectionShared";

const EMPTY_FILTERS = { q: "", municipality: "", branch: "", outcome: "", from: "", to: "", sort: "new", only: "" };

export default function MunicipalityInspectionView() {
  const navigate = useNavigate();
  const [lang] = useLangState("en");
  const t = DM_T[lang] || DM_T.en;
  const isAr = lang === "ar";
  const [toast, say] = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [f, setF] = useState(EMPTY_FILTERS);
  const [openId, setOpenId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // index of the photo shown
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);

  const mayAdd = canWrite("iso");
  const mayEdit = canEdit("iso");
  const today = todayDubai();

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, {
        signal: ctrl.signal, cache: "no-store", headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data) ? data : data?.data || data?.items || data?.rows || [];
      setItems(rows.map(normalizeVisit));
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(String(e?.message || e));
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const uniq = (key) => [...new Set(items.map((x) => x[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const branches = useMemo(() => uniq("branchName"), [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const municipalities = useMemo(() => uniq("municipality"), [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const out = items.filter((it) => {
      if (f.municipality && it.municipality !== f.municipality) return false;
      if (f.branch && it.branchName !== f.branch) return false;
      if (f.outcome && it.outcome !== f.outcome) return false;
      if (f.from && it.inspectionDate < f.from) return false;
      if (f.to && it.inspectionDate > f.to) return false;
      if (f.only === "open" && !openFindings(it).length) return false;
      if (f.only === "overdue" && !overdueFindings(it, today).length) return false;
      if (!f.q.trim()) return true;
      const hay = normText([
        it.municipality, it.branchName, it.inspectionDate, it.inspectionGrade, it.inspectorName, it.referenceNo, it.notes,
        ...it.findings.map((x) => `${x.text} ${x.action} ${x.owner}`),
      ].join(" "));
      return matches(hay, f.q);
    });
    const byDate = (a, b) => (a.inspectionDate < b.inspectionDate ? 1 : a.inspectionDate > b.inspectionDate ? -1 : 0);
    if (f.sort === "old") out.sort((a, b) => -byDate(a, b));
    else if (f.sort === "branch") out.sort((a, b) => a.branchName.localeCompare(b.branchName) || byDate(a, b));
    else if (f.sort === "open") out.sort((a, b) => openFindings(b).length - openFindings(a).length || byDate(a, b));
    else out.sort(byDate);
    return out;
  }, [items, f, today]);

  const stats = useMemo(() => {
    const year = today.slice(0, 4);
    const last = items.reduce((m, x) => (x.inspectionDate > m ? x.inspectionDate : m), "");
    return {
      year: items.filter((x) => x.inspectionDate.startsWith(year)).length,
      open: items.reduce((n, x) => n + openFindings(x).length, 0),
      overdue: items.reduce((n, x) => n + overdueFindings(x, today).length, 0),
      last,
    };
  }, [items, today]);

  const filtersOn = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS);
  const openItem = items.find((x) => x.id === openId) || null;

  /* Close / reopen one finding: the whole payload goes back with that one line changed. */
  async function toggleFinding(visit, findingId) {
    if (!visit?.id || busy) return;
    const findings = visit.findings.map((x) =>
      x.id !== findingId ? x
        : x.status === "closed" ? { ...x, status: "open", closedAt: "" }
        : { ...x, status: "closed", closedAt: today }
    );
    const payload = { ...visit.payload, findings };
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(visit.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.map((x) => (x.id === visit.id ? normalizeVisit({ id: visit.id, createdAt: visit.createdAt, payload }) : x)));
    } catch {
      say(t.saveErr, "err");
    } finally {
      setBusy(false);
    }
  }

  async function removeVisit(visit) {
    if (!visit?.id || busy || !window.confirm(t.delConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(visit.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.id !== visit.id));
      setOpenId(null);
      say(t.deleted, "ok");
    } catch {
      say(t.delErr, "err");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = [t.date, t.municipality, t.branch, t.visitType, t.outcome, t.grade, t.inspector, t.reference, t.fine,
      t.sOpen, t.sOverdue, t.notes, t.fText, t.fAction, t.fOwner, t.fDue, t.fStatus];
    const rows = [];
    filtered.forEach((v) => {
      const base = [showDate(v.inspectionDate), v.municipality, v.branchName, listLabel(VISIT_TYPES, v.visitType, lang),
        listLabel(OUTCOMES, v.outcome, lang), v.inspectionGrade, v.inspectorName, v.referenceNo, v.fineAmount,
        openFindings(v).length, overdueFindings(v, today).length, v.notes];
      if (!v.findings.length) rows.push([...base, "", "", "", "", ""]);
      v.findings.forEach((x) => rows.push([...base, x.text, x.action, x.owner, showDate(x.due), x.status === "closed" ? t.closed : t.open]));
    });
    downloadCsv(`municipality-inspections-${today}.csv`, header, rows);
  }

  const findingPill = (x) =>
    x.status === "closed" ? <Pill tone="green">{t.closed}</Pill>
      : x.due && x.due < today ? <Pill tone="red">{t.overdue}</Pill>
      : <Pill tone="amber">{t.open}</Pill>;

  return (
    <HaccpPage
      lang={lang}
      icon="🏢"
      title={t.title}
      sub={t.sub}
      clause={t.clause}
      actions={
        <>
          <Btn onClick={load} disabled={loading}>{loading ? t.loading : `↻ ${t.refresh}`}</Btn>
          {mayAdd && <Btn kind="primary" onClick={() => navigate("/haccp-iso/dm-inspection")}>{t.newVisit}</Btn>}
        </>
      }
    >
      {toast}

      <Stats>
        <Stat label={t.sVisits} value={filtered.length} tone="blue" />
        <Stat label={t.sYear} value={stats.year} />
        <Stat
          label={t.sOpen} value={stats.open} tone={stats.open ? "amber" : "green"}
          active={f.only === "open"} onClick={() => setF((p) => ({ ...p, only: p.only === "open" ? "" : "open" }))}
        />
        <Stat
          label={t.sOverdue} value={stats.overdue} tone={stats.overdue ? "red" : "green"}
          active={f.only === "overdue"} onClick={() => setF((p) => ({ ...p, only: p.only === "overdue" ? "" : "overdue" }))}
        />
        <Stat label={t.sLast} value={showDate(stats.last)} />
      </Stats>

      <Panel className="pgk-noprint">
        <div className="pgk-grid">
          <Field label={t.search} wide>
            <input className="pgk-in" value={f.q} onChange={set("q")} placeholder={t.searchPh} />
          </Field>
          <Field label={t.branch}>
            <select className="pgk-in" value={f.branch} onChange={set("branch")}>
              <option value="">{t.all}</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label={t.municipality}>
            <select className="pgk-in" value={f.municipality} onChange={set("municipality")}>
              <option value="">{t.all}</option>
              {municipalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label={t.outcome}>
            <select className="pgk-in" value={f.outcome} onChange={set("outcome")}>
              <option value="">{t.all}</option>
              {OUTCOMES.map((o) => <option key={o.id} value={o.id}>{isAr ? o.ar : o.en}</option>)}
            </select>
          </Field>
          <Field label={t.from}>
            <input className="pgk-in" type="date" value={f.from} max={f.to || undefined} onChange={set("from")} />
          </Field>
          <Field label={t.to}>
            <input className="pgk-in" type="date" value={f.to} min={f.from || undefined} onChange={set("to")} />
          </Field>
          <Field label={t.sort}>
            <select className="pgk-in" value={f.sort} onChange={set("sort")}>
              <option value="new">{t.sortNew}</option>
              <option value="old">{t.sortOld}</option>
              <option value="branch">{t.sortBranch}</option>
              <option value="open">{t.sortOpen}</option>
            </select>
          </Field>
        </div>
        <div className="pgk-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <Pill tone="blue">
            {t.shown(filtered.length, items.length)}
            {f.only === "open" ? ` · ${t.onlyOpen}` : f.only === "overdue" ? ` · ${t.onlyOverdue}` : ""}
          </Pill>
          <span className="pgk-actions">
            {filtersOn && <Btn small onClick={() => setF(EMPTY_FILTERS)}>✕ {t.clear}</Btn>}
            <Btn small onClick={exportCsv} disabled={!filtered.length}>⬇ {t.exportCsv}</Btn>
            <Btn small onClick={() => window.print()}>🖨 {t.print}</Btn>
          </span>
        </div>
      </Panel>

      {loading ? (
        <Note>{t.loading}</Note>
      ) : err ? (
        <Note error><b>{t.loadErr}</b> {err}</Note>
      ) : filtered.length === 0 ? (
        <Note>{items.length ? t.none : t.empty}</Note>
      ) : (
        <div className="pgk-cards">
          {filtered.map((it) => {
            const nOpen = openFindings(it).length;
            const nOver = overdueFindings(it, today).length;
            const outcome = OUTCOMES.find((o) => o.id === it.outcome);
            return (
              <button key={it.id} type="button" className="pgk-rec" onClick={() => { setLightbox(null); setOpenId(it.id); }}>
                <div className="pgk-rec-top">
                  <span className="pgk-rec-t">{it.branchName || "—"}</span>
                  {it.inspectionGrade && <Pill tone={gradeTone(it.inspectionGrade)}>{it.inspectionGrade}</Pill>}
                </div>
                <div className="pgk-rec-m">
                  📅 {showDate(it.inspectionDate)} · {it.municipality || "—"}
                  {it.visitType ? ` · ${listLabel(VISIT_TYPES, it.visitType, lang)}` : ""}
                </div>
                {it.notes && <div className="pgk-rec-n">{it.notes}</div>}
                <div className="pgk-rec-foot">
                  {outcome && <Pill tone={outcome.tone}>{isAr ? outcome.ar : outcome.en}</Pill>}
                  {nOver > 0 && <Pill tone="red">{t.nOverdue(nOver)}</Pill>}
                  {nOpen - nOver > 0 && <Pill tone="amber">{t.nOpen(nOpen - nOver)}</Pill>}
                  {it.findings.length > 0 && nOpen === 0 && <Pill tone="green">{t.allClosed}</Pill>}
                  {it.images.length > 0 && <Pill>{t.nImages(it.images.length)}</Pill>}
                  {it.pdfs.length > 0 && <Pill>{t.nPdfs(it.pdfs.length)}</Pill>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={!!openItem}
        lang={lang}
        onClose={() => { if (lightbox == null) setOpenId(null); }} // Escape closes the photo viewer first
        title={openItem ? `${openItem.branchName || "—"} · ${showDate(openItem.inspectionDate)}` : ""}
      >
        {openItem && (
          <>
            <Stats>
              <Stat label={t.municipality} value={openItem.municipality || "—"} />
              <Stat label={t.grade} value={openItem.inspectionGrade || "—"} tone={gradeTone(openItem.inspectionGrade)} />
              <Stat label={t.outcome} value={listLabel(OUTCOMES, openItem.outcome, lang) || "—"} />
              <Stat label={t.visitType} value={listLabel(VISIT_TYPES, openItem.visitType, lang) || "—"} />
              {openItem.inspectorName && <Stat label={t.inspector} value={openItem.inspectorName} />}
              {openItem.referenceNo && <Stat label={t.reference} value={openItem.referenceNo} />}
              {openItem.fineAmount && <Stat label={t.fine} value={openItem.fineAmount} tone="red" />}
            </Stats>

            {openItem.notes && (
              <Panel title={t.notes}>
                <div className="pgk-rec-m" style={{ whiteSpace: "pre-wrap" }} dir="auto">{openItem.notes}</div>
              </Panel>
            )}

            <Panel title={t.findings}>
              {openItem.findings.length === 0 ? (
                <div className="pgk-hint">{t.noFindings}</div>
              ) : (
                <div className="pgk-tablewrap">
                  <table className="pgk-table">
                    <thead>
                      <tr>
                        <th>#</th><th>{t.fText}</th><th>{t.fAction}</th><th>{t.fOwner}</th><th>{t.fDue}</th><th>{t.fStatus}</th>
                        {mayEdit && <th className="pgk-noprint" />}
                      </tr>
                    </thead>
                    <tbody>
                      {openItem.findings.map((x, i) => (
                        <tr key={x.id}>
                          <td>{i + 1}</td>
                          <td dir="auto">{x.text || "—"}</td>
                          <td dir="auto">{x.action || "—"}</td>
                          <td dir="auto">{x.owner || "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{showDate(x.due)}</td>
                          <td>{findingPill(x)}</td>
                          {mayEdit && (
                            <td className="pgk-noprint">
                              <Btn small disabled={busy} onClick={() => toggleFinding(openItem, x.id)}>
                                {x.status === "closed" ? t.reopen : `✓ ${t.closeIt}`}
                              </Btn>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title={`${t.pdfs} (${openItem.pdfs.length})`}>
              {openItem.pdfs.length === 0 ? <div className="pgk-hint">{t.noFiles}</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {openItem.pdfs.map((p) => (
                    <div key={p.url} className="pgk-file">
                      <span className="pgk-file-ic" aria-hidden="true">PDF</span>
                      <span className="pgk-file-name" title={p.name}>{p.name}</span>
                      <a className="pgk-btn sm" href={p.url} target="_blank" rel="noreferrer">{t.openTab} ↗</a>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={`${t.images} (${openItem.images.length})`}>
              {openItem.images.length === 0 ? <div className="pgk-hint">{t.noFiles}</div> : (
                <div className="pgk-thumbs">
                  {openItem.images.map((img, i) => (
                    <button key={img.url} type="button" className="pgk-thumb" onClick={() => setLightbox(i)}>
                      <img src={img.url} alt={img.name} loading="lazy" />
                      <span className="pgk-thumb-cap"><span>{img.name}</span><span aria-hidden="true">⤢</span></span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <div className="pgk-actions pgk-noprint">
              {mayEdit && (
                <Btn kind="primary" onClick={() => navigate(`/haccp-iso/dm-inspection?edit=${encodeURIComponent(openItem.id)}`)}>
                  ✎ {t.edit}
                </Btn>
              )}
              {/* hidden by globals.css for accounts without the delete permission */}
              <Btn kind="danger" disabled={busy} onClick={() => removeVisit(openItem)} data-delete-action="true">🗑 {t.del}</Btn>
            </div>
          </>
        )}
      </Modal>

      {openItem && lightbox != null && (
        <ImageLightbox
          images={openItem.images}
          index={lightbox}
          title={`${openItem.branchName} · ${showDate(openItem.inspectionDate)}`}
          isAr={isAr}
          onClose={() => setLightbox(null)}
        />
      )}
    </HaccpPage>
  );
}
