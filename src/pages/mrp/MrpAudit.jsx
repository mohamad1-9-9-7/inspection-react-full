// src/pages/mrp/MrpAudit.jsx
//
// 🧾 سجل التغييرات — كل تعديل صار على وحدة التصنيع، ومين عملُه.
// MRP change log: every create / edit / deactivate / reactivate / delete,
// with the account that did it.
//
// الأحداث بتتسجّل تلقائياً بـ mrpAudit.js وقت كل حفظ للإعدادات، فما في شي
// لازم يتعمل يدوي — هالصفحة قراءة فقط.
//
// تبويبان:
//   📜 كل الأحداث — خط زمني مفصّل (شو الحقل اللي تغيّر ومن وين لوين).
//   ⏻ التعطيل والتفعيل — كل دورة بسطر واحد: تاريخ التعطيل وتاريخ إعادة التفعيل.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSettingsLang } from "../settings/_shared/settingsI18n";
import {
  S, Card, Kpi, SearchBox, EmptyBox, MrpShell, MrpNoAccess, canOpenMrp,
} from "./mrpUi";
import { todayIso, useMrpConfig } from "./mrpApi";
import {
  ACTION_LABELS, AUDIT_START, FIELD_LABELS, KIND_LABELS,
  daysBetween, fetchAuditEvents, lifecycleCycles,
} from "./mrpAudit";

const PAGE = "mrp.audit";

/** يوم محلي بصيغة YYYY-MM-DD (en-CA بتعطي هالترتيب جاهز). */
const localDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
};
const localTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

/** شارة الإجراء (إنشاء · تعديل · تعطيل · إعادة تفعيل · حذف). */
function ActionBadge({ action, isAr }) {
  const a = ACTION_LABELS[action] || ACTION_LABELS.updated;
  return (
    <span style={{
      ...S.badge, background: a.bg, borderColor: a.border, color: a.color,
    }}>
      {a.icon} {isAr ? a.ar : a.en}
    </span>
  );
}

/** خلية العنصر: أيقونة النوع + الكود + الاسم + الوصفة الأم للمسارات. */
function EntityCell({ e, isAr }) {
  const k = KIND_LABELS[e.kind] || { ar: e.kind, en: e.kind, icon: "•", color: "#3c5a75" };
  const name = (isAr ? e.name || e.nameEn : e.nameEn || e.name) || "";
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "start" }}>
      <span style={{ fontWeight: 900, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span>{k.icon}</span>
        {e.code ? <code style={codeChip}>{e.code}</code> : null}
        <span dir="auto">{name || "—"}</span>
      </span>
      <span style={{ ...S.hint, color: k.color }}>
        {isAr ? k.ar : k.en}
        {e.parentCode ? ` · ${isAr ? "ضمن" : "in"} ${e.parentCode}` : ""}
      </span>
    </span>
  );
}

/** تفاصيل التعديل: الحقل ومن أي قيمة لأي قيمة. */
function Changes({ list, isAr }) {
  if (!list || !list.length) return <span style={S.hint}>—</span>;
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "start" }}>
      {list.slice(0, 8).map((c, i) => {
        const f = FIELD_LABELS[c.field];
        const fieldName = f ? (isAr ? f.ar : f.en) : c.field;
        return (
          <span key={`${c.field}_${i}`} style={{ fontWeight: 700 }}>
            <b style={{ color: "#14507f" }}>{fieldName}</b>
            {c.item ? <span style={{ color: "#6b8299" }}> · {c.item}</span> : null}
            {": "}
            <span style={oldVal}>{c.from === "" || c.from === undefined ? "—" : String(c.from)}</span>
            {" → "}
            <span style={newVal}>{c.to === "" || c.to === undefined ? "—" : String(c.to)}</span>
          </span>
        );
      })}
      {list.length > 8 && (
        <span style={S.hint}>
          + {list.length - 8} {isAr ? "تغيير آخر" : "more changes"}
        </span>
      )}
    </span>
  );
}

/** خلية الحساب — اسم الدخول والاسم الظاهر. */
function ActorCell({ user, name }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontWeight: 900 }}>👤 {user || "—"}</span>
      {name && name !== user ? <span style={S.hint}>{name}</span> : null}
    </span>
  );
}

export default function MrpAudit() {
  const { t, isAr } = useSettingsLang();
  const { cfg } = useMrpConfig({ refetchOnFocus: false });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState(AUDIT_START);
  const [to, setTo] = useState(todayIso());

  const load = useCallback(() => {
    setLoading(true);
    return fetchAuditEvents()
      .then((rows) => { setEvents(rows); setError(""); })
      .catch((e) => setError(e?.message || "load failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* الحسابات التي ظهرت بالسجل — لقائمة الفلترة */
  const actors = useMemo(
    () => [...new Set(events.map((e) => e.by).filter(Boolean))].sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      const day = localDay(e.at) || e.day;
      if (from && day && day < from) return false;
      if (to && day && day > to) return false;
      if (kind && e.kind !== kind) return false;
      if (action && e.action !== action) return false;
      if (actor && e.by !== actor) return false;
      if (!needle) return true;
      const hay = [
        e.code, e.name, e.nameEn, e.parentCode, e.by, e.byName,
        ...(e.changes || []).flatMap((c) => [c.field, c.item, c.from, c.to]),
      ].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [events, q, kind, action, actor, from, to]);

  const cycles = useMemo(() => lifecycleCycles(filtered), [filtered]);

  /* المعطّل حالياً — من الإعدادات نفسها لا من السجل (الحقيقة الحاضرة) */
  const offNow = useMemo(() => {
    const off = (list) => (list || []).filter((x) => x?.active === false).length;
    const paths = (cfg.boms || []).reduce(
      (s, b) => s + off(b.pathways), 0
    );
    return off(cfg.items) + off(cfg.boms) + off(cfg.bomOrigins) + off(cfg.bomKinds)
      + off(cfg.bomCategories) + off(cfg.categories) + paths;
  }, [cfg]);

  const today = todayIso();
  const todayCount = useMemo(
    () => events.filter((e) => (localDay(e.at) || e.day) === today).length,
    [events, today]
  );
  const last = events[0] || null;

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  const resetFilters = () => {
    setQ(""); setKind(""); setAction(""); setActor("");
    setFrom(AUDIT_START); setTo(todayIso());
  };
  const filtersOn = q || kind || action || actor || from !== AUDIT_START || to !== todayIso();

  return (
    <MrpShell
      pageId={PAGE}
      icon="🧾"
      title={t({ en: "Change log", ar: "سجل التغييرات" })}
      sub={t({
        en: "Every create, edit, deactivation and reactivation in the manufacturing module — and the account behind it",
        ar: "كل إنشاء وتعديل وتعطيل وإعادة تفعيل بوحدة التصنيع — ومين الحساب اللي عملُه",
      })}
      actions={
        <button type="button" style={S.btn} onClick={load} disabled={loading}>
          ↻ {loading ? t({ en: "Loading…", ar: "جارٍ التحميل…" }) : t({ en: "Refresh", ar: "تحديث" })}
        </button>
      }
    >
      <div style={S.kpiRow}>
        <Kpi label={t({ en: "Events today", ar: "أحداث اليوم" })} value={todayCount} />
        <Kpi
          label={t({ en: "Events in range", ar: "أحداث بالمدى" })}
          value={filtered.length}
          foot={`${events.length} ${t({ en: "in total", ar: "بالإجمالي" })}`}
        />
        <Kpi
          label={t({ en: "Inactive now", ar: "معطّل حالياً" })}
          value={offNow}
          color={offNow ? "#b45309" : "#047857"}
          foot={offNow ? undefined : t({ en: "everything is active", ar: "الكل مفعّل" })}
        />
        <Kpi
          label={t({ en: "Last change", ar: "آخر تغيير" })}
          value={last ? localDay(last.at) : "—"}
          foot={last ? `${localTime(last.at)} · ${last.by}` : t({ en: "no changes yet", ar: "ما في تغييرات بعد" })}
        />
      </div>

      <Card
        icon="🔎"
        title={t({ en: "Filters", ar: "الفلاتر" })}
        right={
          filtersOn && (
            <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resetFilters}>
              ✕ {t({ en: "Clear", ar: "تصفير" })}
            </button>
          )
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder={t({
              en: "Search code, name, field, account…",
              ar: "ابحث بالكود أو الاسم أو الحقل أو الحساب…",
            })}
          />
          <div style={S.grid}>
            <label style={S.field}>
              <span style={S.label}>{t({ en: "Kind", ar: "النوع" })}</span>
              <select style={S.input} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">{t({ en: "All kinds", ar: "كل الأنواع" })}</option>
                {Object.entries(KIND_LABELS).map(([id, k]) => (
                  <option key={id} value={id}>{k.icon} {isAr ? k.ar : k.en}</option>
                ))}
              </select>
            </label>
            <label style={S.field}>
              <span style={S.label}>{t({ en: "Action", ar: "الإجراء" })}</span>
              <select style={S.input} value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">{t({ en: "All actions", ar: "كل الإجراءات" })}</option>
                {Object.entries(ACTION_LABELS).map(([id, a]) => (
                  <option key={id} value={id}>{isAr ? a.ar : a.en}</option>
                ))}
              </select>
            </label>
            <label style={S.field}>
              <span style={S.label}>{t({ en: "Account", ar: "الحساب" })}</span>
              <select style={S.input} value={actor} onChange={(e) => setActor(e.target.value)}>
                <option value="">{t({ en: "All accounts", ar: "كل الحسابات" })}</option>
                {actors.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label style={S.field}>
              <span style={S.label}>{t({ en: "From", ar: "من" })}</span>
              <input type="date" style={S.input} value={from} min={AUDIT_START}
                onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label style={S.field}>
              <span style={S.label}>{t({ en: "To", ar: "إلى" })}</span>
              <input type="date" style={S.input} value={to}
                onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div style={S.chipRow}>
            <button
              type="button"
              style={{ ...S.btn, ...S.btnSm, ...(tab === "all" ? S.btnBlue : null) }}
              onClick={() => setTab("all")}
            >
              📜 {t({ en: "All events", ar: "كل الأحداث" })} ({filtered.length})
            </button>
            <button
              type="button"
              style={{ ...S.btn, ...S.btnSm, ...(tab === "cycles" ? S.btnBlue : null) }}
              onClick={() => setTab("cycles")}
            >
              ⏻ {t({ en: "Deactivation cycles", ar: "التعطيل والتفعيل" })} ({cycles.length})
            </button>
          </div>
        </div>
      </Card>

      {error ? <div style={S.err}>⚠️ {error}</div> : null}

      <div style={S.note}>
        {t({
          en: `The log starts on ${AUDIT_START} — everything created before that date was active and carries no earlier history.`,
          ar: `السجل يبدأ من ${AUDIT_START} — كل شي كان موجوداً قبل هالتاريخ كان مفعّلاً وما إلُه تاريخ أقدم.`,
        })}
      </div>

      {tab === "all" ? (
        <Card icon="📜" title={t({ en: "All events", ar: "كل الأحداث" })}>
          {loading && !events.length ? (
            <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
          ) : !filtered.length ? (
            <EmptyBox>
              {events.length
                ? t({ en: "No event matches these filters.", ar: "ما في حدث مطابق لهالفلاتر." })
                : t({ en: "No change has been recorded yet.", ar: "ما انسجّل أي تغيير بعد." })}
            </EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Date & time", ar: "التاريخ والوقت" })}</th>
                    <th style={S.th}>{t({ en: "Item", ar: "العنصر" })}</th>
                    <th style={S.th}>{t({ en: "Action", ar: "الإجراء" })}</th>
                    <th style={S.th}>{t({ en: "Details", ar: "التفاصيل" })}</th>
                    <th style={S.th}>{t({ en: "Account", ar: "الحساب" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td style={S.td}>
                        <span style={{ fontWeight: 900 }}>{localDay(e.at)}</span>
                        <div style={S.hint}>{localTime(e.at)}</div>
                      </td>
                      <td style={{ ...S.td, ...S.tdStart }}><EntityCell e={e} isAr={isAr} /></td>
                      <td style={S.td}><ActionBadge action={e.action} isAr={isAr} /></td>
                      <td style={{ ...S.td, ...S.tdStart, minWidth: 240 }}>
                        <Changes list={e.changes} isAr={isAr} />
                      </td>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        <ActorCell user={e.by} name={e.byName} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card
          icon="⏻"
          title={t({ en: "Deactivation cycles", ar: "دورات التعطيل والتفعيل" })}
          sub={t({
            en: "One row per cycle: when it was switched off and when it came back on.",
            ar: "سطر لكل دورة: إمتى انعطّل وإمتى رجع اشتغل.",
          })}
        >
          {!cycles.length ? (
            <EmptyBox>
              {t({
                en: "Nothing has been deactivated or reactivated in this range.",
                ar: "ما في شي انعطّل أو رجع انفعّل بهالمدى.",
              })}
            </EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Item", ar: "العنصر" })}</th>
                    <th style={S.th}>⏸ {t({ en: "Deactivated on", ar: "تاريخ التعطيل" })}</th>
                    <th style={S.th}>⏻ {t({ en: "Reactivated on", ar: "تاريخ إعادة التفعيل" })}</th>
                    <th style={S.th}>{t({ en: "Duration", ar: "المدّة" })}</th>
                    <th style={S.th}>{t({ en: "Status", ar: "الحالة" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((c) => {
                    const stillOff = !c.onAt;
                    const days = c.offAt ? daysBetween(c.offAt, c.onAt) : null;
                    return (
                      <tr key={c.key}>
                        <td style={{ ...S.td, ...S.tdStart }}><EntityCell e={c} isAr={isAr} /></td>
                        <td style={S.td}>
                          {c.offAt ? (
                            <>
                              <span style={{ fontWeight: 900, color: "#b45309" }}>{localDay(c.offAt)}</span>
                              <div style={S.hint}>{localTime(c.offAt)} · 👤 {c.offBy}</div>
                            </>
                          ) : <span style={S.hint}>—</span>}
                        </td>
                        <td style={S.td}>
                          {c.onAt ? (
                            <>
                              <span style={{ fontWeight: 900, color: "#047857" }}>{localDay(c.onAt)}</span>
                              <div style={S.hint}>{localTime(c.onAt)} · 👤 {c.onBy}</div>
                            </>
                          ) : <span style={S.hint}>—</span>}
                        </td>
                        <td style={S.td}>
                          {days === null ? "—" : (
                            <span style={{ fontWeight: 900 }}>
                              {days} {t({ en: "day(s)", ar: "يوم" })}
                              {stillOff ? <div style={S.hint}>{t({ en: "so far", ar: "لهلّق" })}</div> : null}
                            </span>
                          )}
                        </td>
                        <td style={S.td}>
                          <span style={{
                            ...S.badge,
                            ...(stillOff
                              ? { background: "#fffbeb", borderColor: "#fcd34d", color: "#b45309" }
                              : { background: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }),
                          }}>
                            {stillOff ? t({ en: "Still off", ar: "لسّا معطّل" }) : t({ en: "Back on", ar: "رجع مفعّل" })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </MrpShell>
  );
}

const codeChip = {
  background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3",
  borderRadius: 7, padding: "1px 7px", fontWeight: 900,
};
const oldVal = {
  background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
  borderRadius: 6, padding: "0 6px", fontWeight: 800,
};
const newVal = {
  background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857",
  borderRadius: 6, padding: "0 6px", fontWeight: 800,
};
