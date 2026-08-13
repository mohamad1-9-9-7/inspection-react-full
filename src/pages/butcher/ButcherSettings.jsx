// src/pages/butcher/ButcherSettings.jsx
//
// لوحة إعدادات الجزار — الشروط، المنتجات (الذبائح/القطع/الأجزاء)، الأكواد، والنِّسب.
// Butcher settings: rules, products, item codes, target ratios.
//
// كل شي بينحفظ على السيرفر (butcher_config) وبينعكس فوراً على شاشات الإدخال
// والتقارير. للمدراء فقط.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_RULES, defaultConfig, enabledOnly, mergeConfig, originsForAnimal,
  saveConfig, sortByOrder, useButcherConfig,
} from "./butcherConfig";
import { codeKey, nameOf } from "./butcherOptions";
import ButcherArt, { ART_IDS } from "./ButcherIcons";
import { BRANCHES } from "./butcherOptions";
import API_BASE, { IMAGE_API_BASE } from "../../config/api";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";

const CSS = `
#root .bg, #root .bg * { font-size: 16px !important; }
#root .bg table, #root .bg table * { font-size: 15px !important; }
#root .bg-title { font-size: 26px !important; }
#root .bg-sec   { font-size: 19px !important; }
#root .bg-sub   { font-size: 13px !important; }
@media (max-width: 820px) {
  #root .bg, #root .bg * { font-size: 14px !important; }
  #root .bg table, #root .bg table * { font-size: 13px !important; }
  #root .bg-title { font-size: 21px !important; }
  #root .bg-sec   { font-size: 16px !important; }
}
`;

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

const isAdminUser = () => {
  const u = currentUser();
  return !!u.isAdmin || (Array.isArray(u.permissions) && u.permissions.includes("*"));
};

const numOr = (v, fallback) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export default function ButcherSettings() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg, loading } = useButcherConfig();

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("rules"); // rules | animals | cuts | pieces
  const [codeAnimal, setCodeAnimal] = useState("sheep"); // النوع الذي نحرّر أكواده ونِسبه
  const [codeGrade, setCodeGrade] = useState("");         // الدرجة (فارغ = الكود العام للنوع×المنشأ)

  const admin = isAdminUser();
  const model = draft || cfg;
  const dirty = !!draft;

  const animalsOn = useMemo(() => enabledOnly(model.animals), [model.animals]);
  const origins = useMemo(
    () => originsForAnimal(model, codeAnimal),
    [model, codeAnimal]
  );

  /* ── تعديل مسوّدة ── */
  const edit = (fn) => {
    setMsg("");
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev || cfg));
      fn(next);
      return next;
    });
  };

  const editItem = (listKey, id, patch) =>
    edit((n) => {
      const it = n[listKey].find((x) => x.id === id);
      if (it) Object.assign(it, patch);
    });

  const editCode = (listKey, id, originId, code) =>
    edit((n) => {
      const it = n[listKey].find((x) => x.id === id);
      if (it) it.codes = { ...(it.codes || {}), [codeKey(codeAnimal, originId, codeGrade)]: code };
    });

  const editRef = (listKey, id, key, value) =>
    edit((n) => {
      const it = n[listKey].find((x) => x.id === id);
      if (!it) return;
      const refs = { ...(it.refs || {}) };
      const base = refs[codeAnimal] || { min: 0, max: 0 };
      refs[codeAnimal] = { ...base, [key]: numOr(value, 0) };
      it.refs = refs;
    });

  /* ── الجزارون ── */
  const editButcher = (i, patch) =>
    edit((n) => { n.butchers[i] = { ...n.butchers[i], ...patch }; });
  const addButcher = () =>
    edit((n) => { n.butchers = [...(n.butchers || []), { empNo: "", name: "", branch: "", active: true }]; });
  const removeButcher = (i) =>
    edit((n) => { n.butchers = n.butchers.filter((_, k) => k !== i); });

  /* ── الدرجات (lamb / hogget / mutton …) ── */
  const editGrade = (i, patchObj) =>
    edit((n) => { n.grades[i] = { ...n.grades[i], ...patchObj }; });
  const addGrade = () =>
    edit((n) => {
      n.grades = [
        ...(n.grades || []),
        { id: `grade_${Date.now().toString(36)}`, ar: "", en: "", animal: "sheep", origin: "australian", enabled: true },
      ];
    });
  const removeGrade = (i) =>
    edit((n) => { n.grades = n.grades.filter((_, k) => k !== i); });

  /* ── ترويسة التقرير ── */
  const editReport = (patch) => edit((n) => { n.report = { ...n.report, ...patch }; });
  const editSignature = (i, key, value) =>
    edit((n) => {
      const list = [...(n.report.signatures || [])];
      list[i] = { ...list[i], [key]: value };
      n.report.signatures = list;
    });

  /* ── ترتيب الكروت ── */
  const moveItem = (listKey, id, dir) =>
    edit((n) => {
      const list = n[listKey];
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((x, k) => { x.order = k; });
    });

  const addItem = (listKey) =>
    edit((n) => {
      const id = `custom_${Date.now().toString(36)}`;
      n[listKey].push({
        id,
        ar: t({ en: "New item", ar: "عنصر جديد" }),
        en: "New item",
        codes: {},
        refs: {},
        enabled: true,
        custom: true,
        ...(listKey === "pieces" ? { art: "back", whole: false } : null),
        ...(listKey === "animals" ? { min: 1, max: 500, origins: [] } : null),
      });
    });

  const removeItem = (listKey, id) =>
    edit((n) => { n[listKey] = n[listKey].filter((x) => x.id !== id); });

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMsg("");
    try {
      await saveConfig(draft, currentUser().username || "");
      setDraft(null);
      setMsg(t({ en: "Saved.", ar: "تم الحفظ." }));
    } catch (e) {
      setMsg(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (!window.confirm(t({
      en: "Reset every setting to the built-in defaults? Nothing is saved until you press Save.",
      ar: "إرجاع كل الإعدادات للافتراضي؟ لا شيء يُحفظ حتى تضغط حفظ.",
    }))) return;
    setDraft(defaultConfig());
  };

  if (!canOpenButcherPage("butcher.settings")) return <NoAccess page="butcher.settings" />;

  if (!admin) {
    return (
      <div dir={dir} className="bg" style={S.page}>
        <style>{CSS}</style>
        <div style={S.card}>
          <div className="bg-title" style={S.title}>⚙️ {t({ en: "Butcher Settings", ar: "إعدادات الجزار" })}</div>
          <div style={S.note}>
            {t({ en: "Administrators only.", ar: "للمدراء فقط." })}
          </div>
          <button type="button" style={S.btn} onClick={() => navigate("/butcher")}>
            {t({ en: "Back", ar: "رجوع" })}
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "rules", ar: "الشروط", en: "Rules" },
    { id: "butchers", ar: "الجزارون", en: "Butchers" },
    { id: "animals", ar: "الذبائح", en: "Animals" },
    { id: "grades", ar: "الدرجات", en: "Grades" },
    { id: "cuts", ar: "القطع والنِّسب", en: "Cuts & ratios" },
    { id: "pieces", ar: "الأجزاء", en: "Pieces" },
    { id: "report", ar: "ترويسة التقرير", en: "Report header" },
    { id: "admin", ar: "إدارة", en: "Admin" },
  ];

  return (
    <div dir={dir} className="bg" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <div>
            <div className="bg-title" style={S.title}>
              ⚙️ {t({ en: "Butcher Settings", ar: "إعدادات الجزار" })}
            </div>
            <div className="bg-sub" style={S.sub}>
              {model.updatedAt
                ? `${t({ en: "Last update", ar: "آخر تحديث" })}: ${new Date(model.updatedAt)
                    .toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}${
                    model.updatedBy ? ` — ${model.updatedBy}` : ""}`
                : t({ en: "Built-in defaults (never saved yet)", ar: "الإعدادات الافتراضية (لم تُحفظ بعد)" })}
            </div>
          </div>
          <div style={S.headerBtns}>
            <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            <button type="button" style={S.btn} onClick={resetDefaults}>
              {t({ en: "Reset to defaults", ar: "إرجاع الافتراضي" })}
            </button>
            <button type="button" style={S.btn} onClick={() => navigate("/butcher")}>
              {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {/* شريط الحفظ */}
        <div style={{ ...S.saveBar, ...(dirty ? S.saveBarOn : null) }}>
          <span>
            {loading
              ? t({ en: "Loading…", ar: "جارٍ التحميل…" })
              : dirty
                ? t({ en: "Unsaved changes", ar: "تعديلات غير محفوظة" })
                : t({ en: "All changes saved", ar: "كل التعديلات محفوظة" })}
            {msg ? ` — ${msg}` : ""}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            {dirty && (
              <button type="button" style={S.btn} onClick={() => { setDraft(null); setMsg(""); }}>
                {t({ en: "Discard", ar: "تراجع" })}
              </button>
            )}
            <button
              type="button"
              style={{ ...S.btn, ...S.btnPrimary, ...(dirty && !saving ? null : S.btnOff) }}
              onClick={save}
              disabled={!dirty || saving}
            >
              {saving ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Save", ar: "حفظ" })}
            </button>
          </span>
        </div>

        <div style={S.tabs}>
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              style={{ ...S.tab, ...(tab === x.id ? S.tabOn : null) }}
            >
              {isAr ? x.ar : x.en}
            </button>
          ))}
        </div>

        {/* ═══ الشروط ═══ */}
        {tab === "rules" && (
          <div style={S.card}>
            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Validation rules", ar: "شروط التحقق" })}
            </div>

            <Toggle
              label={t({ en: "Block saving when cuts + waste exceed the carcass weight",
                         ar: "منع الحفظ إذا تجاوز مجموع القطع والهدر وزن الذبيحة" })}
              value={model.rules.blockOverCarcass}
              onChange={(v) => edit((n) => { n.rules.blockOverCarcass = v; })}
            />
            <Toggle
              label={t({ en: "Warn when the carcass weight is outside the expected range",
                         ar: "تحذير عند وزن ذبيحة خارج المدى المتوقّع" })}
              value={model.rules.warnOutOfRange}
              onChange={(v) => edit((n) => { n.rules.warnOutOfRange = v; })}
            />
            <Toggle
              label={t({ en: "Require choosing a butchery before entry",
                         ar: "إلزام اختيار الملحمة قبل بدء الإدخال" })}
              value={model.rules.requireBranch}
              onChange={(v) => edit((n) => { n.rules.requireBranch = v; })}
            />

            <label style={S.rowField}>
              <span style={S.rowLabel}>
                {t({ en: "Rounding tolerance (kg)", ar: "سماحية التقريب (كجم)" })}
              </span>
              <input
                style={S.inputSm}
                value={model.rules.toleranceKg}
                onChange={(e) => edit((n) => { n.rules.toleranceKg = numOr(e.target.value, DEFAULT_RULES.toleranceKg); })}
                inputMode="decimal"
              />
            </label>

            <Toggle
              label={t({ en: "Require a waste value (block zero)",
                         ar: "إلزام إدخال الهدر (منع الصفر)" })}
              value={model.rules.requireWaste}
              onChange={(v) => edit((n) => { n.rules.requireWaste = v; })}
            />
            <Toggle
              label={t({ en: "Allow recording for an earlier date",
                         ar: "السماح بتسجيل تاريخ سابق" })}
              value={model.rules.allowBackdate}
              onChange={(v) => edit((n) => { n.rules.allowBackdate = v; })}
            />
            <Toggle
              label={t({ en: "Accept registered employee numbers only",
                         ar: "قبول الأرقام الوظيفية المسجّلة فقط" })}
              value={model.rules.restrictButchers}
              onChange={(v) => edit((n) => { n.rules.restrictButchers = v; })}
            />
            <Toggle
              label={t({ en: "On-screen number pad on the entry screen",
                         ar: "لوحة أرقام على الشاشة في شاشة الإدخال" })}
              value={model.rules.onScreenKeypad}
              onChange={(v) => edit((n) => { n.rules.onScreenKeypad = v; })}
            />
            <Toggle
              label={t({ en: "Measure deviation against the target ratio (instead of the period average)",
                         ar: "قياس الانحراف مقابل النسبة المرجعية (بدل متوسط الفترة)" })}
              value={model.rules.deviationVsTarget}
              onChange={(v) => edit((n) => { n.rules.deviationVsTarget = v; })}
            />

            <label style={S.rowField}>
              <span style={S.rowLabel}>
                {t({ en: "Rounding tolerance (kg)", ar: "سماحية التقريب (كجم)" })}
              </span>
              <input
                style={S.inputSm}
                value={model.rules.toleranceKg}
                onChange={(e) => edit((n) => { n.rules.toleranceKg = numOr(e.target.value, DEFAULT_RULES.toleranceKg); })}
                inputMode="decimal"
              />
            </label>

            <label style={S.rowField}>
              <span style={S.rowLabel}>
                {t({ en: "Round entered weights to", ar: "تقريب الأوزان المُدخلة إلى" })}
              </span>
              <select
                style={S.inputSm}
                value={model.rules.roundTo}
                onChange={(e) => edit((n) => { n.rules.roundTo = Number(e.target.value); })}
              >
                <option value={0}>{t({ en: "No rounding", ar: "بلا تقريب" })}</option>
                <option value={0.01}>0.01</option>
                <option value={0.05}>0.05</option>
                <option value={0.1}>0.10</option>
              </select>
            </label>

            <label style={S.rowField}>
              <span style={S.rowLabel}>
                {t({ en: "Deviation threshold (percentage points)", ar: "حدّ الانحراف (نقاط مئوية)" })}
              </span>
              <input
                style={S.inputSm}
                value={model.rules.deviationPct}
                onChange={(e) => edit((n) => { n.rules.deviationPct = numOr(e.target.value, 5); })}
                inputMode="decimal"
              />
            </label>

            <label style={S.rowField}>
              <span style={S.rowLabel}>
                {t({ en: "Lock records older than (days, 0 = never)",
                     ar: "قفل السجلات الأقدم من (أيام، ٠ = بلا قفل)" })}
              </span>
              <input
                style={S.inputSm}
                value={model.rules.lockAfterDays}
                onChange={(e) => edit((n) => { n.rules.lockAfterDays = numOr(e.target.value, 0); })}
                inputMode="numeric"
              />
            </label>

            <div style={S.note}>
              {t({
                en: "Rules apply to the entry screen immediately after saving — no rebuild needed.",
                ar: "الشروط بتصير فعّالة على شاشة الإدخال مباشرة بعد الحفظ — بلا إعادة بناء.",
              })}
            </div>
          </div>
        )}

        {/* ═══ الجزارون ═══ */}
        {tab === "butchers" && (
          <div style={S.card}>
            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Butchers register", ar: "سجل الجزارين" })}
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Active", ar: "نشط" })}</th>
                    <th style={S.th}>{t({ en: "Employee no.", ar: "الرقم الوظيفي" })}</th>
                    <th style={S.th}>{t({ en: "Name", ar: "الاسم" })}</th>
                    <th style={S.th}>{t({ en: "Default butchery", ar: "الملحمة الافتراضية" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {(model.butchers || []).length === 0 && (
                    <tr>
                      <td style={S.td} colSpan={5}>
                        {t({ en: "No butchers registered yet.", ar: "لا يوجد جزارون مسجّلون بعد." })}
                      </td>
                    </tr>
                  )}
                  {(model.butchers || []).map((b, i) => (
                    <tr key={`b${i}`}>
                      <td style={S.td}>
                        <input type="checkbox" checked={b.active !== false}
                          onChange={(e) => editButcher(i, { active: e.target.checked })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.inputSm} value={b.empNo || ""} inputMode="numeric"
                          onChange={(e) => editButcher(i, { empNo: e.target.value.trim() })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={b.name || ""}
                          onChange={(e) => editButcher(i, { name: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <select style={S.input} value={b.branch || ""}
                          onChange={(e) => editButcher(i, { branch: e.target.value })}>
                          <option value="">{t({ en: "None", ar: "بلا" })}</option>
                          {BRANCHES.map((x) => (
                            <option key={x.code} value={x.code}>{nameOf(x, isAr)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>
                        <button type="button" style={S.del} onClick={() => removeButcher(i)}>
                          {t({ en: "Delete", ar: "حذف" })}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={S.note}>
              {t({
                en: "Registered names replace bare numbers in every report. Turn on “Accept registered employee numbers only” in Rules to reject unknown numbers at entry.",
                ar: "الأسماء المسجّلة بتحلّ محل الأرقام المجرّدة بكل التقارير. فعّل «قبول الأرقام المسجّلة فقط» من الشروط لرفض أي رقم غير مسجّل عند الإدخال.",
              })}
            </div>
            <button type="button" style={S.btn} onClick={addButcher}>
              + {t({ en: "Add butcher", ar: "إضافة جزّار" })}
            </button>
          </div>
        )}

        {/* ═══ الذبائح ═══ */}
        {tab === "animals" && (
          <div style={S.card}>
            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Animals & weight ranges", ar: "الذبائح ومديات الوزن" })}
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "On", ar: "مفعّل" })}</th>
                    <th style={S.th}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</th>
                    <th style={S.th}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</th>
                    <th style={S.th}>{t({ en: "Min kg", ar: "أدنى وزن" })}</th>
                    <th style={S.th}>{t({ en: "Max kg", ar: "أعلى وزن" })}</th>
                    <th style={S.th}>{t({ en: "Available origins", ar: "المناشئ المتاحة" })}</th>
                    <th style={S.th}>{t({ en: "ID", ar: "المعرّف" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {model.animals.map((a) => (
                    <tr key={a.id}>
                      <td style={S.td}>
                        <input type="checkbox" checked={a.enabled !== false}
                          onChange={(e) => editItem("animals", a.id, { enabled: e.target.checked })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={a.ar || ""}
                          onChange={(e) => editItem("animals", a.id, { ar: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={a.en || ""}
                          onChange={(e) => editItem("animals", a.id, { en: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.inputSm} value={a.min ?? ""} inputMode="decimal"
                          onChange={(e) => editItem("animals", a.id, { min: numOr(e.target.value, 0) })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.inputSm} value={a.max ?? ""} inputMode="decimal"
                          onChange={(e) => editItem("animals", a.id, { max: numOr(e.target.value, 0) })} />
                      </td>
                      {/* المناشئ المتاحة لهذا النوع */}
                      <td style={{ ...S.td, textAlign: "start" }}>
                        <div style={S.originPicks}>
                          {enabledOnly(model.origins).map((o) => {
                            const on = Array.isArray(a.origins) ? a.origins.includes(o.id) : true;
                            return (
                              <label key={o.id} style={{ ...S.originPick, ...(on ? S.originPickOn : null) }}>
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={(e) => {
                                    const cur = Array.isArray(a.origins) ? a.origins : [];
                                    const next = e.target.checked
                                      ? [...new Set([...cur, o.id])]
                                      : cur.filter((x) => x !== o.id);
                                    editItem("animals", a.id, { origins: next });
                                  }}
                                />
                                {nameOf(o, isAr)}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ ...S.td, color: "#8aa3b8" }}>{a.id}</td>
                      <td style={S.td}>
                        {a.custom && (
                          <button type="button" style={S.del} onClick={() => removeItem("animals", a.id)}>
                            {t({ en: "Delete", ar: "حذف" })}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={S.note}>
              {t({
                en: "A new animal has no drawing until one is added to ButcherIcons.jsx — its card shows the name only.",
                ar: "أي نوع جديد بلا رسمة لحد ما تنضاف في ButcherIcons.jsx — كرتو بيعرض الاسم فقط.",
              })}
            </div>
            <button type="button" style={S.btn} onClick={() => addItem("animals")}>
              + {t({ en: "Add animal", ar: "إضافة نوع" })}
            </button>
          </div>
        )}

        {/* ═══ الدرجات ═══ */}
        {tab === "grades" && (
          <div style={S.card}>
            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Grades (after origin)", ar: "الدرجات (بعد المنشأ)" })}
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "On", ar: "مفعّل" })}</th>
                    <th style={S.th}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</th>
                    <th style={S.th}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</th>
                    <th style={S.th}>{t({ en: "Animal", ar: "النوع" })}</th>
                    <th style={S.th}>{t({ en: "Origin", ar: "المنشأ" })}</th>
                    <th style={S.th}>{t({ en: "ID", ar: "المعرّف" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {(model.grades || []).length === 0 && (
                    <tr><td style={S.td} colSpan={7}>
                      {t({ en: "No grades yet.", ar: "لا توجد درجات بعد." })}
                    </td></tr>
                  )}
                  {(model.grades || []).map((g, i) => (
                    <tr key={g.id || i}>
                      <td style={S.td}>
                        <input type="checkbox" checked={g.enabled !== false}
                          onChange={(e) => editGrade(i, { enabled: e.target.checked })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={g.ar || ""}
                          onChange={(e) => editGrade(i, { ar: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.input} value={g.en || ""}
                          onChange={(e) => editGrade(i, { en: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <select style={S.input} value={g.animal || ""}
                          onChange={(e) => editGrade(i, { animal: e.target.value })}>
                          {animalsOn.map((a) => (
                            <option key={a.id} value={a.id}>{nameOf(a, isAr)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>
                        <select style={S.input} value={g.origin || ""}
                          onChange={(e) => editGrade(i, { origin: e.target.value })}>
                          {originsForAnimal(model, g.animal).map((o) => (
                            <option key={o.id} value={o.id}>{nameOf(o, isAr)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...S.td, color: "#8aa3b8" }}>{g.id}</td>
                      <td style={S.td}>
                        <button type="button" style={S.del} onClick={() => removeGrade(i)}>
                          {t({ en: "Delete", ar: "حذف" })}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={S.note}>
              {t({
                en: "A grade adds one extra step after the origin. Codes per grade are entered in the Cuts / Pieces tabs after picking the grade there.",
                ar: "الدرجة بتضيف خطوة وحدة بعد المنشأ. أكواد كل درجة بتنكتب في تبويب القطع/الأجزاء بعد اختيار الدرجة هناك.",
              })}
            </div>
            <button type="button" style={S.btn} onClick={addGrade}>
              + {t({ en: "Add grade", ar: "إضافة درجة" })}
            </button>
          </div>
        )}

        {/* ═══ القطع والنِّسب ═══ */}
        {tab === "cuts" && (
          <ItemsTable
            listKey="cuts"
            items={model.cuts}
            origins={origins}
            isAr={isAr}
            t={t}
            title={t({ en: "Cuts, item codes & target ratios", ar: "القطع والأكواد والنِّسب المرجعية" })}
            editItem={editItem}
            editCode={editCode}
            editRef={editRef}
            removeItem={removeItem}
            addItem={addItem}
            showArt
            animals={animalsOn}
            codeAnimal={codeAnimal}
            setCodeAnimal={setCodeAnimal}
          />
        )}

        {/* ═══ الأجزاء ═══ */}
        {tab === "pieces" && (
          <ItemsTable
            listKey="pieces"
            items={model.pieces}
            origins={origins}
            isAr={isAr}
            t={t}
            title={t({ en: "Sheep pieces (after origin)", ar: "أجزاء الخروف (بعد المنشأ)" })}
            editItem={editItem}
            editCode={editCode}
            editRef={editRef}
            removeItem={removeItem}
            addItem={addItem}
            showArt
            animals={animalsOn}
            codeAnimal={codeAnimal}
            setCodeAnimal={setCodeAnimal}
            grades={enabledOnly(model.grades).filter((x) => x.animal === codeAnimal)}
            codeGrade={codeGrade}
            setCodeGrade={setCodeGrade}
            moveItem={moveItem}
          />
        )}

        {/* ═══ ترويسة التقرير ═══ */}
        {tab === "report" && (
          <div style={S.card}>
            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Official report header", ar: "ترويسة التقرير الرسمية" })}
            </div>

            <div style={S.grid2}>
              <Field label={t({ en: "Company (English)", ar: "الشركة (إنجليزي)" })}
                value={model.report.companyEn}
                onChange={(v) => editReport({ companyEn: v })} />
              <Field label={t({ en: "Company (Arabic)", ar: "الشركة (عربي)" })}
                value={model.report.companyAr}
                onChange={(v) => editReport({ companyAr: v })} />
              <Field label={t({ en: "Document no.", ar: "رقم الوثيقة" })}
                value={model.report.docNo}
                onChange={(v) => editReport({ docNo: v })} />
              <Field label={t({ en: "Revision no.", ar: "رقم المراجعة" })}
                value={model.report.revNo}
                onChange={(v) => editReport({ revNo: v })} />
              <Field label={t({ en: "Issue date", ar: "تاريخ الإصدار" })}
                value={model.report.issueDate} type="date"
                onChange={(v) => editReport({ issueDate: v })} />
            </div>

            <div style={S.rowField}>
              <span style={S.rowLabel}>{t({ en: "Logo", ar: "الشعار" })}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {model.report.logoUrl && (
                  <img src={model.report.logoUrl} alt="logo" style={S.logoPreview} />
                )}
                <LogoUpload t={t} onDone={(url) => editReport({ logoUrl: url })} />
                {model.report.logoUrl && (
                  <button type="button" style={S.del} onClick={() => editReport({ logoUrl: "" })}>
                    {t({ en: "Remove", ar: "إزالة" })}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-sec" style={S.secTitle}>
              {t({ en: "Signature boxes", ar: "خانات التواقيع" })}
            </div>
            {(model.report.signatures || []).map((sg, i) => (
              <div key={`sg${i}`} style={S.grid2}>
                <Field label={`${t({ en: "Box", ar: "خانة" })} ${i + 1} — EN`}
                  value={sg.en} onChange={(v) => editSignature(i, "en", v)} />
                <Field label={`${t({ en: "Box", ar: "خانة" })} ${i + 1} — AR`}
                  value={sg.ar} onChange={(v) => editSignature(i, "ar", v)} />
              </div>
            ))}

            <div style={S.note}>
              {t({
                en: "These appear on the Full Summary Report when printed.",
                ar: "هذه تظهر على التقرير الشامل عند الطباعة.",
              })}
            </div>
          </div>
        )}

        {/* ═══ إدارة ═══ */}
        {tab === "admin" && (
          <AdminTab
            t={t} isAr={isAr} model={model}
            onImport={(parsed) => setDraft(parsed)}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════ مكوّنات ═══════════════ */

/* ── قائمة أكواد المرتجعات: تُحمَّل مرة واحدة وتُشارَك بين كل الحقول ── */
let catalogCache = null;
function useItemCatalog() {
  const [items, setItems] = useState(catalogCache || []);
  useEffect(() => {
    if (catalogCache) return;
    const pub = process.env.PUBLIC_URL || "";
    fetch(`${pub}/data/items.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no catalog"))))
      .then((d) => {
        catalogCache = Array.isArray(d) ? d : [];
        setItems(catalogCache);
      })
      .catch(() => { catalogCache = []; });
  }, []);
  return items;
}

/** حقل كود الصنف — بحث في قائمة المرتجعات، وعلم أحمر لأي كود غير موجود. */
function CodePicker({ value, onChange, t }) {
  const items = useItemCatalog();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const known = useMemo(
    () => !value || items.some((i) => String(i.item_code) === String(value)),
    [items, value]
  );
  const desc = useMemo(
    () => items.find((i) => String(i.item_code) === String(value))?.description || "",
    [items, value]
  );

  const results = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return [];
    return items
      .filter(
        (i) =>
          String(i.item_code).toUpperCase().includes(s) ||
          String(i.description || "").toUpperCase().includes(s)
      )
      .slice(0, 12);
  }, [items, q]);

  return (
    <div style={S.codeWrap}>
      <input
        style={{ ...S.inputSm, ...(known ? null : S.codeBad) }}
        value={value}
        placeholder={t({ en: "code", ar: "كود" })}
        onChange={(e) => {
          const v = e.target.value.trim();
          onChange(v);
          setQ(v);
          setOpen(true);
        }}
        onFocus={() => { setQ(value || ""); setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 180)}
        title={desc || (known ? "" : t({ en: "Not in the catalog", ar: "غير موجود في القائمة" }))}
      />
      {open && results.length > 0 && (
        <div style={S.codeList}>
          {results.map((i) => (
            <button
              key={i.item_code}
              type="button"
              style={S.codeOpt}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(String(i.item_code)); setOpen(false); }}
            >
              <b>{i.item_code}</b> — {i.description}
            </button>
          ))}
        </div>
      )}
      {!known && (
        <div style={{ color: "#a12626", fontWeight: 800 }}>
          ⚠️ {t({ en: "unknown code", ar: "كود غير معروف" })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={S.rowLabel}>{label}</span>
      <input
        type={type}
        style={S.input}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** رفع الشعار إلى خدمة الصور (لا base64 داخل الإعدادات). */
function LogoUpload({ onDone, t }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "butcher_report_logo");
      fd.append("compress", "true");
      fd.append("maxDim", "600");
      fd.append("quality", "85");
      const res = await fetch(`${IMAGE_API_BASE}/api/images`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.optimized_url || data.url)) {
        throw new Error(data?.error || `Server ${res.status}`);
      }
      onDone(data.optimized_url || data.url);
    } catch (e) {
      setErr(e?.message || "upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" style={S.btn} disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? t({ en: "Uploading…", ar: "جارٍ الرفع…" }) : t({ en: "Upload logo", ar: "رفع شعار" })}
      </button>
      {err && <span style={{ color: "#a12626", fontWeight: 800 }}>{err}</span>}
    </>
  );
}

/** إدارة: تصدير/استيراد الإعدادات + سجل التغييرات من قاعدة التدقيق. */
function AdminTab({ t, isAr, model, onImport }) {
  const fileRef = useRef(null);
  const [audit, setAudit] = useState(null);
  const [auditErr, setAuditErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/audit?type=butcher_config&limit=30`, {
      headers: { Accept: "application/json" }, cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Server ${r.status}`))))
      .then((d) => { if (alive) setAudit(Array.isArray(d?.rows) ? d.rows : []); })
      .catch((e) => { if (alive) setAuditErr(e?.message || "error"); });
    return () => { alive = false; };
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `butcher-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file) => {
    if (!file) return;
    setMsg("");
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.cuts)) {
        throw new Error(t({ en: "Not a butcher settings file", ar: "الملف ليس إعدادات جزار" }));
      }
      onImport(mergeConfig(parsed));
      setMsg(t({
        en: "Loaded into the editor — press Save to apply.",
        ar: "تم التحميل في المحرّر — اضغط حفظ للتطبيق.",
      }));
    } catch (e) {
      setMsg(`${t({ en: "Import failed", ar: "فشل الاستيراد" })}: ${e?.message || e}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={S.card}>
      <div className="bg-sec" style={S.secTitle}>
        {t({ en: "Backup & restore", ar: "نسخة احتياطية واستعادة" })}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={S.btn} onClick={exportJson}>
          ⬇️ {t({ en: "Export settings (JSON)", ar: "تصدير الإعدادات (JSON)" })}
        </button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => importJson(e.target.files?.[0])} />
        <button type="button" style={S.btn} onClick={() => fileRef.current?.click()}>
          ⬆️ {t({ en: "Import settings", ar: "استيراد إعدادات" })}
        </button>
      </div>
      {msg && <div style={S.note}>{msg}</div>}

      <div className="bg-sec" style={S.secTitle}>
        {t({ en: "Change log", ar: "سجل التغييرات" })}
      </div>
      {auditErr && (
        <div style={S.note}>
          {t({
            en: "Change log is available to administrators on a deployed server.",
            ar: "سجل التغييرات متاح للمدراء على السيرفر المنشور.",
          })} ({auditErr})
        </div>
      )}
      {audit && audit.length === 0 && (
        <div style={S.note}>{t({ en: "No changes recorded yet.", ar: "لا تغييرات مسجّلة بعد." })}</div>
      )}
      {audit && audit.length > 0 && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>{t({ en: "When", ar: "الوقت" })}</th>
                <th style={S.th}>{t({ en: "User", ar: "المستخدم" })}</th>
                <th style={S.th}>{t({ en: "Action", ar: "الإجراء" })}</th>
                <th style={S.th}>{t({ en: "Route", ar: "المسار" })}</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((r) => (
                <tr key={r.id}>
                  <td style={S.td}>
                    {new Date(r.created_at).toLocaleString(isAr ? "ar-EG" : "en-GB", {
                      dateStyle: "short", timeStyle: "short",
                    })}
                  </td>
                  <td style={S.td}>{r.username || "—"}</td>
                  <td style={S.td}>{r.action}</td>
                  <td style={{ ...S.td, color: "#8aa3b8" }}>{r.route || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label style={S.rowField}>
      <span style={S.rowLabel}>{label}</span>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function ItemsTable({
  listKey, items, origins, isAr, t, title,
  editItem, editCode, editRef, removeItem, addItem, showArt,
  animals, codeAnimal, setCodeAnimal, grades, codeGrade, setCodeGrade, moveItem,
}) {
  const animalName = nameOf(animals.find((a) => a.id === codeAnimal) || {}, isAr) || codeAnimal;
  return (
    <div style={S.card}>
      <div className="bg-sec" style={S.secTitle}>{title}</div>

      {/* الأكواد والنِّسب تختلف حسب النوع — اختر النوع أولاً */}
      <div style={S.animalBar}>
        <span style={S.animalBarLbl}>
          {t({ en: "Codes & ratios for:", ar: "الأكواد والنِّسب لنوع:" })}
        </span>
        {animals.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => { setCodeAnimal(a.id); setCodeGrade(""); }}
            style={{ ...S.animalPick, ...(codeAnimal === a.id ? S.animalPickOn : null) }}
          >
            {nameOf(a, isAr)}
          </button>
        ))}
      </div>

      {/* الدرجة: كود خاص لكل درجة، و«عام» = الكود المشترك للنوع × المنشأ */}
      {(grades || []).length > 0 && (
        <div style={S.animalBar}>
          <span style={S.animalBarLbl}>{t({ en: "Grade:", ar: "الدرجة:" })}</span>
          <button
            type="button"
            onClick={() => setCodeGrade("")}
            style={{ ...S.animalPick, ...(codeGrade === "" ? S.animalPickOn : null) }}
          >
            {t({ en: "General", ar: "عام" })}
          </button>
          {grades.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setCodeGrade(x.id)}
              style={{ ...S.animalPick, ...(codeGrade === x.id ? S.animalPickOn : null) }}
            >
              {nameOf(x, isAr)}
            </button>
          ))}
        </div>
      )}

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>{t({ en: "Order", ar: "الترتيب" })}</th>
              <th style={S.th}>{t({ en: "On", ar: "مفعّل" })}</th>
              {showArt && <th style={S.th}>{t({ en: "Art", ar: "الرسمة" })}</th>}
              <th style={S.th}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</th>
              <th style={S.th}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</th>
              {origins.map((o) => (
                <th key={o.id} style={S.th}>
                  {t({ en: "Code", ar: "كود" })} — {isAr ? o.ar : o.en}
                </th>
              ))}
              <th style={S.th}>{t({ en: "Min %", ar: "أدنى نسبة ٪" })} · {animalName}</th>
              <th style={S.th}>{t({ en: "Max %", ar: "أعلى نسبة ٪" })} · {animalName}</th>
              <th style={S.th}>{t({ en: "ID", ar: "المعرّف" })}</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {sortByOrder(items).map((it) => (
              <tr key={it.id}>
                <td style={S.td}>
                  <div style={S.orderBtns}>
                    <button type="button" style={S.orderBtn}
                      onClick={() => moveItem(listKey, it.id, -1)}>▲</button>
                    <button type="button" style={S.orderBtn}
                      onClick={() => moveItem(listKey, it.id, 1)}>▼</button>
                  </div>
                </td>
                <td style={S.td}>
                  <input type="checkbox" checked={it.enabled !== false}
                    onChange={(e) => editItem(listKey, it.id, { enabled: e.target.checked })} />
                </td>
                {showArt && (
                  <td style={S.td}>
                    <span style={S.artCell}>
                      <ButcherArt id={it.art || it.id} />
                    </span>
                    <select
                      style={{ ...S.inputSm, width: 110, marginTop: 4 }}
                      value={it.art || it.id}
                      onChange={(e) => editItem(listKey, it.id, { art: e.target.value })}
                    >
                      {ART_IDS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td style={S.td}>
                  <input style={S.input} value={it.ar || ""}
                    onChange={(e) => editItem(listKey, it.id, { ar: e.target.value })} />
                </td>
                <td style={S.td}>
                  <input style={S.input} value={it.en || ""}
                    onChange={(e) => editItem(listKey, it.id, { en: e.target.value })} />
                </td>
                {origins.map((o) => (
                  <td key={o.id} style={S.td}>
                    <CodePicker
                      value={(it.codes && (it.codes[codeKey(codeAnimal, o.id, codeGrade)] ?? (codeGrade ? "" : it.codes[o.id]))) || ""}
                      onChange={(v) => editCode(listKey, it.id, o.id, v)}
                      t={t}
                    />
                  </td>
                ))}
                <td style={S.td}>
                  <input style={S.inputSm} value={it.refs?.[codeAnimal]?.min ?? ""} inputMode="decimal"
                    onChange={(e) => editRef(listKey, it.id, "min", e.target.value)} />
                </td>
                <td style={S.td}>
                  <input style={S.inputSm} value={it.refs?.[codeAnimal]?.max ?? ""} inputMode="decimal"
                    onChange={(e) => editRef(listKey, it.id, "max", e.target.value)} />
                </td>
                <td style={{ ...S.td, color: "#8aa3b8" }}>
                  {it.id}
                  {it.weightOnly && <div style={S.tag}>{t({ en: "weight only", ar: "وزن فقط" })}</div>}
                  {it.whole && <div style={S.tag}>{t({ en: "whole", ar: "ذبيحة كاملة" })}</div>}
                </td>
                <td style={S.td}>
                  {it.custom && (
                    <button type="button" style={S.del} onClick={() => removeItem(listKey, it.id)}>
                      {t({ en: "Delete", ar: "حذف" })}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={S.note}>
        {t({
          en: "Item codes come from the returns catalog (items.json). Leave a target empty to hide that row from the reference panel.",
          ar: "الأكواد مأخوذة من قائمة أكواد المرتجعات (items.json). اترك النسبة فارغة لإخفاء السطر من لوحة النِّسب.",
        })}
      </div>
      <button type="button" style={S.btn} onClick={() => addItem(listKey)}>
        + {t({ en: "Add item", ar: "إضافة عنصر" })}
      </button>
    </div>
  );
}

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: 1400, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  title: { fontWeight: 900 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  headerBtns: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },
  btn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "none" },
  btnOff: { background: "#a9c3dd", cursor: "not-allowed" },

  saveBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "10px 14px", marginBottom: 12, fontWeight: 800, color: "#6b8299",
    flexWrap: "wrap",
  },
  saveBarOn: { border: "2px solid #f59e0b", background: "#fffbeb", color: "#92400e" },

  tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  tab: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "9px 20px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  tabOn: { background: "#1f6fd0", color: "#fff", border: "1px solid #1f6fd0" },

  card: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: 16, display: "flex", flexDirection: "column", gap: 12,
  },
  secTitle: { fontWeight: 900, color: "#14507f" },
  rowField: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
    padding: "10px 0", borderTop: "1px solid #f0f5fa", fontWeight: 700, flexWrap: "wrap",
  },
  rowLabel: { flex: 1 },
  note: { color: "#8aa3b8", fontWeight: 600, lineHeight: 1.6 },

  tableWrap: {
    overflowX: "auto", WebkitOverflowScrolling: "touch",
    border: "1px solid #eef4fa", borderRadius: 10,
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: {
    background: "#dceaf8", color: "#14507f", fontWeight: 900,
    padding: "10px 8px", textAlign: "center", whiteSpace: "nowrap",
  },
  td: { padding: "7px 8px", borderTop: "1px solid #f2f7fc", textAlign: "center", verticalAlign: "middle" },
  input: {
    border: "1px solid #cfe0f0", borderRadius: 8, padding: "7px 9px", minWidth: 130,
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff", outline: "none",
  },
  inputSm: {
    border: "1px solid #cfe0f0", borderRadius: 8, padding: "7px 9px", width: 92,
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", textAlign: "center",
  },
  artCell: { display: "block", width: 44, height: 44, margin: "0 auto" },
  tag: {
    display: "inline-block", background: "#eef4fb", border: "1px solid #dbe6f2",
    borderRadius: 999, padding: "1px 8px", marginTop: 3, color: "#6b8299", fontWeight: 800,
  },
  orderBtns: { display: "flex", flexDirection: "column", gap: 2 },
  orderBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 6, padding: "0 6px", cursor: "pointer", fontFamily: FONT, lineHeight: 1.4,
  },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12 },
  logoPreview: {
    height: 46, maxWidth: 190, objectFit: "contain",
    border: "1px solid #dbe6f2", borderRadius: 8, background: "#fff", padding: 4,
  },
  codeWrap: { position: "relative" },
  codeList: {
    position: "absolute", zIndex: 30, insetInlineStart: 0, top: "100%",
    background: "#fff", border: "1px solid #cfe0f0", borderRadius: 10,
    boxShadow: "0 10px 24px rgba(15,39,64,.14)", minWidth: 320, maxHeight: 260,
    overflowY: "auto", textAlign: "start",
  },
  codeOpt: {
    display: "block", width: "100%", textAlign: "start", border: "none",
    background: "transparent", padding: "8px 10px", cursor: "pointer",
    fontFamily: FONT, color: "#0f2740", borderBottom: "1px solid #f2f7fc",
  },
  codeBad: { border: "2px solid #f5c2c2", background: "#fff7f7" },
  animalBar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  animalBarLbl: { fontWeight: 800, color: "#6b8299" },
  animalPick: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "6px 16px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  animalPickOn: { background: "#14507f", color: "#fff", border: "1px solid #14507f" },
  originPicks: { display: "flex", gap: 6, flexWrap: "wrap" },
  originPick: {
    display: "inline-flex", alignItems: "center", gap: 4,
    border: "1px solid #e3ebf3", borderRadius: 999, padding: "2px 10px",
    fontWeight: 700, color: "#8aa3b8", cursor: "pointer",
  },
  originPickOn: { borderColor: "#9fc6ea", background: "#f2f8ff", color: "#14507f" },
  del: {
    border: "1px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 9, padding: "5px 12px", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
  },
};
