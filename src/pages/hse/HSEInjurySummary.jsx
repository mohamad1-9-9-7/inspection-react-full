// src/pages/hse/HSEInjurySummary.jsx
// F-22: ملخص الإصابات الشهري — Injury Summary (SBG-HSE-003)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "injury_summaries";

const T = {
  title:        { ar: "🩹 ملخص الإصابات (F-22) — Injury Summary", en: "🩹 Injury Summary (F-22)" },
  subtitle:     { ar: "جدول شهري تجميعي لكل الإصابات (مطابق SBG-HSE-003) — مكمل لـ F-01",
                  en: "Monthly consolidated table of all injuries (per SBG-HSE-003) — complement to F-01" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ ملخص جديد", en: "+ New Summary" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },
  month:        { ar: "الشهر", en: "Month" },
  monthPh:      { ar: "مثلاً: مايو 2026", en: "e.g. May 2026" },
  location:     { ar: "الموقع", en: "Location" },
  contractNo:   { ar: "رقم العقد / BI", en: "Contract / BI No." },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },

  s1Title:      { ar: "🩹 سجل الإصابات", en: "🩹 Injury Records" },
  s2Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },

  caseNo:       { ar: "رقم الحالة", en: "Case No." },
  injDate:      { ar: "تاريخ الإصابة", en: "Date of Injury" },
  injName:      { ar: "اسم المصاب", en: "Name of Injured" },
  badgeNo:      { ar: "رقم الشارة", en: "Badge No." },
  craft:        { ar: "المهنة / الوظيفة", en: "Craft / Profession" },
  natureBody:   { ar: "نوع الإصابة / العضو المصاب", en: "Nature of Injury / Body Part" },
  daysLost:     { ar: "أيام الفقد", en: "Days Lost" },
  remarks:      { ar: "ملاحظات", en: "Remarks" },
  addRow:       { ar: "+ إضافة حالة", en: "+ Add Case" },
  removeRow:    { ar: "حذف", en: "Remove" },

  totalCases:   { ar: "إجمالي الحالات", en: "Total Cases" },
  totalDays:    { ar: "إجمالي أيام الفقد", en: "Total Days Lost" },

  saveBtn:      { ar: "💾 حفظ الملخص", en: "💾 Save Summary" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needMonth:    { ar: "أدخل الشهر", en: "Enter month" },
  saved:        { ar: "✅ تم حفظ الملخص", en: "✅ Summary saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد ملخصات", en: "No summaries" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    month:     { ar: "الشهر", en: "Month" },
    location:  { ar: "الموقع", en: "Location" },
    cases:     { ar: "الحالات", en: "Cases" },
    days:      { ar: "أيام الفقد", en: "Days Lost" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  signPrep:     { ar: "أعدّ التقرير / Safety Supervisor", en: "Prepared By / Safety Supervisor" },
  signMgr:      { ar: "اعتمد التقرير / HSE Manager", en: "Approved By / HSE Manager" },
  formFooter:   { ar: "Form F-22 · Injury Summary · AL MAWASHI HSE",
                  en: "Form F-22 · Injury Summary · AL MAWASHI HSE" },
};

const blankRow = () => ({ date: "", name: "", badge: "", craft: "", nature: "", days: "", remarks: "" });

const blank = () => ({
  reportNo: `INJ-${Date.now().toString().slice(-6)}`,
  month: "", contractNo: "", preparedBy: "", approvedBy: "",
  location: SITE_LOCATIONS[0].v,
  rows: [blankRow()],
});

export default function HSEInjurySummary() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function setRow(idx, field, val) {
    setDraft((d) => {
      const rows = [...d.rows];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...d, rows };
    });
  }
  function addRow() {
    setDraft((d) => ({ ...d, rows: [...d.rows, blankRow()] }));
  }
  function removeRow(idx) {
    setDraft((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== idx) }));
  }

  function save() {
    if (!draft.month.trim()) { alert(pick(T.needMonth)); return; }
    appendLocal(TYPE, draft);
    setItems(loadLocal(TYPE));
    alert(pick(T.saved));
    setDraft(blank()); setTab("list");
  }
  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    deleteLocal(TYPE, id);
    setItems(loadLocal(TYPE));
  }

  const totalDays = (draft.rows || []).reduce((acc, r) => acc + (Number(r.days) || 0), 0);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newReport)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.month)}</label><input type="text" value={draft.month} placeholder={pick(T.monthPh)} onChange={(e) => setDraft({ ...draft, month: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.contractNo)}</label><input type="text" value={draft.contractNo} onChange={(e) => setDraft({ ...draft, contractNo: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>{pick(T.injDate)}</th>
                    <th style={thStyle}>{pick(T.injName)}</th>
                    <th style={thStyle}>{pick(T.badgeNo)}</th>
                    <th style={thStyle}>{pick(T.craft)}</th>
                    <th style={thStyle}>{pick(T.natureBody)}</th>
                    <th style={thStyle}>{pick(T.daysLost)}</th>
                    <th style={thStyle}>{pick(T.remarks)}</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.rows || []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                      <td style={tdStyle}><input type="date" value={r.date} onChange={(e) => setRow(i, "date", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.badge} onChange={(e) => setRow(i, "badge", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.craft} onChange={(e) => setRow(i, "craft", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><textarea rows="2" value={r.nature} onChange={(e) => setRow(i, "nature", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, minHeight: 32 }} /></td>
                      <td style={tdStyle}><input type="number" value={r.days} onChange={(e) => setRow(i, "days", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, width: 60 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.remarks} onChange={(e) => setRow(i, "remarks", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}>
                        {(draft.rows || []).length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} style={{ ...buttonGhost, padding: "3px 8px", fontSize: 11, color: "#b91c1c" }}>{pick(T.removeRow)}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow} style={{ ...buttonGhost, marginTop: 8, fontSize: 12 }}>{pick(T.addRow)}</button>

            <div style={{ marginTop: 12, padding: 10, background: "#fff7ed", borderRadius: 10, display: "flex", gap: 18, fontSize: 13, fontWeight: 800 }}>
              <span>{pick(T.totalCases)}: <b>{(draft.rows || []).filter((r) => r.name.trim()).length}</b></span>
              <span>{pick(T.totalDays)}: <b>{totalDays}</b></span>
            </div>

            <SectionHeader title={pick(T.s2Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.signPrep)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.signMgr)}</label><input type="text" value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
              <button style={buttonGhost} onClick={() => setTab("list")}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {tab === "list" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.cols.no)}</th>
                  <th style={thStyle}>{pick(T.cols.month)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.cases)}</th>
                  <th style={thStyle}>{pick(T.cols.days)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const cases = (it.rows || []).filter((r) => r.name?.trim()).length;
                  const days = (it.rows || []).reduce((acc, r) => acc + (Number(r.days) || 0), 0);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.month}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{cases}</td>
                      <td style={tdStyle}>{days}</td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="6" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
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
              maxWidth: 1000, width: "100%", maxHeight: "92vh", overflow: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.30)", direction: dir,
            }}>
              <div style={{
                borderBottom: `3px solid ${HSE_COLORS.primary}`, paddingBottom: 12, marginBottom: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(T.title)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.closeModal)}</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10, marginBottom: 16 }}>
                <div><b>{pick(T.reportNo)}: </b>{viewing.reportNo}</div>
                <div><b>{pick(T.month)}: </b>{viewing.month}</div>
                <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.contractNo)}: </b>{viewing.contractNo || "—"}</div>
              </div>

              <SectionHeader title={pick(T.s1Title)} />
              <div style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>{pick(T.injDate)}</th>
                      <th style={thStyle}>{pick(T.injName)}</th>
                      <th style={thStyle}>{pick(T.badgeNo)}</th>
                      <th style={thStyle}>{pick(T.craft)}</th>
                      <th style={thStyle}>{pick(T.natureBody)}</th>
                      <th style={thStyle}>{pick(T.daysLost)}</th>
                      <th style={thStyle}>{pick(T.remarks)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.rows || []).map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                        <td style={tdStyle}>{r.date || "—"}</td>
                        <td style={tdStyle}>{r.name || "—"}</td>
                        <td style={tdStyle}>{r.badge || "—"}</td>
                        <td style={tdStyle}>{r.craft || "—"}</td>
                        <td style={tdStyle}>{r.nature || "—"}</td>
                        <td style={tdStyle}>{r.days || "—"}</td>
                        <td style={tdStyle}>{r.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signPrep)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signMgr)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.approvedBy || "_______________"}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, fontSize: 10, color: "#64748b", textAlign: "center" }}>{pick(T.formFooter)}</div>
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

function SectionHeader({ title }) {
  return (
    <div style={{
      marginTop: 18, marginBottom: 10,
      fontSize: 14, fontWeight: 950, color: HSE_COLORS.primaryDark,
      padding: "8px 12px", borderRadius: 10,
      background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
    }}>{title}</div>
  );
}
