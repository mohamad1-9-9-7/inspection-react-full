// src/pages/workforce/WorkforceGate.jsx
//
// 🚪 محاكي البوابة — جرّب أي رقم وظيفي وشوف بالضبط شو رح يصير بالكشك،
// **بلا ما تلمس شاشة التسجيل الحقيقية**.
//
// ليش موجود؟ لأن سياسة صلاحيات ما بتتجرّب = سياسة ما حدا واثق فيها. هون
// بتشوف القرار وسببو قبل ما نركّب البوابة على ButcherLog بمرحلة لاحقة.

import React, { useMemo, useState } from "react";
import { personById, personName, siteLabel } from "./workforceConfig";
import { checkEntry } from "./workforceScope";
import {
  Avatar, Banner, Btn, C, Card, Chip, Field, Input, SectionHead, grid2,
} from "./workforceUi";

/* شرح كل سبب رفض — الرسالة للجزار، والشرح لك أنت */
const WHY = {
  unknown:      { ar: "بوابة الهوية — الرقم مش بسجل القوى العاملة", en: "Identity gate — number not in the registry" },
  left:         { ar: "بوابة الحالة — الموظف مغادر", en: "Status gate — employee has left" },
  suspended:    { ar: "بوابة الحالة — الموظف موقوف", en: "Status gate — employee suspended" },
  role:         { ar: "بوابة الدور — المشرفون لا يسجّلون", en: "Role gate — supervisors don't record" },
  pin_required: { ar: "بوابة الـ PIN — الرمز مطلوب", en: "PIN gate — code required" },
  pin_wrong:    { ar: "بوابة الـ PIN — الرمز غلط", en: "PIN gate — wrong code" },
  no_site:      { ar: "بوابة الموقع — بلا ملحمة", en: "Site gate — no site assigned" },
  not_yet:      { ar: "تاريخ السريان — النقل ما بلّش", en: "Effective date — transfer not started" },
  empty:        { ar: "ما في رقم", en: "No number entered" },
};

export default function WorkforceGate({ scope, t, isAr }) {
  const { wf } = scope;

  const [empNo, setEmpNo] = useState("");
  const [pin, setPin] = useState("");

  const rules = wf.rules || {};

  const result = useMemo(
    () => (empNo.trim() ? checkEntry(wf, empNo, { pin }) : null),
    [wf, empNo, pin]
  );

  const quick = useMemo(
    () => (wf.people || []).filter((p) => p.empNo).slice(0, 10),
    [wf.people]
  );

  const sup = result?.person?.supervisorId ? personById(wf, result.person.supervisorId) : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionHead
        icon="🚪"
        title={t({ en: "Gate simulator", ar: "محاكي البوابة" })}
        sub={t({
          en: "Type any employee number and see exactly what the kiosk would decide — without touching the live entry screen.",
          ar: "اكتب أي رقم وظيفي وشوف بالضبط شو رح تقرّر البوابة — بلا ما تلمس شاشة التسجيل الشغّالة.",
        })}
      />

      <Banner tone="info">
        {t({
          en: "Nothing here is wired into the live Butcher screens yet. This module is deliberately standalone so you can shape the policy first and connect it when you are happy with it.",
          ar: "لسّا ما في شي مربوط بشاشات الجزار الشغّالة. الوحدة مستقلّة عمداً — تضبّط السياسة أولاً وبعدين منوصلها لما ترتاح إلها.",
        })}
      </Banner>

      <Card>
        <div style={grid2}>
          <Field
            label={t({ en: "Employee number", ar: "الرقم الوظيفي" })}
            hint={t({ en: "What the butcher types at the kiosk", ar: "اللي بيكتبو الجزار بالكشك" })}
          >
            <Input
              value={empNo}
              onChange={(e) => setEmpNo(e.target.value)}
              inputMode="numeric"
              placeholder="1043"
              style={{ fontSize: 21, fontWeight: 900, letterSpacing: 2, padding: "12px 14px" }}
            />
          </Field>

          {rules.requirePin && (
            <Field label={t({ en: "PIN", ar: "الرمز السرّي" })}>
              <Input
                value={pin} inputMode="numeric" maxLength={4}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{ fontSize: 21, fontWeight: 900, letterSpacing: 6, padding: "12px 14px" }}
              />
            </Field>
          )}
        </div>

        {quick.length > 0 && (
          <div style={{
            display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center",
            marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.lineSoft}`,
          }}>
            <span className="wf-lbl" style={{ fontWeight: 900, color: C.mute }}>
              {t({ en: "Quick pick", ar: "اختيار سريع" })}
            </span>
            {quick.map((p) => (
              <Btn key={p.id} size="sm" onClick={() => setEmpNo(p.empNo)}>
                #{p.empNo} · {personName(p, isAr)}
              </Btn>
            ))}
            <Btn size="sm" tone="warn" onClick={() => setEmpNo("999999")}>
              {t({ en: "Unknown number", ar: "رقم غير مسجّل" })}
            </Btn>
          </div>
        )}
      </Card>


      {/* ── القرار ── */}
      {result && (
        <Card
          className="wf-rise"
          pad={0}
          style={{ borderColor: result.ok ? "#a7f3d0" : "#fecaca", overflow: "hidden" }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 13, padding: "16px 18px",
            background: result.ok ? "#f2fdf8" : "#fff5f5",
          }}>
            <span style={{ fontSize: 34, lineHeight: 1 }}>{result.ok ? "✅" : "⛔"}</span>
            <div style={{ minWidth: 0 }}>
              <div className="wf-h" style={{ fontWeight: 900, color: result.ok ? C.green : C.red }}>
                {result.ok ? t({ en: "Allowed", ar: "مسموح" }) : t({ en: "Blocked", ar: "ممنوع" })}
              </div>
              <div className="wf-sub" style={{ color: C.mute, fontWeight: 700, marginTop: 2 }}>
                {result.ok
                  ? t({ en: "All gates passed", ar: "مرق من كل البوابات" })
                  : (WHY[result.code] ? (isAr ? WHY[result.code].ar : WHY[result.code].en) : result.code)}
              </div>
            </div>
          </div>

          <div style={{ padding: "16px 18px", display: "grid", gap: 13 }}>
            {/* الرسالة كما سيراها الجزار — بالحرف */}
            <div style={{
              background: C.band, borderRadius: 12, padding: "13px 15px",
            }}>
              <div className="wf-lbl" style={{ fontWeight: 900, color: C.faint, marginBottom: 5 }}>
                {t({ en: "WHAT THE BUTCHER SEES", ar: "شو بيشوف الجزار" })}
              </div>
              <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.7 }}>
                {result.ok
                  ? t({
                      en: `Welcome ${result.person ? personName(result.person, false) : ""} — recording at ${siteLabel(wf, result.site, false)}`,
                      ar: `أهلاً ${result.person ? personName(result.person, true) : ""} — التسجيل على ${siteLabel(wf, result.site, true)}`,
                    })
                  : (isAr ? result.ar : result.en)}
              </div>
            </div>

            {result.person && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Avatar
                  name={personName(result.person, isAr)}
                  color={result.ok ? C.green : C.red}
                  soft={result.ok ? "#ecfdf5" : "#fef2f2"}
                  size={36}
                />
                <div>
                  <div className="wf-name" style={{ fontWeight: 900 }}>
                    {personName(result.person, isAr)}
                  </div>
                  <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800 }}>
                    #{result.person.empNo}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginInlineStart: "auto" }}>
                  {result.ok && (
                    <Chip bg="#ecfdf5" fg={C.green} bd="#a7f3d0">
                      🏪 {siteLabel(wf, result.site, isAr)}
                    </Chip>
                  )}
                  {result.locked && (
                    <Chip bg="#eff6ff" fg="#1e40af" bd="#bfdbfe">
                      🔒 {t({ en: "Site locked", ar: "الملحمة مقفولة" })}
                    </Chip>
                  )}
                  {sup && (
                    <Chip bg="#f5f3ff" fg="#5b21b6" bd="#ddd6fe">
                      🧑‍🍳 {personName(sup, isAr)}
                    </Chip>
                  )}
                </div>
              </div>
            )}

            {result.warn === "unknown" && (
              <Banner tone="warn">
                {t({
                  en: "Unregistered number — allowed only because “Block unknown” is off in the Rules tab.",
                  ar: "رقم غير مسجّل — مرق لأن قاعدة «رفض غير المسجّل» مطفية بتبويب القواعد.",
                })}
              </Banner>
            )}
          </div>
        </Card>
      )}

      {/* ── القواعد الفعّالة الآن ── */}
      <Card>
        <div className="wf-h2" style={{ fontWeight: 900, marginBottom: 11 }}>
          🧾 {t({ en: "Rules in force right now", ar: "القواعد الفعّالة الآن" })}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <RuleChip on={rules.lockUnknownEmp} ar="رفض غير المسجّل" en="Block unknown" isAr={isAr} />
          <RuleChip on={rules.autoSiteFromPerson} ar="قفل الملحمة" en="Lock site" isAr={isAr} />
          <RuleChip on={rules.requirePin} ar="PIN" en="PIN" isAr={isAr} />
          <RuleChip on={rules.supervisorCanEnter} ar="المشرف يسجّل" en="Supervisor records" isAr={isAr} />
          <RuleChip on={rules.multiSite} ar="ملاحم متعددة" en="Multi-site" isAr={isAr} />
        </div>
        <div className="wf-lbl" style={{ color: C.faint, fontWeight: 700, marginTop: 10 }}>
          {t({ en: "Change them in the Rules tab.", ar: "غيّرها من تبويب القواعد." })}
        </div>
      </Card>
    </div>
  );
}

function RuleChip({ on, ar, en, isAr }) {
  return (
    <Chip
      bg={on ? "#ecfdf5" : "#f8fafc"}
      fg={on ? C.green : "#94a3b8"}
      bd={on ? "#a7f3d0" : "#e2e8f0"}
    >
      {on ? "✓" : "○"} {isAr ? ar : en}
    </Chip>
  );
}
