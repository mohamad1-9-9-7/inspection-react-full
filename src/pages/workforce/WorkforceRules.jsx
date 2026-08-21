// src/pages/workforce/WorkforceRules.jsx
//
// ⚙️ تبويب القواعد — كل سلوك الوحدة مضبوط من هون، بلا تعديل كود.
// كل قاعدة مكتوب تحتها **شو بتعمل فعلاً** — قاعدة بلا شرح بتنفتح غلط.

import React from "react";
import { DEFAULT_RULES } from "./workforceConfig";
import { Banner, Btn, C, Card, Chip, SectionHead, Select } from "./workforceUi";

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
        id: "supervisorCanEnter", kind: "toggle",
        ar: "المشرف يقدر يسجّل تقطيع", en: "Supervisors may record cuts",
        arSub: "مطفية = فصل واضح بين اللي بيشتغل واللي بيعتمد.",
        enSub: "Off = a clean split between who works and who approves.",
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

  const setRule = async (id, value) => {
    await save({ ...wf, rules: { ...rules, [id]: value } });
  };

  const changed = Object.keys(DEFAULT_RULES).filter((k) => rules[k] !== DEFAULT_RULES[k]);

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
            const isDefault = value === DEFAULT_RULES[r.id];
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap",
                  padding: "14px 4px",
                  borderTop: i === 0 ? "none" : `1px solid ${C.lineSoft}`,
                }}
              >
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
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

                <div style={{ flexShrink: 0 }}>
                  {r.kind === "toggle" ? (
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
