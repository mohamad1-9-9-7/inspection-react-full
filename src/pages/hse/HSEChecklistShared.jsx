// src/pages/hse/HSEChecklistShared.jsx
// مكون مشترك لنماذج Checklist (F-32, F-33, F-34) — Yes/No/N/A + ملاحظات

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

/**
 * Generic checklist form
 * Props:
 *  - storageKey: localStorage type key
 *  - formCode: "F-32" / "F-33" / "F-34"
 *  - titleAr/titleEn, subtitleAr/subtitleEn
 *  - icon (string emoji)
 *  - sourceCode (e.g. "SBG-HSE-020")
 *  - sections: [{ id, titleAr, titleEn, items: [{ar, en, note?}] }]
 *  - extraFields (optional): array of { v, ar, en, type }
 */
export default function HSEChecklist({
  storageKey, formCode, titleAr, titleEn, subtitleAr, subtitleEn,
  icon = "📋", sourceCode, sections, extraFields = [],
  steps = [], guidance = [],
}) {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(makeBlank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const totalQuestions = sections.reduce((acc, s) => acc + s.items.length, 0);
  const rules = useMemo(() => {
    const hasNo = (d) => Object.values(d.results || {}).includes("no");
    return [
      { key: "date", label: { ar: "التاريخ", en: "Date" }, type: "date", required: true, notFuture: true },
      { key: "inspector", label: { ar: "المفتش", en: "Inspector" }, required: true, minLength: 2, maxLength: 80 },
      { key: "location", label: { ar: "الموقع", en: "Location" }, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
      { key: "area", label: { ar: "المنطقة المحددة", en: "Specific Area" }, maxLength: 120 },
      ...extraFields.map((f) => ({
        key: f.v, label: { ar: f.ar, en: f.en },
        type: f.type === "number" ? "number" : f.type === "date" ? "date" : "text",
        min: f.min, max: f.max, required: f.required, maxLength: f.type ? undefined : 120,
      })),
      { key: "results", label: { ar: "بنود الفحص", en: "Checklist items" },
        custom: (v) => {
          const answered = Object.values(v || {}).filter(Boolean).length;
          return answered < totalQuestions
            ? { ar: `أجب على كل البنود (${answered} من ${totalQuestions})`, en: `Answer every item (${answered} of ${totalQuestions})` }
            : null;
        } },
      { key: "observations", label: { ar: "ملاحظات إضافية", en: "Additional Observations" }, maxLength: 2000 },
      { key: "correctiveActions", label: { ar: "إجراءات تصحيحية مطلوبة", en: "Corrective Actions Required" }, maxLength: 2000,
        requiredIf: hasNo, requiredMsg: { ar: "يوجد بند مخالف — اكتب الإجراء التصحيحي", en: "An item failed — write the corrective action" } },
      { key: "followUpDate", label: { ar: "تاريخ المتابعة", en: "Follow-up Date" }, type: "date", after: "date",
        requiredIf: hasNo, requiredMsg: { ar: "يوجد بند مخالف — حدّد تاريخ المتابعة", en: "An item failed — set a follow-up date" } },
      { key: "preparedBy", label: { ar: "أعدّ الفحص", en: "Prepared By" }, required: true, maxLength: 80 },
      { key: "reviewedBy", label: { ar: "راجع الفحص", en: "Reviewed By" }, maxLength: 80,
        custom: (v, d) => v && d.preparedBy && v.trim().toLowerCase() === d.preparedBy.trim().toLowerCase()
          ? { ar: "المراجِع يجب أن يكون شخصاً غير المُعِد", en: "The reviewer must be a different person from the preparer" } : null },
    ];
  }, [extraFields, totalQuestions]);
  const validation = useHSEValidation(rules, draft, lang);

  function makeBlank() {
    return {
      reportNo: `${formCode.replace("-", "")}-${Date.now().toString().slice(-6)}`,
      date: todayISO(),
      location: SITE_LOCATIONS[0].v, area: "",
      inspector: "",
      results: {},
      observations: "",
      correctiveActions: "",
      followUpDate: "",
      preparedBy: "", reviewedBy: "",
      ...Object.fromEntries(extraFields.map((f) => [f.v, ""])),
    };
  }

  async function reload() {
    const arr = await apiList(storageKey);
    setItems(arr);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [storageKey]);
  function printReport() { window.print(); }

  function setResult(itemKey, val) {
    setDraft((d) => ({ ...d, results: { ...d.results, [itemKey]: val } }));
  }

  function startEdit(it) {
    setDraft({ ...makeBlank(), ...it });
    setEditingId(it.id);
    setViewing(null);
    validation.reset();
    setTab("new");
  }

  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(storageKey, editingId, draft, draft.inspector || "HSE");
      } else {
        await apiSave(storageKey, draft, draft.inspector || "HSE");
      }
      await reload();
      alert(lang === "ar" ? "✅ تم الحفظ" : "✅ Saved");
      setDraft(makeBlank()); setEditingId(null); validation.reset(); setTab("list");
    } catch (e) {
      alert((lang === "ar" ? "❌ خطأ بالحفظ: " : "❌ Save error: ") + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }
  async function remove(id) {
    if (!window.confirm(lang === "ar" ? "حذف؟" : "Delete?")) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((lang === "ar" ? "❌ خطأ بالحذف: " : "❌ Delete error: ") + (e?.message || e));
    }
  }

  // Stats
  const all = Object.values(draft.results);
  const stats = {
    yes: all.filter((v) => v === "yes").length,
    no: all.filter((v) => v === "no").length,
    na: all.filter((v) => v === "na").length,
    total: all.length,
  };
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const passRate = stats.total ? Math.round((stats.yes / stats.total) * 100) : 0;

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{icon} {pick({ ar: titleAr, en: titleEn })}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick({ ar: subtitleAr, en: subtitleEn })}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>
              {lang === "ar" ? "📋 السجل" : "📋 Records"} ({items.length})
            </button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(makeBlank()); setEditingId(null); validation.reset(); setTab("new"); }}>
              {lang === "ar" ? "+ فحص جديد" : "+ New Inspection"}
            </button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>
              {lang === "ar" ? "← HSE" : "← HSE"}
            </button>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: set(k), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const ANSWERS = [
            { v: "yes", label: lang === "ar" ? "✅ نعم" : "✅ Yes", cls: "ph-select-ok" },
            { v: "no",  label: lang === "ar" ? "❌ لا" : "❌ No",  cls: "ph-select-bad" },
            { v: "na",  label: lang === "ar" ? "⊘ لا ينطبق" : "⊘ N/A", cls: "hk-na" },
          ];
          let n = 0;
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: titleAr, en: titleEn }}
              subtitle={{ ar: subtitleAr, en: subtitleEn }}
              docNo={formCode}
              accent={HSE_COLORS.primary}
              headerFields={[
                { label: lang === "ar" ? "رقم الفحص" : "Inspection No.", value: draft.reportNo },
                ...(sourceCode ? [{ label: lang === "ar" ? "المرجع" : "Source", value: sourceCode }] : []),
              ]}
              steps={steps.length ? steps : [
                { ar: "اكتب التاريخ والمفتش والموقع والمنطقة المحددة.", en: "Enter the date, the inspector, the location and the specific area." },
                { ar: "أجب على كل بند: «نعم» إذا كان مطابقاً، «لا» إذا كان مخالفاً، و«لا ينطبق» فقط إذا لم يكن البند موجوداً في الموقع.", en: "Answer every item: “Yes” if compliant, “No” if not, and “N/A” only when the item does not exist at the site." },
                { ar: "أي بند «لا» يلزمك بكتابة الإجراء التصحيحي وتحديد تاريخ متابعة بعد تاريخ الفحص.", en: "Any “No” requires a corrective action and a follow-up date after the inspection date." },
                { ar: "يوقّع المُعِد، ويراجع الفحص شخص آخر.", en: "The preparer signs, and a different person reviews." },
              ]}
              guidance={guidance}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(makeBlank()); validation.reset(); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات الفحص" : "Inspection details"}>
                <HSEField {...f("date")} type="date" label={lang === "ar" ? "التاريخ" : "Date"} />
                <HSEField {...f("inspector")} label={lang === "ar" ? "المفتش" : "Inspector"} />
                <HSEField {...f("location")} type="select" label={lang === "ar" ? "الموقع" : "Location"}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("area")} label={lang === "ar" ? "المنطقة المحددة" : "Specific Area"} />
                {extraFields.map((x) => (
                  <HSEField key={x.v} {...f(x.v)} type={x.type || "text"} label={pick({ ar: x.ar, en: x.en })} />
                ))}
              </HSEPanel>

              <div className="ph-stats">
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "مطابق" : "Yes"}</div><div className="ph-stat-value" style={{ color: "#166534" }}>{stats.yes}</div></div>
                <div className={`ph-stat${stats.no ? " ph-stat-bad" : ""}`}><div className="ph-stat-label">{lang === "ar" ? "مخالف" : "No"}</div><div className="ph-stat-value">{stats.no}</div></div>
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "لا ينطبق" : "N/A"}</div><div className="ph-stat-value" style={{ color: "#64748b" }}>{stats.na}</div></div>
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "تمت الإجابة" : "Answered"}</div><div className="ph-stat-value">{stats.total}/{totalItems}</div></div>
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "نسبة المطابقة" : "Pass rate"}</div><div className="ph-stat-value">{stats.total ? `${passRate}%` : "—"}</div></div>
              </div>

              <div className="ph-table-wrap" data-hk-field="results"
                style={{ marginBottom: 14, borderColor: validation.errors.results ? "#dc2626" : undefined }}>
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th style={{ textAlign: "start" }}>{lang === "ar" ? "البند" : "Item"}</th>
                      <th style={{ width: 340 }}>{lang === "ar" ? "النتيجة" : "Result"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec) => (
                      <React.Fragment key={sec.id}>
                        <tr className="ph-section-row"><td colSpan={3}>{pick({ ar: sec.titleAr, en: sec.titleEn })}</td></tr>
                        {sec.items.map((it, idx) => {
                          const key = `${sec.id}-${idx}`;
                          const val = draft.results[key];
                          n += 1;
                          return (
                            <tr key={key} style={!val && validation.errors.results ? { background: "#fef2f2" } : undefined}>
                              <td className="ph-num">{n}</td>
                              <td style={{ fontWeight: 600 }}>
                                {pick(it)}
                                {it.note && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{pick(it.note)}</div>}
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  {ANSWERS.map((opt) => (
                                    <button key={opt.v} type="button" onClick={() => setResult(key, opt.v)}
                                      className={`ph-select ${val === opt.v ? opt.cls : "ph-select-empty"}`}
                                      style={{ flex: 1, minHeight: 40, padding: "6px 8px" }}>
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {validation.errors.results && <div className="hk-err" style={{ margin: "-6px 0 14px" }}>{validation.errors.results}</div>}

              <HSEPanel title={lang === "ar" ? "الملاحظات والإجراءات" : "Findings & actions"}>
                <HSEField {...f("observations")} type="textarea" full label={lang === "ar" ? "ملاحظات إضافية" : "Additional Observations"} />
                <HSEField {...f("correctiveActions")} type="textarea" full label={lang === "ar" ? "إجراءات تصحيحية مطلوبة" : "Corrective Actions Required"} />
                <HSEField {...f("followUpDate")} type="date" label={lang === "ar" ? "تاريخ المتابعة" : "Follow-up Date"} />
              </HSEPanel>

              <HSEPanel title={lang === "ar" ? "التوقيعات" : "Signatures"}>
                <HSEField {...f("preparedBy")} label={lang === "ar" ? "أعدّ الفحص" : "Prepared By"} />
                <HSEField {...f("reviewedBy")} label={lang === "ar" ? "راجع الفحص" : "Reviewed By"} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

        {tab === "list" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{lang === "ar" ? "الرقم" : "No."}</th>
                  <th style={thStyle}>{lang === "ar" ? "التاريخ" : "Date"}</th>
                  <th style={thStyle}>{lang === "ar" ? "الموقع" : "Location"}</th>
                  <th style={thStyle}>{lang === "ar" ? "المفتش" : "Inspector"}</th>
                  <th style={thStyle}>{lang === "ar" ? "النتيجة" : "Result"}</th>
                  <th style={thStyle}>{lang === "ar" ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const all = Object.values(it.results || {});
                  const yes = all.filter((v) => v === "yes").length;
                  const total = all.length;
                  const rate = total ? Math.round((yes / total) * 100) : 0;
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{it.inspector}</td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 800, color: rate >= 80 ? "#166534" : rate >= 60 ? "#854d0e" : "#b91c1c" }}>
                          {rate}% ✅
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => setViewing(it)}>
                            {lang === "ar" ? "👁️ عرض" : "👁️ View"}
                          </button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>
                            {lang === "ar" ? "✏️ تعديل" : "✏️ Edit"}
                          </button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>
                            {lang === "ar" ? "حذف" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="6" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{lang === "ar" ? "لا يوجد سجلات" : "No records"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewing && (
          <div className="hse-modal-backdrop" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 20,
          }} onClick={() => setViewing(null)}>
            <div onClick={(e) => e.stopPropagation()} className="hse-print-area" style={{
              background: "#fff", borderRadius: 14, padding: 30,
              maxWidth: 800, width: "100%", maxHeight: "92vh", overflow: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.30)", direction: dir,
            }}>
              <div style={{
                borderBottom: `3px solid ${HSE_COLORS.primary}`, paddingBottom: 12, marginBottom: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{icon} {pick({ ar: titleAr, en: titleEn })}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE · {sourceCode}</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>
                    {lang === "ar" ? "🖨️ طباعة" : "🖨️ Print"}
                  </button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>
                    {lang === "ar" ? "✖ إغلاق" : "✖ Close"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10, marginBottom: 16 }}>
                <div><b>{lang === "ar" ? "الرقم" : "No."}: </b>{viewing.reportNo}</div>
                <div><b>{lang === "ar" ? "التاريخ" : "Date"}: </b>{viewing.date}</div>
                <div><b>{lang === "ar" ? "الموقع" : "Location"}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{lang === "ar" ? "المنطقة" : "Area"}: </b>{viewing.area || "—"}</div>
                <div><b>{lang === "ar" ? "المفتش" : "Inspector"}: </b>{viewing.inspector}</div>
                {extraFields.map((f) => viewing[f.v] && (
                  <div key={f.v}><b>{pick({ ar: f.ar, en: f.en })}: </b>{viewing[f.v]}</div>
                ))}
              </div>

              {(() => {
                const all = Object.values(viewing.results || {});
                const yes = all.filter((v) => v === "yes").length;
                const no = all.filter((v) => v === "no").length;
                const na = all.filter((v) => v === "na").length;
                const rate = all.length ? Math.round((yes / all.length) * 100) : 0;
                const bg = rate >= 80 ? "#dcfce7" : rate >= 60 ? "#fef9c3" : "#fee2e2";
                const cl = rate >= 80 ? "#166534" : rate >= 60 ? "#854d0e" : "#b91c1c";
                return (
                  <div style={{ padding: 14, marginBottom: 16, borderRadius: 10, background: bg, color: cl, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {lang === "ar" ? "✅" : "✅"} <b>{yes}</b> · {lang === "ar" ? "❌" : "❌"} <b>{no}</b> · ⊘ <b>{na}</b>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 950 }}>{rate}%</div>
                  </div>
                );
              })()}

              {sections.map((sec) => (
                <div key={sec.id} style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                  <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>
                    {pick({ ar: sec.titleAr, en: sec.titleEn })}
                  </div>
                  {sec.items.map((it, i) => {
                    const key = `${sec.id}-${i}`;
                    const val = viewing.results?.[key];
                    const sym = val === "yes" ? "✅" : val === "no" ? "❌" : val === "na" ? "⊘" : "—";
                    const cl = val === "yes" ? "#166534" : val === "no" ? "#b91c1c" : "#64748b";
                    const rowBg = val === "no" ? "#fee2e2" : "transparent";
                    return (
                      <div key={key} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 8px", borderBottom: "1px solid rgba(120,53,15,0.08)",
                        fontSize: 12, background: rowBg, borderRadius: 6,
                      }}>
                        <div style={{ flex: 1 }}>{pick(it)}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: cl, minWidth: 30, textAlign: "center" }}>{sym}</div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {viewing.observations && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fef9c3" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#854d0e" }}>📝 {lang === "ar" ? "ملاحظات" : "Notes"}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{String(viewing.observations || "")}</div>
                </div>
              )}

              {viewing.correctiveActions && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fee2e2" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#7f1d1d" }}>⚠️ {lang === "ar" ? "إجراءات تصحيحية" : "Corrective Actions"}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{String(viewing.correctiveActions || "")}</div>
                  {viewing.followUpDate && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#7f1d1d" }}>
                      📅 {lang === "ar" ? "متابعة" : "Follow-up"}: <b>{viewing.followUpDate}</b>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{lang === "ar" ? "أعدّ الفحص" : "Prepared By"}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{lang === "ar" ? "راجع الفحص" : "Reviewed By"}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.reviewedBy || "_______________"}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, fontSize: 10, color: "#64748b", textAlign: "center" }}>
                Form {formCode} · {sourceCode} · AL MAWASHI HSE
              </div>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .hse-print-area, .hse-print-area * { visibility: visible; }
            .hse-print-area {
              position: absolute !important;
              left: 0; top: 0;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .hse-modal-backdrop { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    </main>
  );
}
