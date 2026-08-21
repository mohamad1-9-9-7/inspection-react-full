// src/pages/workforce/WorkforceHub.jsx
//
// 👥 القوى العاملة — الملاحم والجزارون والمشرفون.
// Workforce: sites, butchers, supervisors and the access rules that bind them.
//
// ⚠️ وحدة قائمة بذاتها: ما بتلمس أي صفحة من صفحات الجزار الشغّالة، وبتخزّن
//    على نوع سجل خاص فيها (workforce_config). فينا نضبّط الآلية كاملة ونجرّبها
//    قبل ما نوصلها بشاشة التسجيل.
//
// 🔓 صفحة عادية: مين ما وصلها بيشوف ويعدّل — لا تقييد أدمن ولا نطاق ملاحم.

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isItemAllowed } from "../../utils/sectionItems";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { activeSites } from "./workforceConfig";
import { useWorkforceScope } from "./workforceScope";
import WorkforceGate from "./WorkforceGate";
import WorkforceLog from "./WorkforceLog";
import WorkforcePeople from "./WorkforcePeople";
import WorkforceRules from "./WorkforceRules";
import WorkforceSites from "./WorkforceSites";
import { Banner, Btn, C, Card, FONT, WF_CSS } from "./workforceUi";

const TABS = [
  { id: "people", icon: "👥", ar: "الموظفون", en: "People" },
  { id: "sites",  icon: "🏪", ar: "الملاحم",  en: "Sites" },
  { id: "gate",   icon: "🚪", ar: "البوابة",  en: "Gate" },
  { id: "log",    icon: "🕰️", ar: "السجل",    en: "Log" },
  { id: "rules",  icon: "⚙️", ar: "القواعد",  en: "Rules" },
];

const allowedTabs = () => TABS.filter((x) => isItemAllowed("workforce", `workforce.${x.id}`));

export default function WorkforceHub() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const scope = useWorkforceScope();
  const {
    wf, loading, saving, error, setError, commit,
    username, role, me,
  } = scope;

  const tabs = useMemo(allowedTabs, []);
  const [tab, setTab] = useState(() => allowedTabs()[0]?.id || "people");
  const [toast, setToast] = useState("");

  /* حفظ فوري لكل إجراء — لا لوحة حفظ مؤجّلة تضيع فيها التعديلات */
  const save = async (next) => {
    try {
      await commit(next, username || "workforce");
      setToast(t({ en: "Saved", ar: "تم الحفظ" }));
      setTimeout(() => setToast(""), 1700);
    } catch {
      /* الخطأ يظهر من scope.error */
    }
  };

  const kpi = useMemo(() => {
    const people = wf.people || [];
    return {
      sites: activeSites(wf).length,
      supervisors: people.filter((p) => p.role !== "butcher").length,
      butchers: people.filter((p) => p.role === "butcher").length,
      blocked: people.filter((p) => p.status !== "active").length,
      orphans: people.filter((p) => p.role === "butcher" && !p.supervisorId).length,
    };
  }, [wf]);

  const shared = { scope, save, t, isAr, dir };

  return (
    <div dir={dir} className="wf" style={S.page}>
      <style>{WF_CSS}</style>

      <div style={S.wrap}>
        {/* ══ الترويسة ══ */}
        <header style={S.header}>
          <div style={S.headStart}>
            <span style={S.headIcon}>👥</span>
            <div style={{ minWidth: 0 }}>
              <div className="wf-title" style={S.title}>
                {t({ en: "Workforce", ar: "القوى العاملة" })}
              </div>
              <div className="wf-sub" style={S.sub}>
                {t({
                  en: "Butcheries, butchers, supervisors — and who works where, under whom",
                  ar: "الملاحم والجزارون والمشرفون — ومين بيشتغل وين وتحت مين",
                })}
              </div>
            </div>
          </div>

          <div style={S.headBtns}>
            {saving && <span className="wf-lbl" style={S.saving}>⏳ {t({ en: "Saving…", ar: "جاري الحفظ…" })}</span>}
            {toast && <span className="wf-lbl" style={S.toast}>✅ {toast}</span>}
            {me && (
              <span className="wf-lbl wf-hidesm" style={S.rolePill}>
                {ROLE_LABEL[role]?.[isAr ? "ar" : "en"] || role}
              </span>
            )}
            <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            <Btn onClick={() => navigate("/inventory")}>{t({ en: "Inventory", ar: "المخزون" })}</Btn>
          </div>
        </header>

        {/* ══ شريط المؤشّرات — شريط واحد، لا خمس صناديق ══ */}
        <div style={S.kpiBar}>
          <Kpi icon="🏪" label={t({ en: "Sites", ar: "ملاحم" })} value={kpi.sites} tone="#dc2626" />
          <Div />
          <Kpi icon="🧑‍🍳" label={t({ en: "Supervisors", ar: "مشرفون" })} value={kpi.supervisors} tone="#7c3aed" />
          <Div />
          <Kpi icon="🔪" label={t({ en: "Butchers", ar: "جزارون" })} value={kpi.butchers} tone="#1f6fd0" />
          <Div />
          <Kpi icon="⏸️" label={t({ en: "Not active", ar: "غير نشط" })} value={kpi.blocked} tone="#d97706" muted={!kpi.blocked} />
          <Div />
          <Kpi icon="⚠️" label={t({ en: "No supervisor", ar: "بلا مشرف" })} value={kpi.orphans} tone="#dc2626" muted={!kpi.orphans} />
        </div>

        {error && <div style={{ marginBottom: 14 }}><Banner tone="danger" onClose={() => setError("")}>{error}</Banner></div>}

        {/* ══ التبويبات ══ */}
        <div style={S.tabs}>
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              style={{ ...S.tab, ...(tab === x.id ? S.tabOn : null) }}
            >
              <span>{x.icon}</span>
              <span>{isAr ? x.ar : x.en}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <Card style={{ textAlign: "center", padding: 40, fontWeight: 800, color: C.mute }}>
            ⏳ {t({ en: "Loading…", ar: "جاري التحميل…" })}
          </Card>
        ) : (
          <div className="wf-rise">
            {tab === "people" && <WorkforcePeople {...shared} />}
            {tab === "sites"  && <WorkforceSites  {...shared} />}
            {tab === "gate"   && <WorkforceGate   scope={scope} t={t} isAr={isAr} />}
            {tab === "log"    && <WorkforceLog    scope={scope} t={t} isAr={isAr} />}
            {tab === "rules"  && <WorkforceRules  {...shared} />}
          </div>
        )}

        <div className="wf-lbl" style={S.foot}>
          {wf.updatedAt
            ? `${t({ en: "Last change", ar: "آخر تعديل" })}: ${String(wf.updatedAt).slice(0, 16).replace("T", " ")}${wf.updatedBy ? ` · ${wf.updatedBy}` : ""}`
            : t({ en: "No changes saved yet", ar: "ما انحفظ أي تعديل بعد" })}
        </div>
      </div>
    </div>
  );
}

/* شارة عرض فقط — بتطلع لمن حسابه مربوط بسجل موظف */
const ROLE_LABEL = {
  manager:    { ar: "مدير منطقة",   en: "Area manager" },
  supervisor: { ar: "مشرف",         en: "Supervisor" },
  butcher:    { ar: "جزار",         en: "Butcher" },
};

const Div = () => <span style={S.kpiDiv} aria-hidden="true" />;

function Kpi({ icon, label, value, tone, muted }) {
  return (
    <div style={S.kpi}>
      <span className="wf-kpi" style={{ fontWeight: 900, color: muted ? C.faint : tone, lineHeight: 1 }}>
        {value}
      </span>
      <span className="wf-lbl" style={{ color: C.mute, fontWeight: 800, display: "flex", gap: 5, alignItems: "center" }}>
        <span aria-hidden="true">{icon}</span>{label}
      </span>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.ink,
    padding: "22px clamp(12px, 3vw, 28px) 44px", overflowX: "hidden",
  },
  wrap: { maxWidth: 1180, margin: "0 auto" },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 14, marginBottom: 12,
    background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18,
    padding: "15px 18px", boxShadow: "0 6px 18px rgba(15,39,64,.045)",
  },
  headStart: { display: "flex", alignItems: "center", gap: 13, minWidth: 0 },
  headIcon: {
    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
    display: "grid", placeItems: "center", fontSize: 26,
    background: "linear-gradient(135deg,#7c3aed,#4338ca)", color: "#fff",
    boxShadow: "0 8px 20px rgba(124,58,237,.26)",
  },
  title: { fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.2 },
  sub: { color: C.mute, fontWeight: 600, marginTop: 3 },
  headBtns: { display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" },
  langBtn: { background: "#fff", border: `1px solid #d7e5f3`, color: C.blue },
  saving: { fontWeight: 800, color: C.mute },
  toast: { fontWeight: 800, color: C.green },
  rolePill: {
    background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe",
    borderRadius: 999, padding: "5px 13px", fontWeight: 900,
  },

  kpiBar: {
    display: "flex", alignItems: "center", flexWrap: "wrap",
    background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16,
    padding: "12px 6px", marginBottom: 14,
    boxShadow: "0 6px 18px rgba(15,39,64,.045)",
  },
  kpi: {
    display: "grid", gap: 3, justifyItems: "center",
    flex: "1 1 110px", padding: "2px 10px", minWidth: 96,
  },
  kpiDiv: { width: 1, alignSelf: "stretch", background: C.lineSoft, margin: "2px 0" },

  tabs: {
    display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16,
    background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 6,
  },
  tab: {
    border: "1px solid transparent", background: "transparent", color: C.mute,
    borderRadius: 10, padding: "9px 15px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
    transition: "background .14s ease, color .14s ease",
  },
  tabOn: { background: "#eff6ff", color: C.blue, borderColor: "#bfdbfe" },

  foot: { marginTop: 20, textAlign: "center", color: C.faint, fontWeight: 800 },
};
