// src/pages/industry-kit/settings/demo/DemoDataPanel.jsx
// Settings → «Demo data» (platform owner only). Fills a DEMO company with
// three weeks of realistic records for sales calls, and removes them again.
//
// Guards, in order:
//   1. only the super-admin sees the module (KitSettingsHub);
//   2. the company's name must say it is a demo ("Demo", «تجريبي», «ديمو»),
//      so a real customer can never be filled with invented records;
//   3. a day that already has a sheet is skipped, never overwritten;
//   4. removal deletes only records carrying payload._demo.
// The writes go through the normal /api/reports routes, so the server's
// company scoping (?company_id= of the picked company) applies as usual.

import React, { useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { reportId } from "../../../monitor/branches/_shared/reportApi";
import { Bi } from "../../i18n/bilingual";
import { kitIndustry } from "../../kitType";
import { getActiveCompany, getActiveCompanyName } from "../../../../utils/companyContext";
import { DEMO_MARK, buildDemoPlan, isDemoCompanyName } from "./demoGenerators";

const REPORTS_URL = `${String(API_BASE).replace(/\/$/, "")}/api/reports`;
const credentials = (() => {
  try { return new URL(API_BASE).origin === window.location.origin ? "include" : "omit"; } catch { return "omit"; }
})();
const PARALLEL = 4;
const DAYS = 21;

const pad2 = (n) => String(n).padStart(2, "0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

async function listType(type) {
  const res = await fetch(`${REPORTS_URL}?${new URLSearchParams({ type })}`, { cache: "no-store", credentials, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || json?.items || [];
}

/** Runs `fn` over `items`, PARALLEL at a time, reporting progress. */
async function runPool(items, fn, onTick, stopRef) {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !stopRef.current) {
      const item = items[next];
      next += 1;
      await fn(item);
      onTick();
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

const S = {
  wrap: { display: "grid", gap: 14, maxWidth: 880 },
  card: { padding: "16px 18px", borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 8px 20px rgba(15,23,42,.07)" },
  h: { margin: "0 0 6px", fontWeight: 1000, color: "#0f172a" },
  p: { margin: "4px 0", color: "#475569", fontWeight: 650, lineHeight: 1.55 },
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  btn: (bg, fg = "#fff") => ({ minHeight: 42, padding: "0 18px", borderRadius: 10, border: "none", background: bg, color: fg, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }),
  bar: { height: 10, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginTop: 12 },
  fill: (p) => ({ width: `${p}%`, height: "100%", background: "linear-gradient(90deg,#0f766e,#14b8a6)", transition: "width .2s" }),
  warn: { padding: "12px 14px", borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 800, lineHeight: 1.5 },
  ok: { padding: "12px 14px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontWeight: 800 },
  err: { padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 800 },
};

export default function DemoDataPanel() {
  const industry = kitIndustry();
  const company = getActiveCompany();
  const name = getActiveCompanyName();
  const allowed = isDemoCompanyName(name);
  const plan = useMemo(
    () => buildDemoPlan(industry, { today: todayISO(), days: DAYS, companyKey: String(company?.id || "") }),
    [industry, company?.id],
  );
  const sheets = plan.filter((p) => p.day).length;
  const registers = plan.length - sheets;

  const [busy, setBusy] = useState(null);       // "fill" | "remove" | null
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [result, setResult] = useState(null);   // { level, en, ar }
  const stopRef = useRef(false);

  const start = (kind, n) => { stopRef.current = false; setBusy(kind); setDone(0); setTotal(n); setResult(null); };
  const tick = () => setDone((d) => d + 1);

  async function fill() {
    if (!window.confirm(`Add ${plan.length} demo records to "${name}"?\nDays that already have a sheet are skipped.\n\nإضافة ${plan.length} سجل تجريبي إلى «${name}»؟`)) return;
    start("fill", plan.length);
    let added = 0; let skipped = 0; let failed = 0;
    try {
      // Registers have no date to collide on — add them only once.
      const regTypes = [...new Set(plan.filter((p) => !p.day).map((p) => p.type))];
      const hasRegs = new Set();
      for (const t of regTypes) {
        if ((await listType(t)).some((row) => row?.payload?.[DEMO_MARK])) hasRegs.add(t);
      }
      await runPool(plan, async (item) => {
        if (!item.day && hasRegs.has(item.type)) { skipped += 1; return; }
        try {
          const res = await fetch(REPORTS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials,
            body: JSON.stringify({ reporter: industry, type: item.type, payload: item.payload }),
          });
          if (res.status === 409) skipped += 1;
          else if (res.ok) added += 1;
          else failed += 1;
        } catch { failed += 1; }
      }, tick, stopRef);
      setResult(failed
        ? { level: "err", en: `${added} added, ${skipped} skipped, ${failed} failed — run it again to finish.`, ar: `أُضيف ${added}، تُخطّي ${skipped}، فشل ${failed} — أعد التشغيل للإكمال.` }
        : { level: "ok", en: `Done: ${added} records added, ${skipped} skipped (already there).`, ar: `تم: أُضيف ${added} سجل، وتُخطّي ${skipped} (موجود أصلاً).` });
    } catch (e) {
      setResult({ level: "err", en: `Stopped: ${e.message}`, ar: `توقف: ${e.message}` });
    } finally { setBusy(null); }
  }

  async function remove() {
    if (!window.confirm(`Delete every demo record of "${name}"?\nRecords typed by hand are kept.\n\nحذف كل السجلات التجريبية من «${name}»؟ السجلات المُدخلة يدوياً تبقى.`)) return;
    const types = [...new Set(plan.map((p) => p.type))];
    start("remove", types.length);
    let removed = 0; let failed = 0;
    try {
      const ids = [];
      await runPool(types, async (t) => {
        (await listType(t)).forEach((row) => { if (row?.payload?.[DEMO_MARK]) ids.push(reportId(row)); });
      }, tick, stopRef);
      setDone(0); setTotal(ids.length);
      await runPool(ids, async (id) => {
        try {
          const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE", credentials });
          if (res.ok) removed += 1; else failed += 1;
        } catch { failed += 1; }
      }, tick, stopRef);
      setResult(failed
        ? { level: "err", en: `${removed} removed, ${failed} failed — run it again.`, ar: `حُذف ${removed}، فشل ${failed} — أعد التشغيل.` }
        : { level: "ok", en: `Done: ${removed} demo records removed.`, ar: `تم: حُذف ${removed} سجل تجريبي.` });
    } catch (e) {
      setResult({ level: "err", en: `Stopped: ${e.message}`, ar: `توقف: ${e.message}` });
    } finally { setBusy(null); }
  }

  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={S.h}><Bi en="Demo data" ar="بيانات تجريبية" /></h2>
        <p style={S.p}>
          <Bi
            en={`Fills this company with the last ${DAYS} days of daily sheets (${sheets}) plus OHC cards and training certificates (${registers}) — realistic readings, a few problems caught and corrected, one open non-conformity, two OHC cards about to expire.`}
            ar={`يعبّي الشركة بأوراق آخر ${DAYS} يوم (${sheets}) مع بطاقات OHC وشهادات تدريب (${registers}) — قراءات واقعية، بعض المشاكل المكتشفة والمصحّحة، عدم مطابقة مفتوح، وبطاقتا OHC قرب الانتهاء.`}
          />
        </p>
        <p style={S.p}>
          <Bi en="All names, suppliers and numbers are invented. Each record is marked as demo, so «Remove» deletes only these." ar="كل الأسماء والموردين والأرقام وهمية. كل سجل معلَّم كتجريبي، فزر «حذف» يمسحها هي فقط." />
        </p>

        {!allowed ? (
          <div style={{ ...S.warn, marginTop: 12 }}>
            <Bi
              en={`Locked: "${name || "this company"}" is not named as a demo. Rename it to include "Demo" (Platform Center → Billing → Companies) to unlock — this keeps invented records out of real customers.`}
              ar={`مقفل: اسم «${name || "الشركة"}» لا يدل على أنها تجريبية. أضف كلمة "Demo" لاسمها (مركز المنصة ← الفوترة ← الشركات) لفتح الأداة — حتى لا تدخل بيانات وهمية لعميل حقيقي.`}
            />
          </div>
        ) : (
          <div style={S.row}>
            <button type="button" style={S.btn("linear-gradient(135deg,#0f766e,#14b8a6)")} disabled={!!busy} onClick={fill}>
              ➕ <Bi en="Fill demo data" ar="تعبئة البيانات التجريبية" />
            </button>
            <button type="button" style={S.btn("#fff", "#b91c1c")} disabled={!!busy} onClick={remove}>
              🗑️ <Bi en="Remove demo data" ar="حذف البيانات التجريبية" />
            </button>
            {busy && (
              <button type="button" style={S.btn("#e2e8f0", "#334155")} onClick={() => { stopRef.current = true; }}>
                ⏹ <Bi en="Stop" ar="إيقاف" />
              </button>
            )}
          </div>
        )}

        {busy && (
          <>
            <div style={S.bar}><div style={S.fill(pct)} /></div>
            <p style={S.p}>{done} / {total} · {pct}%</p>
          </>
        )}
      </div>

      {result && <div style={S[result.level]}><Bi en={result.en} ar={result.ar} /></div>}
    </div>
  );
}
