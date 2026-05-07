// src/pages/hse/HSEFireExtinguisherLocations.jsx
// F-30: قائمة مواقع طفايات الحريق — Fire Extinguisher Location Checklist (SBG-HSE-012)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "fire_extinguisher_locations";

const T = {
  title:        { ar: "📍 مواقع طفايات الحريق (F-30) — Fire Extinguisher Locations", en: "📍 Fire Extinguisher Locations (F-30)" },
  subtitle:     { ar: "خريطة مواقع طفايات الحريق + تواريخ الفحص (مطابق SBG-HSE-012)",
                  en: "Map of fire extinguisher locations + inspection dates (per SBG-HSE-012)" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ سجل جديد", en: "+ New Record" },
  reportNo:     { ar: "رقم السجل", en: "Record No." },
  date:         { ar: "تاريخ التحديث", en: "Update Date" },
  preparedBy:   { ar: "أعدّ السجل", en: "Prepared By" },
  location:     { ar: "الموقع الرئيسي", en: "Main Location" },

  s1Title:      { ar: "📍 مواقع الطفايات", en: "📍 Extinguisher Locations" },
  itemNo:       { ar: "#", en: "#" },
  feNo:         { ar: "رقم الطفاية", en: "Extinguisher No." },
  feType:       { ar: "النوع", en: "Type" },
  capacity:     { ar: "السعة", en: "Capacity" },
  building:     { ar: "المبنى/الطابق", en: "Building/Floor" },
  exactLoc:     { ar: "المكان المحدد", en: "Exact Location" },
  mountHeight:  { ar: "ارتفاع التركيب (سم)", en: "Mount Height (cm)" },
  signMounted:  { ar: "اللافتة موجودة", en: "Sign Mounted" },
  lastInsp:     { ar: "آخر فحص", en: "Last Inspection" },
  lastService:  { ar: "آخر صيانة", en: "Last Annual Service" },
  expiry:       { ar: "تاريخ الانتهاء", en: "Expiry Date" },
  remarks:      { ar: "ملاحظات", en: "Remarks" },
  addRow:       { ar: "+ إضافة طفاية", en: "+ Add Extinguisher" },
  removeRow:    { ar: "حذف", en: "Remove" },

  saveBtn:      { ar: "💾 حفظ السجل", en: "💾 Save Record" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needPrep:     { ar: "أدخل اسم المُعِد", en: "Enter preparer name" },
  saved:        { ar: "✅ تم حفظ السجل", en: "✅ Record saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد سجلات", en: "No records" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    location:  { ar: "الموقع", en: "Location" },
    count:     { ar: "العدد", en: "Count" },
    expiringSoon:{ ar: "قارب الانتهاء", en: "Expiring Soon" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-30 · Fire Extinguisher Locations · AL MAWASHI HSE",
                  en: "Form F-30 · Fire Extinguisher Locations · AL MAWASHI HSE" },
};

const FE_TYPES = [
  { v: "dcp",    ar: "بودرة جافة (DCP)", en: "Dry Powder (DCP)" },
  { v: "co2",    ar: "CO₂",              en: "CO₂" },
  { v: "foam",   ar: "رغوة",              en: "Foam" },
  { v: "water",  ar: "مياه",              en: "Water" },
  { v: "kclass", ar: "Class K (مطبخ)",    en: "Class K (Kitchen)" },
];

const blankRow = () => ({
  feNo: "", feType: "dcp", capacity: "", building: "", exactLoc: "", mountHeight: "",
  signMounted: true, lastInsp: "", lastService: "", expiry: "", remarks: "",
});

const blank = () => ({
  reportNo: `FEL-${Date.now().toString().slice(-6)}`,
  date: todayISO(), preparedBy: "",
  location: SITE_LOCATIONS[0].v,
  rows: [blankRow()],
});

export default function HSEFireExtinguisherLocations() {
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

  function expiringSoon(rows) {
    const today = new Date();
    const in30 = new Date(); in30.setDate(today.getDate() + 30);
    return (rows || []).filter((r) => {
      if (!r.expiry) return false;
      const exp = new Date(r.expiry);
      return exp <= in30;
    }).length;
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
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.itemNo)}</th>
                    <th style={thStyle}>{pick(T.feNo)}</th>
                    <th style={thStyle}>{pick(T.feType)}</th>
                    <th style={thStyle}>{pick(T.capacity)}</th>
                    <th style={thStyle}>{pick(T.building)}</th>
                    <th style={thStyle}>{pick(T.exactLoc)}</th>
                    <th style={thStyle}>{pick(T.mountHeight)}</th>
                    <th style={thStyle}>{pick(T.signMounted)}</th>
                    <th style={thStyle}>{pick(T.lastInsp)}</th>
                    <th style={thStyle}>{pick(T.lastService)}</th>
                    <th style={thStyle}>{pick(T.expiry)}</th>
                    <th style={thStyle}>{pick(T.remarks)}</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.rows || []).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                      <td style={tdStyle}><input type="text" value={r.feNo} onChange={(e) => setRow(i, "feNo", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, width: 80 }} /></td>
                      <td style={tdStyle}>
                        <select value={r.feType} onChange={(e) => setRow(i, "feType", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }}>
                          {FE_TYPES.map((t) => <option key={t.v} value={t.v}>{t[lang]}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}><input type="text" value={r.capacity} onChange={(e) => setRow(i, "capacity", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, width: 60 }} placeholder="6kg" /></td>
                      <td style={tdStyle}><input type="text" value={r.building} onChange={(e) => setRow(i, "building", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.exactLoc} onChange={(e) => setRow(i, "exactLoc", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="number" value={r.mountHeight} onChange={(e) => setRow(i, "mountHeight", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, width: 60 }} placeholder="120" /></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}><input type="checkbox" checked={!!r.signMounted} onChange={(e) => setRow(i, "signMounted", e.target.checked)} /></td>
                      <td style={tdStyle}><input type="date" value={r.lastInsp} onChange={(e) => setRow(i, "lastInsp", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="date" value={r.lastService} onChange={(e) => setRow(i, "lastService", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="date" value={r.expiry} onChange={(e) => setRow(i, "expiry", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}><input type="text" value={r.remarks} onChange={(e) => setRow(i, "remarks", e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} /></td>
                      <td style={tdStyle}>
                        {(draft.rows || []).length > 1 && (
                          <button type="button" onClick={() => removeRow(i)} style={{ ...buttonGhost, padding: "2px 6px", fontSize: 10, color: "#b91c1c" }}>{pick(T.removeRow)}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow} style={{ ...buttonGhost, marginTop: 8, fontSize: 12 }}>{pick(T.addRow)}</button>

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
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.count)}</th>
                  <th style={thStyle}>{pick(T.cols.expiringSoon)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const cnt = (it.rows || []).length;
                  const exp = expiringSoon(it.rows);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{cnt}</td>
                      <td style={tdStyle}>
                        {exp > 0 ? <span style={{ color: "#b91c1c", fontWeight: 800 }}>⚠️ {exp}</span> : <span style={{ color: "#166534" }}>0</span>}
                      </td>
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
              maxWidth: 1200, width: "100%", maxHeight: "92vh", overflow: "auto",
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
                <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.preparedBy)}: </b>{viewing.preparedBy}</div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{pick(T.itemNo)}</th>
                      <th style={thStyle}>{pick(T.feNo)}</th>
                      <th style={thStyle}>{pick(T.feType)}</th>
                      <th style={thStyle}>{pick(T.capacity)}</th>
                      <th style={thStyle}>{pick(T.building)}</th>
                      <th style={thStyle}>{pick(T.exactLoc)}</th>
                      <th style={thStyle}>{pick(T.mountHeight)}</th>
                      <th style={thStyle}>{pick(T.signMounted)}</th>
                      <th style={thStyle}>{pick(T.lastInsp)}</th>
                      <th style={thStyle}>{pick(T.lastService)}</th>
                      <th style={thStyle}>{pick(T.expiry)}</th>
                      <th style={thStyle}>{pick(T.remarks)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.rows || []).map((r, i) => {
                      const t = FE_TYPES.find((x) => x.v === r.feType);
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                          <td style={tdStyle}>{r.feNo || "—"}</td>
                          <td style={tdStyle}>{t ? t[lang] : r.feType}</td>
                          <td style={tdStyle}>{r.capacity || "—"}</td>
                          <td style={tdStyle}>{r.building || "—"}</td>
                          <td style={tdStyle}>{r.exactLoc || "—"}</td>
                          <td style={tdStyle}>{r.mountHeight ? `${r.mountHeight} cm` : "—"}</td>
                          <td style={{ ...tdStyle, textAlign: "center", color: r.signMounted ? "#166534" : "#b91c1c", fontWeight: 800 }}>{r.signMounted ? "✓" : "✗"}</td>
                          <td style={tdStyle}>{r.lastInsp || "—"}</td>
                          <td style={tdStyle}>{r.lastService || "—"}</td>
                          <td style={tdStyle}>{r.expiry || "—"}</td>
                          <td style={tdStyle}>{r.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
