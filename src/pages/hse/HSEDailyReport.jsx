// src/pages/hse/HSEDailyReport.jsx
// F-27: التقرير اليومي للسلامة — Daily Report (SBG-HSE-009)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "daily_safety_reports";

const T = {
  title:        { ar: "📅 التقرير اليومي (F-27) — Daily Safety Report", en: "📅 Daily Safety Report (F-27)" },
  subtitle:     { ar: "تقرير ملاحظات يومي مختصر (مطابق SBG-HSE-009) — يومي ولا يحل محل F-04",
                  en: "Brief daily observations report (per SBG-HSE-009) — daily, does not replace F-04" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },
  date:         { ar: "التاريخ", en: "Date" },
  shift:        { ar: "الورديّة", en: "Shift" },
  shiftMorning: { ar: "صباحية", en: "Morning" },
  shiftEvening: { ar: "مسائية", en: "Evening" },
  shiftNight:   { ar: "ليلية", en: "Night" },
  projectName:  { ar: "المشروع / المنشأة", en: "Project / Facility" },
  weather:      { ar: "الطقس", en: "Weather" },

  s1Title:      { ar: "🔍 الملاحظات اليومية", en: "🔍 Daily Observations" },
  s2Title:      { ar: "📊 ملخص اليوم", en: "📊 Daily Summary" },
  manhours:     { ar: "ساعات العمل اليوم", en: "Today's Man-hours" },
  workersCount: { ar: "عدد العمال", en: "No. of Workers" },
  injuries:     { ar: "إصابات اليوم", en: "Today's Injuries" },
  nearMisses:   { ar: "شبه حوادث اليوم", en: "Today's Near Misses" },
  toolboxesDone:{ ar: "اجتماعات Toolbox", en: "Toolbox Meetings Done" },
  permitsIssued:{ ar: "تصاريح صادرة", en: "Permits Issued" },

  s3Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By / Name" },
  hseManager:   { ar: "مدير السلامة", en: "Safety Manager / Name" },

  obsNo:        { ar: "#", en: "#" },
  obsDesc:      { ar: "الملاحظة / الوصف", en: "Observation / Description" },
  obsLoc:       { ar: "الموقع", en: "Location" },
  obsTime:      { ar: "الوقت", en: "Time" },
  obsAction:    { ar: "الإجراء المتخذ", en: "Action Taken" },
  obsCategory:  { ar: "التصنيف", en: "Category" },
  catSafe:      { ar: "ملاحظة آمنة", en: "Safe Observation" },
  catUnsafe:    { ar: "ظرف غير آمن", en: "Unsafe Condition" },
  catGood:      { ar: "ممارسة جيدة", en: "Good Practice" },
  catCorrected: { ar: "تم التصحيح", en: "Corrected on Spot" },
  addRow:       { ar: "+ إضافة ملاحظة", en: "+ Add Observation" },
  removeRow:    { ar: "حذف", en: "Remove" },

  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needPrep:     { ar: "أدخل اسم مُعِد التقرير", en: "Enter preparer name" },
  saved:        { ar: "✅ تم حفظ التقرير", en: "✅ Report saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد تقارير", en: "No reports" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    shift:     { ar: "الوردية", en: "Shift" },
    project:   { ar: "المشروع", en: "Project" },
    obs:       { ar: "ملاحظات", en: "Obs." },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-27 · Daily Safety Report · AL MAWASHI HSE",
                  en: "Form F-27 · Daily Safety Report · AL MAWASHI HSE" },
};

const blankRow = () => ({ desc: "", location: "", time: "", action: "", category: "safe" });

const blank = () => ({
  reportNo: `DSR-${Date.now().toString().slice(-6)}`,
  date: todayISO(), shift: "morning",
  projectName: "", weather: "",
  rows: [blankRow(), blankRow(), blankRow()],
  manhours: "", workersCount: "", injuries: "", nearMisses: "",
  toolboxesDone: "", permitsIssued: "",
  preparedBy: "", hseManager: "",
});

const CAT_COLORS = {
  safe:      { bg: "#dcfce7", color: "#166534" },
  unsafe:    { bg: "#fee2e2", color: "#7f1d1d" },
  good:      { bg: "#dbeafe", color: "#1e40af" },
  corrected: { bg: "#fef9c3", color: "#854d0e" },
};

export default function HSEDailyReport() {
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
  function addRow() { setDraft((d) => ({ ...d, rows: [...d.rows, blankRow()] })); }
  function removeRow(idx) { setDraft((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== idx) })); }

  function save() {
    if (!draft.preparedBy.trim()) { alert(pick(T.needPrep)); return; }
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
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.shift)}</label>
                <select value={draft.shift} onChange={(e) => setDraft({ ...draft, shift: e.target.value })} style={inputStyle}>
                  <option value="morning">{pick(T.shiftMorning)}</option>
                  <option value="evening">{pick(T.shiftEvening)}</option>
                  <option value="night">{pick(T.shiftNight)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.projectName)}</label><input type="text" value={draft.projectName} onChange={(e) => setDraft({ ...draft, projectName: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.weather)}</label><input type="text" value={draft.weather} onChange={(e) => setDraft({ ...draft, weather: e.target.value })} style={inputStyle} placeholder={lang === "ar" ? "مشمس / غائم..." : "Sunny / Cloudy..."} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.obsNo)}</th>
                    <th style={thStyle}>{pick(T.obsDesc)}</th>
                    <th style={thStyle}>{pick(T.obsLoc)}</th>
                    <th style={thStyle}>{pick(T.obsTime)}</th>
                    <th style={thStyle}>{pick(T.obsCategory)}</th>
                    <th style={thStyle}>{pick(T.obsAction)}</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.rows || []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                      <td style={tdStyle}><textarea rows="2" value={r.desc} onChange={(e) => setRow(i, "desc", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, minHeight: 32 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.location} onChange={(e) => setRow(i, "location", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><input type="time" value={r.time} onChange={(e) => setRow(i, "time", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
                      <td style={tdStyle}>
                        <select value={r.category} onChange={(e) => setRow(i, "category", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }}>
                          <option value="safe">{pick(T.catSafe)}</option>
                          <option value="unsafe">{pick(T.catUnsafe)}</option>
                          <option value="good">{pick(T.catGood)}</option>
                          <option value="corrected">{pick(T.catCorrected)}</option>
                        </select>
                      </td>
                      <td style={tdStyle}><input type="text" value={r.action} onChange={(e) => setRow(i, "action", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }} /></td>
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

            <SectionHeader title={pick(T.s2Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.manhours)}</label><input type="number" value={draft.manhours} onChange={(e) => setDraft({ ...draft, manhours: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.workersCount)}</label><input type="number" value={draft.workersCount} onChange={(e) => setDraft({ ...draft, workersCount: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.injuries)}</label><input type="number" value={draft.injuries} onChange={(e) => setDraft({ ...draft, injuries: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.nearMisses)}</label><input type="number" value={draft.nearMisses} onChange={(e) => setDraft({ ...draft, nearMisses: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.toolboxesDone)}</label><input type="number" value={draft.toolboxesDone} onChange={(e) => setDraft({ ...draft, toolboxesDone: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.permitsIssued)}</label><input type="number" value={draft.permitsIssued} onChange={(e) => setDraft({ ...draft, permitsIssued: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s3Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hseManager)}</label><input type="text" value={draft.hseManager} onChange={(e) => setDraft({ ...draft, hseManager: e.target.value })} style={inputStyle} /></div>
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
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.shift)}</th>
                  <th style={thStyle}>{pick(T.cols.project)}</th>
                  <th style={thStyle}>{pick(T.cols.obs)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const obsCount = (it.rows || []).filter((r) => r.desc?.trim()).length;
                  const sh = it.shift === "morning" ? T.shiftMorning : it.shift === "evening" ? T.shiftEvening : T.shiftNight;
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{pick(sh)}</td>
                      <td style={tdStyle}>{it.projectName || "—"}</td>
                      <td style={tdStyle}>{obsCount}</td>
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
                <div><b>{pick(T.date)}: </b>{viewing.date}</div>
                <div><b>{pick(T.shift)}: </b>{viewing.shift === "morning" ? pick(T.shiftMorning) : viewing.shift === "evening" ? pick(T.shiftEvening) : pick(T.shiftNight)}</div>
                <div><b>{pick(T.projectName)}: </b>{viewing.projectName || "—"}</div>
                <div><b>{pick(T.weather)}: </b>{viewing.weather || "—"}</div>
              </div>

              <SectionHeader title={pick(T.s1Title)} />
              <div style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{pick(T.obsNo)}</th>
                      <th style={thStyle}>{pick(T.obsDesc)}</th>
                      <th style={thStyle}>{pick(T.obsLoc)}</th>
                      <th style={thStyle}>{pick(T.obsTime)}</th>
                      <th style={thStyle}>{pick(T.obsCategory)}</th>
                      <th style={thStyle}>{pick(T.obsAction)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.rows || []).map((r, i) => {
                      const c = CAT_COLORS[r.category] || CAT_COLORS.safe;
                      const lbl = { safe: T.catSafe, unsafe: T.catUnsafe, good: T.catGood, corrected: T.catCorrected }[r.category] || T.catSafe;
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                          <td style={tdStyle}>{r.desc || "—"}</td>
                          <td style={tdStyle}>{r.location || "—"}</td>
                          <td style={tdStyle}>{r.time || "—"}</td>
                          <td style={tdStyle}>
                            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: c.bg, color: c.color }}>{pick(lbl)}</span>
                          </td>
                          <td style={tdStyle}>{r.action || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <SectionHeader title={pick(T.s2Title)} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10 }}>
                <div style={{ fontSize: 13 }}><b>{pick(T.manhours)}: </b>{viewing.manhours || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.workersCount)}: </b>{viewing.workersCount || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.injuries)}: </b>{viewing.injuries || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.nearMisses)}: </b>{viewing.nearMisses || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.toolboxesDone)}: </b>{viewing.toolboxesDone || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.permitsIssued)}: </b>{viewing.permitsIssued || "—"}</div>
              </div>

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.preparedBy)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.hseManager)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.hseManager || "_______________"}</div>
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
