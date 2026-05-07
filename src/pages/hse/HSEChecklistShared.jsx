// src/pages/hse/HSEChecklistShared.jsx
// مكون مشترك لنماذج Checklist (F-32, F-33, F-34) — Yes/No/N/A + ملاحظات

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

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
}) {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(makeBlank());
  const [viewing, setViewing] = useState(null);

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

  useEffect(() => { setItems(loadLocal(storageKey)); /* eslint-disable-next-line */ }, [storageKey]);
  function printReport() { window.print(); }

  function setResult(itemKey, val) {
    setDraft((d) => ({ ...d, results: { ...d.results, [itemKey]: val } }));
  }

  function save() {
    if (!draft.inspector.trim()) {
      alert(lang === "ar" ? "أدخل اسم المفتش" : "Enter inspector name");
      return;
    }
    appendLocal(storageKey, draft);
    setItems(loadLocal(storageKey));
    alert(lang === "ar" ? "✅ تم الحفظ" : "✅ Saved");
    setDraft(makeBlank()); setTab("list");
  }
  function remove(id) {
    if (!window.confirm(lang === "ar" ? "حذف؟" : "Delete?")) return;
    deleteLocal(storageKey, id);
    setItems(loadLocal(storageKey));
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>
              {lang === "ar" ? "+ فحص جديد" : "+ New Inspection"}
            </button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>
              {lang === "ar" ? "← HSE" : "← HSE"}
            </button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "رقم الفحص" : "Inspection No."}</label>
                <input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} />
              </div>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "التاريخ" : "Date"}</label>
                <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "المفتش" : "Inspector"}</label>
                <input type="text" value={draft.inspector} onChange={(e) => setDraft({ ...draft, inspector: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "الموقع" : "Location"}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "المنطقة المحددة" : "Specific Area"}</label>
                <input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} />
              </div>
              {extraFields.map((f) => (
                <div key={f.v}>
                  <label style={labelStyle}>{pick({ ar: f.ar, en: f.en })}</label>
                  <input type={f.type || "text"} value={draft[f.v] || ""} onChange={(e) => setDraft({ ...draft, [f.v]: e.target.value })} style={inputStyle} />
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 14, padding: 12, borderRadius: 10,
              background: "#fff7ed", border: "1px dashed rgba(120,53,15,0.18)",
              display: "flex", gap: 14, fontSize: 13, fontWeight: 800, flexWrap: "wrap",
            }}>
              <span style={{ color: "#166534" }}>{lang === "ar" ? "✅ مطابق:" : "✅ Yes:"} {stats.yes}</span>
              <span style={{ color: "#b91c1c" }}>{lang === "ar" ? "❌ مخالف:" : "❌ No:"} {stats.no}</span>
              <span style={{ color: "#64748b" }}>{lang === "ar" ? "⊘ غير مطبق:" : "⊘ N/A:"} {stats.na}</span>
              <span>{lang === "ar" ? "تم الإجابة:" : "Answered:"} {stats.total}/{totalItems}</span>
              {stats.total > 0 && <span style={{ marginInlineStart: "auto", fontSize: 16 }}>{passRate}%</span>}
            </div>

            {sections.map((sec) => (
              <div key={sec.id} style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>
                  {pick({ ar: sec.titleAr, en: sec.titleEn })}
                </div>
                {sec.items.map((it, idx) => {
                  const key = `${sec.id}-${idx}`;
                  const val = draft.results[key];
                  return (
                    <div key={key} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(120,53,15,0.08)", flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
                        {pick(it)}
                        {it.note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{pick(it.note)}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { v: "yes", label: "✅", color: "#dcfce7", border: "#166534" },
                          { v: "no",  label: "❌", color: "#fee2e2", border: "#b91c1c" },
                          { v: "na",  label: "⊘",  color: "#f1f5f9", border: "#64748b" },
                        ].map((opt) => (
                          <button key={opt.v} type="button" onClick={() => setResult(key, opt.v)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            background: val === opt.v ? opt.color : "#fff",
                            border: `2px solid ${val === opt.v ? opt.border : "rgba(120,53,15,0.18)"}`,
                            cursor: "pointer", fontWeight: 800, fontSize: 13,
                          }}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{lang === "ar" ? "ملاحظات إضافية" : "Additional Observations"}</label>
              <textarea value={draft.observations} onChange={(e) => setDraft({ ...draft, observations: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{lang === "ar" ? "إجراءات تصحيحية مطلوبة" : "Corrective Actions Required"}</label>
              <textarea value={draft.correctiveActions} onChange={(e) => setDraft({ ...draft, correctiveActions: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{lang === "ar" ? "تاريخ المتابعة" : "Follow-up Date"}</label>
              <input type="date" value={draft.followUpDate} onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })} style={{ ...inputStyle, maxWidth: 250 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "أعدّ الفحص" : "Prepared By"}</label>
                <input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{lang === "ar" ? "راجع الفحص" : "Reviewed By"}</label>
                <input type="text" value={draft.reviewedBy} onChange={(e) => setDraft({ ...draft, reviewedBy: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{lang === "ar" ? "💾 حفظ" : "💾 Save"}</button>
              <button style={buttonGhost} onClick={() => setTab("list")}>{lang === "ar" ? "إلغاء" : "Cancel"}</button>
            </div>
          </div>
        )}

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
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>
                          {lang === "ar" ? "👁️ عرض" : "👁️ View"}
                        </button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>
                          {lang === "ar" ? "حذف" : "Delete"}
                        </button>
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
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{viewing.observations}</div>
                </div>
              )}

              {viewing.correctiveActions && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fee2e2" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#7f1d1d" }}>⚠️ {lang === "ar" ? "إجراءات تصحيحية" : "Corrective Actions"}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{viewing.correctiveActions}</div>
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
