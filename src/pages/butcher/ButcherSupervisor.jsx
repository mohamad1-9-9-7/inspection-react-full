// src/pages/butcher/ButcherSupervisor.jsx
//
// لوحة المشرف — كروت الجزارين الفعليين مع فلاتر، وشو اشتغل كل واحد،
// وقبول أو رفض تقاريره (مع سبب إلزامي عند الرفض).
// Supervisor board: butcher cards, filters, per-report approve / reject.
//
// حالة المراجعة تُحفظ داخل payload.review للسجل نفسه:
//   review = { status: "approved" | "rejected", by, at, reason }
// غياب review = بانتظار المراجعة.
//
// ملاحظة تقنية: butcher_cut_log نوع متعدّد السجلات باليوم، فالتحديث لازم يكون
// على PATCH /api/reports/:id (لا PUT العام الذي يدهس حسب (type, reportDate)).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { BRANCHES, TYPE, nameOf } from "./butcherOptions";
import { butcherLabel, useButcherConfig } from "./butcherConfig";
import { useMrpConfig } from "./butcherMrpBridge";
import { normalizeRecord } from "./butcherReportKit";
import {
  fetchPlans, fetchTodayProgressByBranch, progressPct, savePlan,
} from "./butcherDayPlan";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import { can } from "../../utils/perms";

const CSS = `
#root .bs, #root .bs * { font-size: 18px !important; }
#root .bs-title  { font-size: 34px !important; }
#root .bs-sub    { font-size: 16px !important; }
#root .bs-kpi    { font-size: 38px !important; }
#root .bs-name   { font-size: 23px !important; }
#root .bs-stat   { font-size: 26px !important; }
#root .bs-chip   { font-size: 15px !important; }
#root .bs-small  { font-size: 15px !important; }
@media (max-width: 1100px) {
  #root .bs, #root .bs * { font-size: 16px !important; }
  #root .bs-title { font-size: 26px !important; }
  #root .bs-kpi   { font-size: 30px !important; }
  #root .bs-name  { font-size: 20px !important; }
  #root .bs-stat  { font-size: 22px !important; }
}
@media (max-width: 820px) {
  #root .bs, #root .bs * { font-size: 15px !important; }
  #root .bs-title { font-size: 23px !important; }
  #root .bs-kpi   { font-size: 26px !important; }
  #root .bs-name  { font-size: 18px !important; }
  #root .bs-stat  { font-size: 20px !important; }
}
#root .bs-card { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
#root .bs-card:hover { transform: translateY(-3px); box-shadow: 0 20px 44px rgba(15,39,64,.14); }
@keyframes bsRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
#root .bs-rise { animation: bsRise .24s ease both; }
`;

const STATUS = {
  pending:  { ar: "بانتظار المراجعة", en: "Pending",  bg: "#fff7ed", fg: "#b45309", bd: "#fcd9a4" },
  approved: { ar: "مقبول",            en: "Approved", bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
  rejected: { ar: "مرفوض",            en: "Rejected", bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function shiftDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/** أول حرفين من الاسم — بديل الصورة الشخصية. */
function initials(name, empNo) {
  const s = String(name || "").trim();
  if (!s) return String(empNo || "?").slice(0, 2);
  const parts = s.split(/\s+/).filter(Boolean);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/* ============================ الصفحة ============================ */

export default function ButcherSupervisor() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const { cfg: mrpCfg } = useMrpConfig({ refetchOnFocus: false });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  /* الفلاتر */
  const [period, setPeriod] = useState("today");   // today | 7d | 30d | custom
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");        // "" | pending | approved | rejected
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("pending"); // pending | kg | count | name

  /* البطاقة المفتوحة + نافذة الرفض */
  const [openEmp, setOpenEmp] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { id, reason }

  const canReview = can("butcher", "edit") || can("butcher", "write");

  /* ── تحميل السجلات ── */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // نافذة الفلتر فقط — الخوادم الأقدم تتجاهل from/to وترجّع الكل، والفلترة
      // المحلية تحت تضبط النتيجة في الحالتين
      const range = [
        from ? `&from=${encodeURIComponent(from)}` : "",
        to ? `&to=${encodeURIComponent(to)}` : "",
      ].join("");
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000${range}`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setRecords(toArray(await res.json()));
    } catch (e) {
      setError(e?.message || t({ en: "Failed to load data", ar: "تعذّر تحميل البيانات" }));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [t, from, to]);

  useEffect(() => { load(); }, [load]);

  /* الفترة السريعة تضبط from/to */
  useEffect(() => {
    if (period === "today") { setFrom(todayStr()); setTo(todayStr()); }
    if (period === "7d") { setFrom(shiftDays(6)); setTo(todayStr()); }
    if (period === "30d") { setFrom(shiftDays(29)); setTo(todayStr()); }
  }, [period]);

  /* ── تحويل كل سجل لشكل جاهز للعرض (نفس تطبيع عُدّة التقارير) ── */
  const entries = useMemo(
    () =>
      records.map((rec) => {
        const r = normalizeRecord(rec, { cfg, mrpCfg, isAr });
        return {
          ...r,
          empNo: r.employeeNoRaw,
          butcherJob: r.payload.butcherJob || "",
          // اسم مختصر للسياق: الوصفة أو المادة الخام
          productsKg: r.cutsKg,
          reviewStatus: r.reviewStatus || "pending",
        };
      }),
    [records, cfg, mrpCfg, isAr]
  );

  /* ── تطبيق الفلاتر ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (from && e.day && e.day < from) return false;
      if (to && e.day && e.day > to) return false;
      if (branch && e.branchCode !== branch) return false;
      if (status && e.reviewStatus !== status) return false;
      if (q && !`${e.empNo} ${e.butcherName} ${e.branchName}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [entries, from, to, branch, status, query]);

  /* ── تجميع حسب الجزّار: كرت لكل واحد ── */
  const butchers = useMemo(() => {
    const map = new Map();

    filtered.forEach((e) => {
      const key = e.empNo || "—";
      if (!map.has(key)) {
        map.set(key, {
          empNo: key,
          name: e.butcherName || butcherLabel(cfg, key),
          job: e.butcherJob || "",
          branches: new Set(),
          rows: [],
          kg: 0, productsKg: 0, wasteKg: 0, baseKg: 0,
          pending: 0, approved: 0, rejected: 0,
          lastAt: "",
        });
      }
      const b = map.get(key);
      b.rows.push(e);
      if (e.branchName && e.branchName !== "—") b.branches.add(e.branchName);
      b.productsKg += e.productsKg;
      b.wasteKg += e.wasteKg;
      b.baseKg += e.baseKg;
      b.kg += e.productsKg + e.wasteKg;
      b[e.reviewStatus] += 1;
      const stamp = `${e.day} ${e.time}`;
      if (stamp > b.lastAt) b.lastAt = stamp;
      if (!b.job && e.butcherJob) b.job = e.butcherJob;
    });

    const list = [...map.values()].map((b) => ({
      ...b,
      branchList: [...b.branches],
      count: b.rows.length,
      yieldPct: pct(b.productsKg, b.baseKg),
      wastePct: pct(b.wasteKg, b.baseKg),
      rows: b.rows.sort((x, y) => `${y.day} ${y.time}`.localeCompare(`${x.day} ${x.time}`)),
    }));

    return list.sort((a, b) => {
      if (sortKey === "kg") return b.kg - a.kg;
      if (sortKey === "count") return b.count - a.count;
      if (sortKey === "name") return String(a.name).localeCompare(String(b.name));
      // الافتراضي: الأكثر انتظاراً للمراجعة أولاً
      if (b.pending !== a.pending) return b.pending - a.pending;
      return b.kg - a.kg;
    });
  }, [filtered, cfg, sortKey]);

  /* مؤشرات أعلى الصفحة */
  const kpi = useMemo(() => ({
    butchers: butchers.length,
    carcasses: filtered.length,
    kg: filtered.reduce((s, e) => s + e.productsKg + e.wasteKg, 0),
    pending: filtered.filter((e) => e.reviewStatus === "pending").length,
  }), [butchers, filtered]);

  /* ── حفظ المراجعة (قبول / رفض) ── */
  const saveReview = useCallback(async (entry, nextStatus, reason = "") => {
    if (!canReview || busyId) return;
    setBusyId(entry.id);
    setError("");
    try {
      const review = {
        status: nextStatus,
        by: currentUser().username || currentUser().name || "supervisor",
        at: new Date().toISOString(),
        reason: nextStatus === "rejected" ? String(reason || "").trim() : "",
      };
      // PATCH على معرّف السجل — الـ PUT العام يدهس حسب (type, reportDate)
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ payload: { ...entry.payload, review } }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);

      // حدّث النسخة المحلية بلا إعادة تحميل كامل
      setRecords((prev) =>
        prev.map((r) =>
          (r.id ?? r._id) === entry.id
            ? { ...r, payload: { ...(r.payload || {}), review } }
            : r
        )
      );
    } catch (e) {
      setError(e?.message || t({ en: "Review failed", ar: "تعذّر حفظ المراجعة" }));
    } finally {
      setBusyId(null);
    }
  }, [canReview, busyId, t]);

  /* قبول كل ما هو بانتظار المراجعة لجزّار */
  const approveAll = async (b) => {
    const pendingRows = b.rows.filter((r) => r.reviewStatus === "pending");
    if (!pendingRows.length) return;
    const ok = window.confirm(
      t({
        en: `Approve all ${pendingRows.length} pending report(s) for ${b.name}?`,
        ar: `قبول كل التقارير المعلّقة (${pendingRows.length}) للجزّار ${b.name}؟`,
      })
    );
    if (!ok) return;
    for (const row of pendingRows) {
      // بالتسلسل حتى لا نضرب السيرفر بعشرات الطلبات دفعة واحدة
      // eslint-disable-next-line no-await-in-loop
      await saveReview(row, "approved");
    }
  };

  if (!canOpenButcherPage("butcher.supervisor")) return <NoAccess page="butcher.supervisor" />;

  const KG = t({ en: "kg", ar: "كجم" });
  const openButcher = butchers.find((b) => b.empNo === openEmp) || null;

  return (
    <div dir={dir} className="bs" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>

        {/* ── الترويسة ── */}
        <div style={S.header}>
          <div>
            <div className="bs-title" style={S.title}>
              🧑‍🍳 {t({ en: "Supervisor Board", ar: "لوحة المشرف" })}
            </div>
            <div className="bs-sub" style={S.sub}>
              {t({
                en: "What every butcher worked on — review, approve or reject",
                ar: "شو اشتغل كل جزّار — مراجعة وقبول أو رفض",
              })}
            </div>
          </div>
          <div style={S.headerBtns}>
            <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            <button type="button" style={S.btn} onClick={load} disabled={loading}>
              {loading ? t({ en: "Loading…", ar: "جارٍ التحميل…" }) : `↻ ${t({ en: "Refresh", ar: "تحديث" })}`}
            </button>
            <button type="button" style={S.btn} onClick={() => navigate("/butcher", { replace: true })}>
              {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {!canReview && (
          <div style={S.noteBar}>
            👁️ {t({
              en: "View only — approving or rejecting needs edit rights on the Butcher section.",
              ar: "عرض فقط — القبول والرفض بحاجة صلاحية تعديل على قسم الجزار.",
            })}
          </div>
        )}
        {error && <div style={S.errorBar}>⚠️ {error}</div>}

        {/* ── المؤشرات ── */}
        <div style={S.kpiRow}>
          <Kpi label={t({ en: "Butchers", ar: "الجزارون" })} value={kpi.butchers} tone="#1f6fd0" />
          <Kpi label={t({ en: "Carcasses", ar: "الذبائح" })} value={kpi.carcasses} tone="#0f766e" />
          <Kpi label={`${t({ en: "Total", ar: "الإجمالي" })} ${KG}`} value={kpi.kg.toFixed(1)} tone="#7c3aed" />
          <Kpi label={t({ en: "Pending review", ar: "بانتظار المراجعة" })} value={kpi.pending} tone="#b45309" />
        </div>

        {/* ── خطة اليوم: هدف كل ملحمة والإنجاز عليه ── */}
        <DayPlanPanel t={t} isAr={isAr} canEdit={canReview} KG={KG} />

        {/* ── الفلاتر ── */}
        <div style={S.filters}>
          <div style={S.chipRow}>
            {[
              { id: "today", ar: "اليوم", en: "Today" },
              { id: "7d", ar: "٧ أيام", en: "7 days" },
              { id: "30d", ar: "٣٠ يوم", en: "30 days" },
              { id: "custom", ar: "مدى مخصّص", en: "Custom" },
            ].map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setPeriod(x.id)}
                style={{ ...S.chipBtn, ...(period === x.id ? S.chipBtnOn : null) }}
              >
                {t(x)}
              </button>
            ))}
          </div>

          <div style={S.filterGrid}>
            {period === "custom" && (
              <>
                <Field label={t({ en: "From", ar: "من" })}>
                  <input type="date" value={from} max={todayStr()}
                    onChange={(e) => setFrom(e.target.value)} style={S.input} />
                </Field>
                <Field label={t({ en: "To", ar: "إلى" })}>
                  <input type="date" value={to} max={todayStr()}
                    onChange={(e) => setTo(e.target.value)} style={S.input} />
                </Field>
              </>
            )}
            <Field label={t({ en: "Butchery", ar: "الملحمة" })}>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                ))}
              </select>
            </Field>
            <Field label={t({ en: "Review status", ar: "حالة المراجعة" })}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {Object.entries(STATUS).map(([id, s]) => (
                  <option key={id} value={id}>{isAr ? s.ar : s.en}</option>
                ))}
              </select>
            </Field>
            <Field label={t({ en: "Search butcher", ar: "بحث عن جزّار" })}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t({ en: "name or number…", ar: "اسم أو رقم…" })}
                style={S.input}
              />
            </Field>
            <Field label={t({ en: "Sort by", ar: "الترتيب" })}>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={S.input}>
                <option value="pending">{t({ en: "Pending first", ar: "المعلّق أولاً" })}</option>
                <option value="kg">{t({ en: "Most kg", ar: "الأكثر كيلو" })}</option>
                <option value="count">{t({ en: "Most carcasses", ar: "الأكثر ذبائح" })}</option>
                <option value="name">{t({ en: "Name", ar: "الاسم" })}</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ── كروت الجزارين ── */}
        {loading && <div style={S.emptyBox}>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</div>}

        {!loading && butchers.length === 0 && (
          <div style={S.emptyBox}>
            {t({
              en: "No butcher activity for the selected filters.",
              ar: "لا يوجد نشاط لأي جزّار ضمن الفلاتر المختارة.",
            })}
          </div>
        )}

        <div style={S.cardGrid}>
          {butchers.map((b) => (
            <div key={b.empNo} className="bs-card bs-rise" style={S.card}>
              <div style={S.cardTop}>
                <span style={S.avatar}>{initials(b.name, b.empNo)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="bs-name" style={S.cardName}>{b.name}</div>
                  <div className="bs-small" style={S.cardMeta}>
                    #{b.empNo}{b.job ? ` · ${b.job}` : ""}
                  </div>
                  <div className="bs-small" style={S.cardMeta}>
                    {b.branchList.join(" · ") || "—"}
                  </div>
                </div>
              </div>

              <div style={S.statusRow}>
                {b.pending > 0 && <StatusChip id="pending" n={b.pending} isAr={isAr} />}
                {b.approved > 0 && <StatusChip id="approved" n={b.approved} isAr={isAr} />}
                {b.rejected > 0 && <StatusChip id="rejected" n={b.rejected} isAr={isAr} />}
              </div>

              <div style={S.statGrid}>
                <Stat label={t({ en: "Carcasses", ar: "ذبائح" })} value={b.count} />
                <Stat label={KG} value={b.kg.toFixed(1)} />
                <Stat label={t({ en: "Yield", ar: "التصافي" })} value={`${b.yieldPct.toFixed(1)}%`} tone="#0f766e" />
                <Stat label={t({ en: "Waste", ar: "الهدر" })} value={`${b.wastePct.toFixed(1)}%`} tone="#b45309" />
              </div>

              <div className="bs-small" style={S.cardFoot}>
                {t({ en: "Last activity", ar: "آخر نشاط" })}: {b.lastAt || "—"}
              </div>

              <div style={S.cardBtns}>
                <button
                  type="button"
                  style={{ ...S.btn, ...S.btnPrimary, flex: 1 }}
                  onClick={() => setOpenEmp(b.empNo)}
                >
                  {t({ en: "What they worked on", ar: "شو اشتغل" })} ({b.count})
                </button>
                {canReview && b.pending > 0 && (
                  <button type="button" style={{ ...S.btn, ...S.btnOk }} onClick={() => approveAll(b)}>
                    ✓ {t({ en: "Approve all", ar: "قبول الكل" })}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── تفاصيل جزّار ── */}
      {openButcher && (
        <DetailsModal
          b={openButcher}
          t={t} isAr={isAr} dir={dir} KG={KG}
          canReview={canReview}
          busyId={busyId}
          onClose={() => setOpenEmp(null)}
          onApprove={(row) => saveReview(row, "approved")}
          onReject={(row) => setRejecting({ id: row.id, row, reason: "" })}
        />
      )}

      {/* ── نافذة الرفض: السبب إلزامي ── */}
      {rejecting && (
        <RejectModal
          t={t} dir={dir}
          row={rejecting.row}
          busy={busyId === rejecting.id}
          onCancel={() => setRejecting(null)}
          onConfirm={async (reason) => {
            await saveReview(rejecting.row, "rejected", reason);
            setRejecting(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================ مكوّنات ============================ */

function Kpi({ label, value, tone }) {
  return (
    <div style={S.kpiBox}>
      <div className="bs-kpi" style={{ ...S.kpiValue, color: tone }}>{value}</div>
      <div className="bs-small" style={S.kpiLabel}>{label}</div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={S.statBox}>
      <div className="bs-stat" style={{ ...S.statValue, ...(tone ? { color: tone } : null) }}>
        {value}
      </div>
      <div className="bs-small" style={S.statLabel}>{label}</div>
    </div>
  );
}

function StatusChip({ id, n, isAr, big }) {
  const s = STATUS[id];
  return (
    <span
      className="bs-chip"
      style={{
        ...S.chip,
        background: s.bg, color: s.fg, border: `1px solid ${s.bd}`,
        ...(big ? { padding: "6px 14px" } : null),
      }}
    >
      {isAr ? s.ar : s.en}{typeof n === "number" ? ` · ${n}` : ""}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span className="bs-small" style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

/** تفاصيل جزّار: كل تقرير مع قبول / رفض. */
function DetailsModal({ b, t, isAr, dir, KG, canReview, busyId, onClose, onApprove, onReject }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div dir={dir} className="bs-rise" style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={S.avatar}>{initials(b.name, b.empNo)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bs-name" style={S.cardName}>{b.name}</div>
              <div className="bs-small" style={S.cardMeta}>
                #{b.empNo} · {b.count} {t({ en: "reports", ar: "تقرير" })} · {b.kg.toFixed(1)} {KG}
              </div>
            </div>
          </div>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Close", ar: "إغلاق" })}
          </button>
        </div>

        <div style={S.modalBody}>
          {b.rows.map((r) => (
            <div key={r.id} style={{ ...S.reportBox, ...(r.reviewStatus === "rejected" ? S.reportBoxBad : null) }}>
              <div style={S.reportHead}>
                <div style={{ minWidth: 0 }}>
                  <div style={S.reportTitle}>
                    {r.inputName}
                    {r.bomRef ? ` · ${r.bomRef}` : ""}
                  </div>
                  <div className="bs-small" style={S.cardMeta}>
                    {r.opNo ? <b>{r.opNo}</b> : null}
                    {r.opNo ? " · " : ""}
                    {r.day} {r.time} · {r.branchName}
                    {r.bomKindName ? ` · 🐑 ${r.bomKindName}` : ""}
                    {r.bomOriginName ? ` · 🌍 ${r.bomOriginName}` : ""}
                    {r.bomCatName ? ` · ${r.bomCatName}` : ""}
                    {r.entryDay && r.entryDay !== r.day
                      ? ` · ${t({ en: "entered", ar: "أُدخل" })} ${r.entryDay}` : ""}
                  </div>
                </div>
                <StatusChip id={r.reviewStatus} isAr={isAr} big />
              </div>

              <div style={S.reportStats}>
                {r.carcassKg > 0 && (
                  <span>{t({ en: "Raw material", ar: "المادة الخام" })}: <b>{r.carcassKg.toFixed(2)}</b> {KG}</span>
                )}
                {r.pieceCount !== null && (
                  <span>{t({ en: "Pieces", ar: "عدد القطع" })}: <b>{r.pieceCount}</b></span>
                )}
                <span>{t({ en: "Products", ar: "المنتجات" })}: <b>{r.productsKg.toFixed(2)}</b> {KG}</span>
                <span>{t({ en: "Waste", ar: "الهدر" })}: <b>{r.wasteKg.toFixed(2)}</b> {KG}</span>
                <span>{t({ en: "Yield", ar: "التصافي" })}: <b>{r.yieldPct.toFixed(1)}%</b></span>
                {r.unaccountedKg > 0.005 && (
                  <span style={{ color: "#b45309", fontWeight: 900 }}>
                    ⚠️ {t({ en: "Unaccounted", ar: "فاقد غير مسجّل" })}: <b>{r.unaccountedKg.toFixed(2)}</b> {KG}
                  </span>
                )}
              </div>

              <div style={S.cutsWrap}>
                {r.cuts.map((c, i) => {
                  // انحراف عن هدف الوصفة — يلوّن الشريحة لما يتجاوز ±١٠٪
                  const off = c.deltaPct !== null && Math.abs(c.deltaPct) > 10;
                  return (
                    <span
                      key={`${c.itemId}_${i}`}
                      style={{
                        ...S.cutPill,
                        ...(c.isWaste ? S.cutPillWaste : null),
                        ...(off ? { background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" } : null),
                      }}
                    >
                      {c.name}
                      {c.sku ? ` (${c.sku})` : ""} — <b>{c.weightKg.toFixed(2)}</b> {KG}
                      {c.deltaPct !== null && (
                        <> · {c.deltaPct > 0 ? "+" : ""}{c.deltaPct.toFixed(0)}%</>
                      )}
                    </span>
                  );
                })}
                {!r.cuts.length && (
                  <span className="bs-small" style={S.cardMeta}>
                    {t({ en: "No lines recorded.", ar: "لا توجد أسطر مسجّلة." })}
                  </span>
                )}
              </div>

              {r.review && r.review.status === "rejected" && r.review.reason && (
                <div style={S.reasonBox}>
                  <b>{t({ en: "Rejection reason", ar: "سبب الرفض" })}:</b> {r.review.reason}
                </div>
              )}
              {r.review?.at && (
                <div className="bs-small" style={S.cardMeta}>
                  {t({ en: "Reviewed by", ar: "روجع بواسطة" })} {r.review.by || "—"} ·{" "}
                  {new Date(r.review.at).toLocaleString(isAr ? "ar-EG" : "en-GB", {
                    dateStyle: "short", timeStyle: "short",
                  })}
                </div>
              )}

              {canReview && (
                <div style={S.reportBtns}>
                  <button
                    type="button"
                    style={{ ...S.btn, ...S.btnOk, ...(busyId === r.id ? S.btnOff : null) }}
                    disabled={busyId === r.id || r.reviewStatus === "approved"}
                    onClick={() => onApprove(r)}
                  >
                    ✓ {t({ en: "Accept", ar: "قبول" })}
                  </button>
                  <button
                    type="button"
                    style={{ ...S.btn, ...S.btnBad, ...(busyId === r.id ? S.btnOff : null) }}
                    disabled={busyId === r.id}
                    onClick={() => onReject(r)}
                  >
                    ✕ {t({ en: "Reject", ar: "رفض" })}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ خطة اليوم ============================ */
/* المشرف يحدّد هدف كل ملحمة لليوم (عدد ذبائح + وزن خام) ويشوف الإنجاز لحظياً.
   الهدف محفوظ على السيرفر بسجل واحد لكل (يوم × ملحمة). */
function DayPlanPanel({ t, isAr, canEdit, KG }) {
  const today = todayStr();
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState({});   // { branchCode: {count, rawKg} }
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState(null);          // { branch, count, kg, note }
  const [loadErr, setLoadErr] = useState("");      // فشل قراءة الخطط/التقدّم
  const [saveErr, setSaveErr] = useState("");      // فشل حفظ الهدف

  const load = useCallback(async () => {
    // طلبان فقط: الخطط + تقدّم كل الملاحم دفعة واحدة
    try {
      const [all, per] = await Promise.all([
        fetchPlans(),
        fetchTodayProgressByBranch(today),
      ]);
      setPlans(all.filter((p) => p.date === today));
      setProgress(per);
      setLoadErr("");
    } catch (e) {
      // لا نعرض «ما في هدف» والتحميل فشل — الفرق بين الحالتين مهم للمشرف
      setLoadErr(e?.message || "load failed");
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  /* الملاحم التي لها هدف اليوم — وإلا نعرض زر إضافة فقط */
  const planned = plans.filter((p) => Number(p.targetCount) > 0 || Number(p.targetKg) > 0);

  const submit = async () => {
    if (!edit?.branch) return;
    setBusy(edit.branch);
    setSaveErr("");
    try {
      await savePlan({
        date: today,
        branch: edit.branch,
        targetCount: edit.count,
        targetKg: edit.kg,
        note: edit.note,
        by: currentUser().username || currentUser().name || "supervisor",
      });
      setEdit(null);
      await load();
    } catch (e) {
      // نُبقي النافذة مفتوحة بالقيم كما هي حتى لا يُعيد المشرف الإدخال
      setSaveErr(e?.message || "save failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={S.planWrap}>
      <div style={S.planHead}>
        <span className="bs-name" style={{ fontWeight: 900 }}>
          🎯 {t({ en: "Today's plan", ar: "خطة اليوم" })}
        </span>
        {canEdit && (
          <button
            type="button"
            style={S.planAddBtn}
            onClick={() => setEdit({ branch: BRANCHES[0]?.code || "", count: "", kg: "", note: "" })}
          >
            ＋ {t({ en: "Set a target", ar: "تحديد هدف" })}
          </button>
        )}
      </div>

      {loadErr ? (
        <div className="bs-small" style={S.planError}>
          ⚠️ {t({
            en: "Could not load today's targets and progress, so this panel may be empty or stale.",
            ar: "ما قدرنا نحمّل أهداف اليوم والتقدّم، فهذه اللوحة يمكن تكون فاضية أو قديمة.",
          })}
          <button type="button" style={S.planEditBtn} onClick={load}>
            ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
          </button>
        </div>
      ) : !planned.length ? (
        <div className="bs-small" style={S.planEmpty}>
          {t({
            en: "No target set for today — the kiosk shows no progress bar until you set one.",
            ar: "ما في هدف لليوم — شريط التقدّم ما بيظهر بالكشك حتى تحدّد هدفاً.",
          })}
        </div>
      ) : (
        <div style={S.planGrid}>
          {planned.map((p) => {
            const b = BRANCHES.find((x) => x.code === p.branch);
            const done = progress[p.branch] || { count: 0, rawKg: 0 };
            const rows = [
              {
                lbl: t({ en: "Carcasses", ar: "الذبائح" }),
                done: done.count, target: Number(p.targetCount) || 0,
                fmt: (v) => String(Math.round(v)),
              },
              {
                lbl: t({ en: "Raw kg", ar: "وزن الخام" }),
                done: done.rawKg, target: Number(p.targetKg) || 0,
                fmt: (v) => `${v.toFixed(0)} ${KG}`,
              },
            ].filter((r) => r.target > 0);
            const complete = rows.every((r) => r.done >= r.target);

            return (
              <div key={p.branch} style={{ ...S.planCard, ...(complete ? S.planCardDone : null) }}>
                <div style={S.planCardHead}>
                  <span style={{ fontWeight: 900 }}>{b ? nameOf(b, isAr) : p.branch}</span>
                  {complete
                    ? <span style={S.planOk}>✓ {t({ en: "Done", ar: "تحقّق" })}</span>
                    : canEdit && (
                      <button
                        type="button"
                        style={S.planEditBtn}
                        onClick={() => setEdit({
                          branch: p.branch, count: p.targetCount || "",
                          kg: p.targetKg || "", note: p.note || "",
                        })}
                      >
                        {t({ en: "Edit", ar: "تعديل" })}
                      </button>
                    )}
                </div>
                {rows.map((r) => {
                  const pctv = progressPct(r.done, r.target);
                  const ok = r.done >= r.target;
                  return (
                    <div key={r.lbl} style={S.planLine}>
                      <span className="bs-small" style={{ color: "#6b8299", fontWeight: 800, minWidth: 78 }}>
                        {r.lbl}
                      </span>
                      <span style={S.planTrack}>
                        <span style={{
                          ...S.planFill, width: `${pctv}%`,
                          background: ok ? "#047857" : "#1f6fd0",
                        }} />
                      </span>
                      <span className="bs-small" style={{ fontWeight: 900, color: ok ? "#047857" : "#14507f" }}>
                        {r.fmt(r.done)} / {r.fmt(r.target)}
                      </span>
                    </div>
                  );
                })}
                {p.note && <div className="bs-small" style={S.planNote}>📌 {p.note}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تحديد الهدف */}
      {edit && (
        <div style={S.overlay} onClick={() => setEdit(null)}>
          <div className="bs-rise" style={S.smallModal} onClick={(e) => e.stopPropagation()}>
            <div className="bs-name" style={S.cardName}>
              🎯 {t({ en: "Set today's target", ar: "تحديد هدف اليوم" })}
            </div>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>{t({ en: "Butchery", ar: "الملحمة" })}</span>
              <select
                style={S.planInput}
                value={edit.branch}
                onChange={(e) => setEdit({ ...edit, branch: e.target.value })}
              >
                {BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                ))}
              </select>
            </label>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>
                {t({ en: "Carcasses target", ar: "هدف عدد الذبائح" })}
              </span>
              <input
                style={S.planInput} inputMode="numeric" placeholder="0"
                value={edit.count}
                onChange={(e) => setEdit({ ...edit, count: e.target.value.replace(/[^\d]/g, "") })}
              />
            </label>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>
                {t({ en: "Raw weight target (kg)", ar: `هدف وزن الخام (${KG})` })}
              </span>
              <input
                style={S.planInput} inputMode="decimal" placeholder="0"
                value={edit.kg}
                onChange={(e) => setEdit({ ...edit, kg: e.target.value.replace(/[^\d.]/g, "") })}
              />
            </label>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>
                {t({ en: "Note for the butchers (optional)", ar: "ملاحظة للجزارين (اختياري)" })}
              </span>
              <input
                style={S.planInput}
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </label>
            <div className="bs-small" style={{ color: "#6b8299", fontWeight: 700, lineHeight: 1.6 }}>
              {t({
                en: "Leave a target at 0 to hide that bar. The kiosk updates within two minutes.",
                ar: "خلّي الهدف صفر لإخفاء شريطه. الكشك بيتحدّث خلال دقيقتين.",
              })}
            </div>
            {saveErr && (
              <div className="bs-small" style={S.planError}>
                ⚠️ {t({
                  en: "The target was not saved. Your entries are still here — try again.",
                  ar: "الهدف ما انحفظ. اللي كتبته لسا موجود — جرّب كمان مرّة.",
                })}
                <code style={{ opacity: 0.7, fontWeight: 700 }}>{saveErr}</code>
              </div>
            )}
            <div style={S.modalBtns}>
              <button type="button" style={S.btn} onClick={() => setEdit(null)}>
                {t({ en: "Cancel", ar: "إلغاء" })}
              </button>
              <button
                type="button"
                style={{ ...S.btn, ...S.btnOk, ...(busy ? S.btnOff : null) }}
                disabled={!!busy || !edit.branch}
                onClick={submit}
              >
                {busy ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Save", ar: "حفظ" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** نافذة الرفض — لا يُقبل الرفض بلا سبب. */
function RejectModal({ row, onCancel, onConfirm, busy, t, dir }) {
  const [reason, setReason] = useState("");
  const ok = reason.trim().length >= 3;

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div dir={dir} className="bs-rise" style={S.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className="bs-name" style={S.cardName}>
          ✕ {t({ en: "Reject report", ar: "رفض التقرير" })}
        </div>
        <div className="bs-small" style={S.cardMeta}>
          {row.inputName}{row.bomRef ? ` · ${row.bomRef}` : ""} · {row.day} {row.time} · #{row.empNo}
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <span className="bs-small" style={S.fieldLabel}>
            {t({ en: "Reason for rejection (required)", ar: "سبب الرفض (إلزامي)" })}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
            placeholder={t({
              en: "e.g. weights do not match the carcass, waste too high, wrong origin…",
              ar: "مثلاً: الأوزان ما بتطابق الذبيحة، الهدر مرتفع، المنشأ غلط…",
            })}
            style={S.textarea}
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" style={S.btn} onClick={onCancel}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnBad, ...(ok && !busy ? null : S.btnOff) }}
            disabled={!ok || busy}
            onClick={() => onConfirm(reason)}
          >
            {busy
              ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
              : t({ en: "Confirm rejection", ar: "تأكيد الرفض" })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ الأنماط ============================ */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: "100%", margin: "0 auto" },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 10, marginBottom: 14,
  },
  title: { fontWeight: 900 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  headerBtns: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },

  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "1px solid #1f6fd0" },
  btnOk: { background: "#047857", color: "#fff", border: "1px solid #047857" },
  btnBad: { background: "#b91c1c", color: "#fff", border: "1px solid #b91c1c" },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },

  noteBar: {
    background: "#f3f8fd", border: "1px solid #cfe0f0", color: "#3c5a75",
    borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontWeight: 800,
  },
  errorBar: {
    background: "#fff1f1", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontWeight: 800,
  },

  kpiRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(190px,100%),1fr))",
    gap: 12, marginBottom: 14,
  },
  kpiBox: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: "16px 18px", textAlign: "center",
    boxShadow: "0 8px 22px rgba(15,39,64,.05)",
  },
  kpiValue: { fontWeight: 900, lineHeight: 1.1 },
  kpiLabel: { color: "#6b8299", fontWeight: 800, marginTop: 6 },

  filters: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12,
  },
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  chipBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 18px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  chipBtnOn: { background: "#1f6fd0", color: "#fff", border: "1px solid #1f6fd0" },
  filterGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12,
  },
  fieldLabel: { color: "#6b8299", fontWeight: 800 },
  input: {
    border: "1.5px solid #cfe0f0", borderRadius: 10, padding: "12px 13px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box",
  },
  textarea: {
    border: "1px solid #cfe0f0", borderRadius: 10, padding: "10px 12px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical",
  },

  cardGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(340px,100%),1fr))", gap: 16,
  },
  card: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 20,
    padding: 18, display: "flex", flexDirection: "column", gap: 12,
    boxShadow: "0 10px 26px rgba(15,39,64,.06)",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
    display: "grid", placeItems: "center", fontWeight: 900, color: "#fff",
    background: "linear-gradient(135deg,#1f6fd0,#0f766e)",
    boxShadow: "0 8px 18px rgba(31,111,208,.28)",
  },
  cardName: { fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" },
  cardMeta: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  statusRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { borderRadius: 999, padding: "4px 11px", fontWeight: 900, whiteSpace: "nowrap" },

  statGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 },
  statBox: {
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 12,
    padding: "10px 6px", textAlign: "center",
  },
  statValue: { fontWeight: 900, color: "#14507f", lineHeight: 1.15 },
  statLabel: { color: "#6b8299", fontWeight: 800, marginTop: 3 },

  cardFoot: { color: "#8aa3b8", fontWeight: 700 },
  cardBtns: { display: "flex", gap: 8, flexWrap: "wrap" },

  emptyBox: {
    background: "#fff", border: "2px dashed #cfe0f0", borderRadius: 18,
    padding: "34px 20px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },

  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,39,64,.45)",
    display: "grid", placeItems: "center", padding: 16, zIndex: 80,
    backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#eef4fb", borderRadius: 22, width: "min(980px, 100%)",
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    fontFamily: FONT, color: "#0f2740", overflow: "hidden",
    boxShadow: "0 24px 60px rgba(15,39,64,.3)",
  },
  smallModal: {
    background: "#fff", borderRadius: 20, width: "min(540px, 100%)",
    padding: 20, fontFamily: FONT, color: "#0f2740",
    boxShadow: "0 24px 60px rgba(15,39,64,.3)",
  },
  modalHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, padding: 16, background: "#fff", borderBottom: "1px solid #dbe6f2",
  },
  modalBody: {
    padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
  },
  modalBtns: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" },

  /* ── خطة اليوم ── */
  planWrap: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12,
  },
  planHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap",
  },
  planAddBtn: {
    border: "1px solid #1f6fd0", background: "#1f6fd0", color: "#fff",
    borderRadius: 12, padding: "9px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  planEditBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
    borderRadius: 10, padding: "5px 12px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  planError: {
    background: "#fff5f5", border: "1px solid #f3c9c9", color: "#a12626",
    borderRadius: 14, padding: "14px 16px", fontWeight: 800, lineHeight: 1.7,
    display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
  },
  planEmpty: {
    background: "#f7fbff", border: "2px dashed #cfe0f0", borderRadius: 14,
    padding: "20px 16px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },
  planGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))",
    gap: 12,
  },
  planCard: {
    background: "#f9fcff", border: "1px solid #e3edf7", borderRadius: 14,
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
  },
  planCardDone: { background: "#f6fffa", borderColor: "#a7f3d0" },
  planCardHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  planOk: { color: "#047857", fontWeight: 900 },
  planLine: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  planTrack: {
    flex: 1, minWidth: 90, height: 12, borderRadius: 999,
    background: "#e6eef7", overflow: "hidden", display: "block",
  },
  planFill: { display: "block", height: "100%", borderRadius: 999, transition: "width .4s ease" },
  planNote: {
    color: "#8a5a12", fontWeight: 800, background: "#fff7ed",
    border: "1px solid #fcd9a4", borderRadius: 10, padding: "6px 10px",
  },
  planField: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  planInput: {
    border: "1px solid #cfe0f0", borderRadius: 12, padding: "11px 12px",
    fontFamily: FONT, fontWeight: 700, color: "#0f2740", outline: "none", width: "100%",
    boxSizing: "border-box",
  },

  reportBox: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: 14, display: "flex", flexDirection: "column", gap: 10,
  },
  reportBoxBad: { border: "1px solid #fecaca", background: "#fffafa" },
  reportHead: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
    flexWrap: "wrap",
  },
  reportTitle: { fontWeight: 900, color: "#14507f" },
  reportStats: {
    display: "flex", gap: 16, flexWrap: "wrap", fontWeight: 700, color: "#3c5a75",
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 12, padding: "10px 12px",
  },
  cutsWrap: { display: "flex", gap: 6, flexWrap: "wrap" },
  cutPill: {
    background: "#eef4fb", border: "1px solid #dbe6f2", borderRadius: 999,
    padding: "4px 12px", fontWeight: 700, color: "#3c5a75",
  },
  cutPillWaste: { background: "#fffdf5", borderColor: "#e8d9a8", color: "#8a6d1f" },
  reasonBox: {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
    borderRadius: 12, padding: "10px 12px", fontWeight: 700, lineHeight: 1.6,
  },
  reportBtns: { display: "flex", gap: 8, flexWrap: "wrap" },
};
