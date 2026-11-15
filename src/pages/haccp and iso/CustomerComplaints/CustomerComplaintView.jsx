// src/pages/haccp and iso/CustomerComplaints/CustomerComplaintView.jsx
// Customer complaints — the register: figures, trend, filters, and the full
// printable report of each complaint.
// ISO 22000:2018 clauses 7.4 (communication) and 9.1.2 (analysis).
// Design: _shared/pageKit.jsx. Lists + helpers: customerComplaintShared.js.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import { canWrite, canEdit } from "../../../utils/perms";
import { normText, matches } from "../../dashboard/dashboardSearch";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import ImageLightbox from "../_shared/ImageLightbox";
import {
  HaccpPage, Btn, Stats, Stat, Panel, Field, Pill, Note, Modal, DL, TextBlock, useToast, downloadCsv,
} from "../_shared/pageKit";
import { showDate, todayDubai } from "../dmInspectionShared";
import {
  TYPE, TYPES, SEVERITIES, STATUSES, TYPE_KEY, SEVERITY_KEY, STATUS_KEY, SEVERITY_TONE, STATUS_TONE, SEVERITY_RANK,
  TYPE_COLORS, OVERDUE_DAYS, daysBetween, openDays, isOverdue, filesOf,
} from "./customerComplaintShared";
import ComplaintTrendReportModal from "./CustomerComplaintTrendReport";

const EMPTY_FILTERS = { q: "", status: "", type: "", severity: "", branch: "", from: "", to: "", sort: "new", only: "" };

const pct = (n) => `${Math.round(Number.isFinite(n) ? n : 0)}%`;

export default function CustomerComplaintView() {
  const navigate = useNavigate();
  const { t, lang, toggle } = useHaccpLang();
  const isAr = lang === "ar";
  const L = (ar, en) => (isAr ? ar : en);
  const [toast, say] = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [f, setF] = useState(EMPTY_FILTERS);
  const [openId, setOpenId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [trendOpen, setTrendOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const mayAdd = canWrite("iso");
  const mayEdit = canEdit("iso");
  const today = todayDubai();

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => null);
      setItems(Array.isArray(json) ? json : json?.data || json?.items || []);
    } catch (e) {
      // a failed read must not look like an empty register
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const toggleOnly = (v) => setF((p) => ({ ...p, only: p.only === v ? "" : v }));
  const branches = useMemo(
    () => [...new Set(items.map((r) => r?.payload?.branch).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const filtered = useMemo(() => {
    const out = items.filter((rec) => {
      const p = rec?.payload || {};
      const status = p.status || "Open";
      if (f.status && status !== f.status) return false;
      if (f.type && (p.type || "Other") !== f.type) return false;
      if (f.severity && (p.severity || "Low") !== f.severity) return false;
      if (f.branch && p.branch !== f.branch) return false;
      const day = String(p.complaintDate || "").slice(0, 10);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
      if (f.only === "open" && status === "Closed") return false;
      if (f.only === "critical" && (status === "Closed" || p.severity !== "Critical")) return false;
      if (f.only === "overdue" && !isOverdue(p, today)) return false;
      if (!f.q.trim()) return true;
      const hay = normText([
        p.complaintNumber, p.complainant, p.contact, p.branch, p.product, p.batch, p.channel,
        p.description, p.investigation, p.rootCause, p.capa, p.capaOwner, p.closedBy,
      ].join(" "));
      return matches(hay, f.q);
    });
    const date = (r) => String(r?.payload?.complaintDate || "");
    const newest = (a, b) => (date(a) < date(b) ? 1 : date(a) > date(b) ? -1 : 0);
    if (f.sort === "old") out.sort((a, b) => -newest(a, b));
    else if (f.sort === "severity") out.sort((a, b) => (SEVERITY_RANK[a?.payload?.severity] ?? 9) - (SEVERITY_RANK[b?.payload?.severity] ?? 9) || newest(a, b));
    else if (f.sort === "waiting") out.sort((a, b) => (openDays(b?.payload, today) ?? -1) - (openDays(a?.payload, today) ?? -1) || newest(a, b));
    else out.sort(newest);
    return out;
  }, [items, f, today]);

  /* Headline figures are of the whole register, so they do not move with the filters. */
  const stats = useMemo(() => {
    const month = today.slice(0, 7);
    let open = 0, closed = 0, critical = 0, overdue = 0, mtd = 0, satYes = 0, satAll = 0;
    const days = [];
    items.forEach((rec) => {
      const p = rec?.payload || {};
      if (p.status === "Closed") {
        closed += 1;
        const d = daysBetween(p.complaintDate, p.closureDate);
        if (d != null && p.closureDate) days.push(d);
      } else {
        open += 1;
        if (p.severity === "Critical") critical += 1;
        if (isOverdue(p, today)) overdue += 1;
      }
      if (String(p.complaintDate || "").startsWith(month)) mtd += 1;
      if (p.customerSatisfied === "Yes") { satYes += 1; satAll += 1; } else if (p.customerSatisfied === "No") satAll += 1;
    });
    return {
      total: items.length, open, closed, critical, overdue, mtd,
      avgDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
      satisfaction: satAll ? (satYes / satAll) * 100 : null,
      closure: items.length ? (closed / items.length) * 100 : 0,
    };
  }, [items, today]);

  /* last 12 months + share per type */
  const trend = useMemo(() => {
    const months = [];
    const [y, m] = today.split("-").map(Number);
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      months.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString(isAr ? "ar" : "en", { month: "short", timeZone: "UTC" }),
        count: 0,
      });
    }
    const byType = {};
    items.forEach((rec) => {
      const p = rec?.payload || {};
      const hit = months.find((x) => x.key === String(p.complaintDate || "").slice(0, 7));
      if (hit) hit.count += 1;
      const k = TYPES.includes(p.type) ? p.type : "Other";
      byType[k] = (byType[k] || 0) + 1;
    });
    return {
      months,
      max: Math.max(1, ...months.map((x) => x.count)),
      types: Object.entries(byType).map(([type, count]) => ({ type, count, share: Math.round((count / (items.length || 1)) * 100) })).sort((a, b) => b.count - a.count),
    };
  }, [items, today, isAr]);

  const filtersOn = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS);
  const openRec = items.find((r) => r.id === openId) || null;
  const op = openRec?.payload || {};
  const opImages = filesOf(op.images);
  const opPdfs = filesOf(op.pdfs);

  const typeLabel = (v) => (TYPE_KEY[v] ? t(TYPE_KEY[v]) : v || "—");
  const sevLabel = (v) => (SEVERITY_KEY[v] ? t(SEVERITY_KEY[v]) : v || "—");
  const statusLabel = (v) => t(STATUS_KEY[v] || STATUS_KEY.Open);
  const satLabel = (v) => (v === "Yes" ? t("ccCustomerSatisfiedYes") : v === "No" ? t("ccCustomerSatisfiedNo") : t("ccCustomerSatisfiedPending"));
  const effLabel = (v) => (v === "Yes" ? L("فعّال", "Effective") : v === "No" ? L("غير فعّال — تكررت المشكلة", "Not effective — it recurred") : L("قيد المراجعة", "Pending"));
  const nDays = (n) => (isAr ? `${n} يوم` : `${n} day${n === 1 ? "" : "s"}`);

  async function remove(rec) {
    if (!rec?.id || busy || !window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rec.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.id !== rec.id));
      setOpenId(null);
      say(L("تم حذف الشكوى.", "Complaint deleted."), "ok");
    } catch (e) {
      say(`${t("deleteError")}: ${e?.message || e}`, "err");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = [
      "Complaint No.", "Date", "Branch", "Customer", "Contact", "Channel", "Product", "Batch", "Type", "Severity",
      "Description", "Investigation", "Root Cause", "CAPA", "Action Owner", "Action Due",
      "Status", "Days Open", "Closure Date", "Closed By", "Resolution Days", "Customer Satisfied",
      "Effectiveness", "Verified By", "Verified Date", "Photos", "PDFs",
    ];
    const rows = filtered.map((rec) => {
      const p = rec?.payload || {};
      return [
        p.complaintNumber, p.complaintDate, p.branch, p.complainant, p.contact, p.channel, p.product, p.batch, p.type, p.severity,
        p.description, p.investigation, p.rootCause, p.capa, p.capaOwner, p.capaDue,
        p.status || "Open", openDays(p, today) ?? "", p.closureDate, p.closedBy,
        p.status === "Closed" ? daysBetween(p.complaintDate, p.closureDate) ?? "" : "", p.customerSatisfied,
        p.effectivenessVerified, p.effectivenessVerifiedBy, p.effectivenessVerifiedDate,
        filesOf(p.images).length, filesOf(p.pdfs).length,
      ];
    });
    downloadCsv(`customer-complaints-${today}.csv`, header, rows);
  }

  return (
    <HaccpPage
      lang={lang}
      icon="📞"
      title={L("شكاوى العملاء", "Customer Complaints")}
      sub={L("كل شكوى: السبب الجذري والإجراء التصحيحي والتحقق من فاعليته، مع تحليل الاتجاهات.", "Every complaint: root cause, corrective action and its verification, with trend analysis.")}
      clause={L("البندان 7.4 و9.1.2", "ISO 7.4 · 9.1.2")}
      actions={
        <>
          <HaccpLangToggle lang={lang} toggle={toggle} />
          <Btn onClick={load} disabled={loading}>{loading ? "⏳" : `↻ ${L("تحديث", "Refresh")}`}</Btn>
          <Btn onClick={() => setTrendOpen(true)} disabled={!items.length}>📈 {L("تحليل الاتجاهات", "Trend analysis")}</Btn>
          {mayAdd && <Btn kind="primary" onClick={() => navigate("/haccp-iso/customer-complaints")}>{L("+ شكوى جديدة", "+ New complaint")}</Btn>}
        </>
      }
    >
      {toast}

      <Stats>
        <Stat label={L("إجمالي الشكاوى", "Total complaints")} value={stats.total} tone="blue" />
        <Stat label={L("مفتوحة", "Open")} value={stats.open} tone={stats.open ? "amber" : "green"} active={f.only === "open"} onClick={() => toggleOnly("open")} />
        <Stat label={L("حرجة مفتوحة", "Critical, open")} value={stats.critical} tone={stats.critical ? "red" : "green"} active={f.only === "critical"} onClick={() => toggleOnly("critical")} />
        <Stat
          label={L(`مفتوحة منذ أكثر من ${OVERDUE_DAYS} يومًا`, `Open more than ${OVERDUE_DAYS} days`)}
          value={stats.overdue} tone={stats.overdue ? "red" : "green"} active={f.only === "overdue"} onClick={() => toggleOnly("overdue")}
        />
        <Stat label={L("هذا الشهر", "This month")} value={stats.mtd} />
        <Stat label={L("متوسط زمن الإغلاق", "Average time to close")} value={stats.avgDays != null ? nDays(stats.avgDays) : "—"} />
        <Stat label={L("رضا العملاء", "Customer satisfaction")} value={stats.satisfaction != null ? pct(stats.satisfaction) : "—"} />
        <Stat label={L("نسبة الإغلاق", "Closure rate")} value={pct(stats.closure)} />
      </Stats>

      {items.length > 0 && (
        <Panel className="pgk-noprint">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 20 }}>
            <div>
              <div className="pgk-sub" style={{ marginTop: 0 }}>{L("الشكاوى في آخر 12 شهرًا", "Complaints in the last 12 months")}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110, paddingTop: 18 }}>
                {trend.months.map((mo) => (
                  <div key={mo.key} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}>
                    <div className="pgk-hint" style={{ marginTop: 0, color: "#1d4ed8", fontWeight: 800 }}>{mo.count || ""}</div>
                    <div
                      title={`${mo.label}: ${mo.count}`}
                      style={{ width: "100%", height: `${Math.max(3, (mo.count / trend.max) * 100)}%`, minHeight: 3, borderRadius: "5px 5px 0 0", background: mo.count ? "#3b82f6" : "#dbeafe" }}
                    />
                    <div className="pgk-hint" style={{ marginTop: 3 }}>{mo.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="pgk-sub" style={{ marginTop: 0 }}>{L("الشكاوى حسب النوع", "Complaints by type")}</div>
              <div style={{ display: "grid", gap: 7 }}>
                {trend.types.map((x) => (
                  <button
                    key={x.type}
                    type="button"
                    onClick={() => setF((p) => ({ ...p, type: p.type === x.type ? "" : x.type }))}
                    title={L("فلترة بهذا النوع", "Filter by this type")}
                    style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr) auto", gap: 8, alignItems: "center", border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "start", fontFamily: "inherit" }}
                  >
                    <span className="pgk-rec-m" style={{ fontWeight: f.type === x.type ? 900 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[x.type] || "#64748b", marginInlineEnd: 6 }} />
                      {typeLabel(x.type)}
                    </span>
                    <span style={{ height: 7, background: "#eef2f7", borderRadius: 999, overflow: "hidden" }}>
                      <span style={{ display: "block", width: `${x.share}%`, height: "100%", background: TYPE_COLORS[x.type] || "#64748b" }} />
                    </span>
                    <span className="pgk-hint" style={{ marginTop: 0 }}>{x.count} · {x.share}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}

      <Panel className="pgk-noprint">
        <div className="pgk-grid">
          <Field label={L("بحث", "Search")} wide>
            <input className="pgk-in" value={f.q} onChange={set("q")} placeholder={L("الرقم، العميل، المنتج، الدفعة، الوصف…", "Number, customer, product, batch, description…")} />
          </Field>
          <Field label={t("ccStatus")}>
            <select className="pgk-in" value={f.status} onChange={set("status")}>
              <option value="">{L("الكل", "All")}</option>
              {STATUSES.map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
            </select>
          </Field>
          <Field label={t("ccType")}>
            <select className="pgk-in" value={f.type} onChange={set("type")}>
              <option value="">{L("الكل", "All")}</option>
              {TYPES.map((x) => <option key={x} value={x}>{typeLabel(x)}</option>)}
            </select>
          </Field>
          <Field label={t("ccSeverity")}>
            <select className="pgk-in" value={f.severity} onChange={set("severity")}>
              <option value="">{L("الكل", "All")}</option>
              {SEVERITIES.map((x) => <option key={x} value={x}>{sevLabel(x)}</option>)}
            </select>
          </Field>
          {branches.length > 0 && (
            <Field label={L("الفرع", "Branch")}>
              <select className="pgk-in" value={f.branch} onChange={set("branch")}>
                <option value="">{L("الكل", "All")}</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          )}
          <Field label={L("من", "From")}>
            <input className="pgk-in" type="date" value={f.from} max={f.to || undefined} onChange={set("from")} />
          </Field>
          <Field label={L("إلى", "To")}>
            <input className="pgk-in" type="date" value={f.to} min={f.from || undefined} onChange={set("to")} />
          </Field>
          <Field label={L("الترتيب", "Sort by")}>
            <select className="pgk-in" value={f.sort} onChange={set("sort")}>
              <option value="new">{L("الأحدث أولًا", "Newest first")}</option>
              <option value="old">{L("الأقدم أولًا", "Oldest first")}</option>
              <option value="severity">{L("الأخطر أولًا", "Most severe first")}</option>
              <option value="waiting">{L("الأطول انتظارًا", "Longest open")}</option>
            </select>
          </Field>
        </div>
        <div className="pgk-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <Pill tone="blue">{L(`${filtered.length} من ${items.length} شكوى`, `${filtered.length} of ${items.length} complaints`)}</Pill>
          <span className="pgk-actions">
            {filtersOn && <Btn small onClick={() => setF(EMPTY_FILTERS)}>✕ {L("مسح الفلاتر", "Clear filters")}</Btn>}
            <Btn small onClick={exportCsv} disabled={!filtered.length}>⬇ {L("تصدير Excel (CSV)", "Export Excel (CSV)")}</Btn>
            <Btn small onClick={() => window.print()} disabled={!filtered.length}>🖨 {L("طباعة", "Print")}</Btn>
          </span>
        </div>
      </Panel>

      {loading ? (
        <Note>{t("loading")}</Note>
      ) : err ? (
        <Note error><b>{L("تعذّر تحميل الشكاوى.", "Could not load the complaints.")}</b> {err}</Note>
      ) : filtered.length === 0 ? (
        <Note>{items.length ? L("لا توجد شكوى مطابقة للفلاتر.", "No complaint matches the filters.") : L("لم تُسجَّل أي شكوى بعد.", "No complaint has been logged yet.")}</Note>
      ) : (
        <div className="pgk-cards">
          {filtered.map((rec) => {
            const p = rec?.payload || {};
            const status = p.status || "Open";
            const waiting = openDays(p, today);
            const closedIn = status === "Closed" && p.closureDate ? daysBetween(p.complaintDate, p.closureDate) : null;
            const nFiles = filesOf(p.images).length + filesOf(p.pdfs).length;
            return (
              <button key={rec.id} type="button" className="pgk-rec" onClick={() => { setLightbox(null); setOpenId(rec.id); }}>
                <div className="pgk-rec-top">
                  <span className="pgk-rec-t" dir="auto">{p.complainant || "—"}</span>
                  <Pill tone={STATUS_TONE[status] || "amber"}>{statusLabel(status)}</Pill>
                </div>
                <div className="pgk-rec-m">
                  {p.complaintNumber || "CC"} · {showDate(p.complaintDate)}
                  {p.branch ? ` · ${p.branch}` : ""}
                  {p.product ? ` · ${p.product}` : ""}
                </div>
                {p.description && <div className="pgk-rec-n" dir="auto">{p.description}</div>}
                <div className="pgk-rec-foot">
                  <Pill tone={SEVERITY_TONE[p.severity] || "grey"}>{sevLabel(p.severity)}</Pill>
                  <Pill>{typeLabel(p.type)}</Pill>
                  {waiting != null && <Pill tone={waiting > OVERDUE_DAYS ? "red" : "grey"}>{L(`مفتوحة منذ ${nDays(waiting)}`, `Open ${nDays(waiting)}`)}</Pill>}
                  {closedIn != null && <Pill tone="green">{L(`أُغلقت خلال ${nDays(closedIn)}`, `Closed in ${nDays(closedIn)}`)}</Pill>}
                  {p.customerSatisfied === "No" && <Pill tone="red">{L("العميل غير راضٍ", "Customer not satisfied")}</Pill>}
                  {nFiles > 0 && <Pill>📎 {nFiles}</Pill>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* the full report — printing while it is open prints this report only */}
      <Modal
        open={!!openRec}
        lang={lang}
        printable
        onClose={() => { if (lightbox == null) setOpenId(null); }}
        title={openRec ? `${op.complaintNumber || "CC"} · ${showDate(op.complaintDate)}` : ""}
        actions={<Btn small onClick={() => window.print()}>🖨 {L("طباعة", "Print")}</Btn>}
      >
        {openRec && (
          <>
            <div className="pgk-actions" style={{ justifyContent: "flex-start" }}>
              <Pill tone={STATUS_TONE[op.status || "Open"]}>{statusLabel(op.status || "Open")}</Pill>
              <Pill tone={SEVERITY_TONE[op.severity] || "grey"}>{sevLabel(op.severity)}</Pill>
              <Pill>{typeLabel(op.type)}</Pill>
              {isOverdue(op, today) && <Pill tone="red">{L(`مفتوحة منذ ${nDays(openDays(op, today))}`, `Open ${nDays(openDays(op, today))}`)}</Pill>}
            </div>

            <Panel title={L("بيانات الشكوى", "Complaint details")}>
              <DL rows={[
                [t("ccNumber"), op.complaintNumber],
                [L("التاريخ", "Date"), showDate(op.complaintDate)],
                [L("العميل / الجهة", "Customer / party"), op.complainant],
                [L("رقم التواصل", "Contact number"), op.contact],
                [L("الفرع", "Branch"), op.branch],
                [t("ccChannel"), op.channel],
                [t("ccProduct"), op.product],
                [t("ccBatch"), op.batch],
              ]} />
              <TextBlock label={L("وصف الشكوى", "Complaint description")} text={op.description} />
            </Panel>

            <Panel title={L("التحقيق والإجراء التصحيحي", "Investigation & corrective action")}>
              <TextBlock label={t("ccInvestigation")} text={op.investigation} />
              <TextBlock label={t("ccRootCause")} text={op.rootCause} />
              <TextBlock label={t("ccCAPA")} text={op.capa} />
              <DL rows={[
                [L("مسؤول الإجراء", "Action owner"), op.capaOwner],
                [L("تاريخ الاستحقاق", "Action due date"), op.capaDue ? showDate(op.capaDue) : ""],
              ]} />
            </Panel>

            <Panel title={L("التحقق من الفاعلية والإغلاق", "Effectiveness & closure")}>
              <DL rows={[
                [L("نتيجة التحقق", "Verification result"), effLabel(op.effectivenessVerified)],
                [L("تاريخ التحقق", "Verification date"), op.effectivenessVerifiedDate ? showDate(op.effectivenessVerifiedDate) : ""],
                [L("تم التحقق بواسطة", "Verified by"), op.effectivenessVerifiedBy],
                [t("ccClosureDate"), op.closureDate ? showDate(op.closureDate) : ""],
                [t("ccClosedBy"), op.closedBy],
                [L("زمن الإغلاق", "Time to close"), op.status === "Closed" && op.closureDate ? nDays(daysBetween(op.complaintDate, op.closureDate) ?? 0) : ""],
                [L("رضا العميل", "Customer satisfied"), satLabel(op.customerSatisfied)],
              ]} />
              {op.effectivenessNotes && <TextBlock label={L("ملاحظات / دليل الفاعلية", "Notes / evidence")} text={op.effectivenessNotes} />}
            </Panel>

            <Panel title={`${L("المرفقات", "Attachments")} (${opImages.length + opPdfs.length})`}>
              {opImages.length + opPdfs.length === 0 && <div className="pgk-hint">{L("لا مرفقات.", "Nothing attached.")}</div>}
              {opPdfs.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginBottom: opImages.length ? 12 : 0 }}>
                  {opPdfs.map((p) => (
                    <div key={p.url} className="pgk-file">
                      <span className="pgk-file-ic" aria-hidden="true">PDF</span>
                      <span className="pgk-file-name" title={p.name}>{p.name}</span>
                      <a className="pgk-btn sm pgk-noprint" href={p.url} target="_blank" rel="noreferrer">{L("فتح", "Open")} ↗</a>
                    </div>
                  ))}
                </div>
              )}
              {opImages.length > 0 && (
                <div className="pgk-thumbs">
                  {opImages.map((img, i) => (
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
                <Btn kind="primary" onClick={() => navigate(`/haccp-iso/customer-complaints?edit=${encodeURIComponent(openRec.id)}`)}>
                  ✎ {t("edit")}
                </Btn>
              )}
              {/* hidden by globals.css for accounts without the delete permission */}
              <Btn kind="danger" disabled={busy} onClick={() => remove(openRec)} data-delete-action="true">🗑 {t("del")}</Btn>
            </div>
          </>
        )}
      </Modal>

      {openRec && lightbox != null && (
        <ImageLightbox
          images={opImages}
          index={lightbox}
          title={`${op.complaintNumber || "CC"} · ${op.complainant || ""}`}
          isAr={isAr}
          onClose={() => setLightbox(null)}
        />
      )}

      {trendOpen && <ComplaintTrendReportModal items={items} onClose={() => setTrendOpen(false)} isAr={isAr} />}
      {/* while the trend report is open, printing prints that report only */}
      {trendOpen && (
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .cc-trend-print, .cc-trend-print * { visibility: visible !important; }
            .cc-trend-print {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 100% !important; max-width: none !important;
              box-shadow: none !important; border: 0 !important; border-radius: 0 !important;
            }
            .cc-trend-noprint { display: none !important; }
          }
        `}</style>
      )}
    </HaccpPage>
  );
}
