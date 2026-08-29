// src/pages/workforce/WorkforceRules.jsx
//
// ⚙️ تبويب القواعد — كل سلوك الوحدة مضبوط من هون، بلا تعديل كود.
// كل قاعدة مكتوب تحتها **شو بتعمل فعلاً** — قاعدة بلا شرح بتنفتح غلط.

import React from "react";
import { DEFAULT_RULES, personName, siteLabel, sitesOfPerson } from "./workforceConfig";
import {
  Avatar, Banner, Btn, C, Card, Chip, ELLIPSIS, Empty, SectionHead, Select,
} from "./workforceUi";

/* ترتيب العرض — مجموعات منطقية لا قائمة طويلة */
const GROUPS = [
  {
    id: "gate",
    icon: "🚪",
    ar: "بوابة الكشك",
    en: "Kiosk gate",
    rules: [
      {
        id: "lockUnknownEmp", kind: "toggle",
        ar: "رقم وظيفي غير مسجّل = ممنوع", en: "Unregistered number = blocked",
        arSub: "بدونها أي رقم بيمرق وبيصير عندك سجلات بلا صاحب.",
        enSub: "Without it any number passes and you get records with no owner.",
      },
      {
        id: "autoSiteFromPerson", kind: "toggle",
        ar: "قفل الملحمة على ملحمة الموظف", en: "Lock the site to the person's site",
        arSub: "الملحمة بتُقرأ من سجل الموظف وبتنقفل — بلا قائمة مفتوحة. هي البوابة اللي بتمنع موظف البرشا يسجّل على أبوظبي.",
        enSub: "The site comes from the employee record and is read-only — no open dropdown. This is the gate that stops a Barsha worker recording under Abu Dhabi.",
      },
      {
        id: "requirePin", kind: "toggle",
        ar: "رقم وظيفي + PIN من ٤ أرقام", en: "Employee number + 4-digit PIN",
        arSub: "بيمنع التسجيل باسم غيرك. بيضيف ثانيتين على كل عملية.",
        enSub: "Stops recording under someone else's name. Costs ~2 seconds per entry.",
      },
      {
        id: "entrySupervisors", kind: "supervisors",
        ar: "مين من المشرفين بيقدر يسجّل تقطيع", en: "Which supervisors may record cuts",
        arSub: "الأصل فصل اللي بيشتغل عن اللي بيعتمد. بس بملحمة فيها ثلاث مشرفين ممكن واحد بس يقطّع فعلياً — فبتسمّيه بالاسم بدل ما تفتحها للكل. القائمة فاضية = ولا مشرف بيسجّل.",
        enSub: "The default is a clean split between who works and who approves. But one supervisor out of three may actually cut — so you name him, instead of opening it to everyone. Empty list = no supervisor records.",
      },
    ],
  },
  {
    id: "model",
    icon: "🧩",
    ar: "نموذج البيانات",
    en: "Data model",
    rules: [
      {
        id: "multiSite", kind: "toggle",
        ar: "الجزار ممكن يكون على أكثر من ملحمة", en: "A butcher may belong to several sites",
        arSub: "مطفية = ملحمة واحدة والتغيير بالنقل الموثّق. تشغيلها بيضعّف قفل الموقع وبيعقّد التصافي.",
        enSub: "Off = one site, changed only by a logged transfer. Turning it on weakens the site lock and muddies yield reports.",
      },
      {
        id: "blockOnLeft", kind: "toggle",
        ar: "«مغادر» = ممنوع نهائياً", en: "“Left” = permanently blocked",
        arSub: "بلا استثناء ولا تجاوز.",
        enSub: "No exception, no override.",
      },
    ],
  },
];

export default function WorkforceRules({ scope, save, t, isAr }) {
  const { wf } = scope;
  const rules = { ...DEFAULT_RULES, ...(wf.rules || {}) };

  /* المشرفون النشطون فقط — تسمية مشرف مغادر ما إلها معنى. */
  const supervisors = (wf.people || [])
    .filter((p) => p.role === "supervisor" && p.status === "active")
    .sort((a, b) => personName(a, isAr).localeCompare(personName(b, isAr)));

  const setRule = async (id, value) => {
    await save({ ...wf, rules: { ...rules, [id]: value } });
  };

  const sameAsDefault = (k) => {
    const a = rules[k];
    const b = DEFAULT_RULES[k];
    if (Array.isArray(a) || Array.isArray(b)) {
      return JSON.stringify(a || []) === JSON.stringify(b || []);
    }
    return a === b;
  };
  const changed = Object.keys(DEFAULT_RULES).filter((k) => !sameAsDefault(k));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionHead
        icon="⚙️"
        title={t({ en: "Rules", ar: "القواعد" })}
        sub={t({
          en: "Every behaviour of this module is switched from here — no code change needed.",
          ar: "كل سلوك هالوحدة بينضبط من هون — بلا تعديل كود.",
        })}
        right={
          changed.length > 0 ? (
            <Btn onClick={() => save({ ...wf, rules: { ...DEFAULT_RULES } })}>
              ↺ {t({ en: "Reset to defaults", ar: "رجوع للافتراضي" })}
            </Btn>
          ) : null
        }
      />

      <Banner tone="warn">
        {t({
          en: "These rules are enforced in the browser. They are the right shape of the policy, but a determined user can bypass the UI — real enforcement has to move to the server before you rely on this for anything that matters financially.",
          ar: "هالقواعد مفروضة بالمتصفّح. هي الشكل الصحيح للسياسة، بس حدا بيفهم بيقدر يتجاوز الواجهة — الفرض الحقيقي لازم ينتقل للسيرفر قبل ما تعتمد عليها بأي شي إلو ثمن.",
        })}
      </Banner>

      {GROUPS.map((g) => (
        <Card key={g.id} style={{ display: "grid", gap: 4 }}>
          <div className="wf-h" style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span>{g.icon}</span><span>{isAr ? g.ar : g.en}</span>
          </div>

          {g.rules.map((r, i) => {
            const value = rules[r.id];
            const isDefault = sameAsDefault(r.id);
            const wide = r.kind === "supervisors";
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap",
                  padding: "14px 4px",
                  borderTop: i === 0 ? "none" : `1px solid ${C.lineSoft}`,
                }}
              >
                <div style={{ flex: wide ? "1 1 100%" : "1 1 300px", minWidth: 0, maxWidth: wide ? "none" : 900 }}>
                  <div style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {isAr ? r.ar : r.en}
                    {!isDefault && (
                      <Chip bg="#fffbeb" fg={C.amber} bd="#fde68a">
                        {t({ en: "changed", ar: "معدّلة" })}
                      </Chip>
                    )}
                  </div>
                  <div className="wf-sub" style={{ color: C.mute, fontWeight: 700, marginTop: 4, lineHeight: 1.7 }}>
                    {isAr ? r.arSub : r.enSub}
                  </div>
                </div>

                <div style={{ flexShrink: 0, ...(wide ? { flex: "1 1 100%" } : null) }}>
                  {r.kind === "supervisors" ? (
                    <SupervisorPicker
                      wf={wf}
                      supervisors={supervisors}
                      selected={Array.isArray(value) ? value : []}
                      onChange={(list) => setRule(r.id, list)}
                      t={t} isAr={isAr}
                    />
                  ) : r.kind === "toggle" ? (
                    <Toggle
                      on={!!value}
                      onChange={() => setRule(r.id, !value)}
                      t={t}
                    />
                  ) : (
                    <Select
                      value={value}
                      onChange={(e) => setRule(r.id, e.target.value)}
                      style={{ width: "auto", minWidth: 160 }}
                    >
                      {r.options.map((o) => (
                        <option key={o.id} value={o.id}>{isAr ? o.ar : o.en}</option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      ))}
    </div>
  );
}

/* ── منتقي المشرفين المسموح لهم بالتسجيل ──
   كل مشرف صف فيه اسمه ورقمه وملاحمه — بلا الملحمة الاختيار أعمى: بتلاقي
   اسمين متشابهين وما بتعرف أي واحد قصدك. */
function SupervisorPicker({ wf, supervisors, selected, onChange, t, isAr }) {
  const has = (id) => selected.includes(id);
  const toggle = (id) =>
    onChange(has(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  /* مشرف انحذف أو انوقف بيضل معرّفه محفوظ بالقاعدة. ما منعرض عدّاد بيقول
     «٣ من ٢» — منعدّ المسمّين الموجودين فعلاً. (المعرّف الميت ما بيأذي:
     بوابة الكشك بتقارن بالمعرّف وما رح تلاقي حدا.) */
  const liveSelected = selected.filter((id) => supervisors.some((p) => p.id === id));

  if (supervisors.length === 0) {
    return (
      <Empty
        icon="🧑‍🍳"
        title={t({ en: "No active supervisor registered", ar: "ما في مشرف نشط مسجّل" })}
        sub={t({
          en: "Add supervisors in the People tab first — this rule names them one by one.",
          ar: "ضيف مشرفين من تبويب الموظفين أولاً — هالقاعدة بتسمّيهم واحد واحد.",
        })}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Chip bg={liveSelected.length ? "#ecfdf5" : C.band} fg={liveSelected.length ? C.green : C.mute}
              bd={liveSelected.length ? "#a7f3d0" : "transparent"}>
          {liveSelected.length} / {supervisors.length} {t({ en: "allowed", ar: "مسموح" })}
        </Chip>
        {selected.length > 0 && (
          <Btn size="sm" tone="quiet" onClick={() => onChange([])}>
            ✕ {t({ en: "Allow none", ar: "ولا واحد" })}
          </Btn>
        )}
      </div>

      <div style={{
        display: "grid", gap: 6,
        gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))",
      }}>
        {supervisors.map((p) => {
          const on = has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              className="wf-row"
              onClick={() => toggle(p.id)}
              aria-pressed={on}
              style={{
                display: "flex", alignItems: "center", gap: 10, textAlign: "start",
                border: `1.5px solid ${on ? "#a7f3d0" : C.lineSoft}`,
                background: on ? "#ecfdf5" : "#fff",
                borderRadius: 12, padding: "9px 12px", width: "100%",
                fontFamily: "inherit", cursor: "pointer", color: C.ink,
              }}
            >
              <Avatar
                name={personName(p, isAr)}
                color={on ? C.green : C.violet}
                soft={on ? "#d1fae5" : "#f5f3ff"}
                size={34}
              />
              <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                <div className="wf-name" style={ELLIPSIS(900, "inherit")}>{personName(p, isAr)}</div>
                <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 1 }}>
                  #{p.empNo}
                  {" · "}
                  {sitesOfPerson(p).map((c) => siteLabel(wf, c, isAr)).join(" · ") || "—"}
                </div>
              </div>
              <span style={{ flexShrink: 0, fontWeight: 900, color: on ? C.green : "#cbd5e1" }}>
                {on ? "✓" : "○"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ on, onChange, disabled, t }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      aria-pressed={on}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        border: `1.5px solid ${on ? "#a7f3d0" : C.line}`,
        background: on ? "#ecfdf5" : "#fff",
        color: on ? C.green : C.mute,
        borderRadius: 999, padding: "8px 14px", fontWeight: 900,
        fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1, minWidth: 118, justifyContent: "space-between",
      }}
    >
      <span>{on ? t({ en: "On", ar: "مفعّلة" }) : t({ en: "Off", ar: "مطفية" })}</span>
      <span
        style={{
          width: 34, height: 20, borderRadius: 999, position: "relative",
          background: on ? "#34d399" : "#cbd5e1", transition: "background .18s ease", flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute", top: 3, insetInlineStart: on ? 17 : 3,
            width: 14, height: 14, borderRadius: 999, background: "#fff",
            transition: "inset-inline-start .18s ease",
          }}
        />
      </span>
    </button>
  );
}
