// src/pages/hse/HSETemperatureLog.jsx
// F-08: سجل درجات الحرارة — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "temperature_logs";

const T = {
  title:    { ar: "🌡️ سجل درجات الحرارة (F-08)", en: "🌡️ Temperature Log (F-08)" },
  subtitle: { ar: "التكرار: كل 4 ساعات · المستهدف: ≥ 99% التزام", en: "Frequency: every 4 hours · Target: ≥99% compliance" },
  back:     { ar: "← HSE", en: "← HSE" },
  list:     { ar: "📋 السجل", en: "📋 Records" },
  newReading: { ar: "+ قراءة جديدة", en: "+ New Reading" },
  totalReadings: { ar: "إجمالي القراءات", en: "Total Readings" },
  ok: { ar: "قراءات مطابقة", en: "Compliant Readings" },
  dev:{ ar: "انحرافات", en: "Deviations" },
  compliance: { ar: "نسبة الالتزام", en: "Compliance Rate" },
  date: { ar: "التاريخ", en: "Date" },
  time: { ar: "الوقت", en: "Time" },
  recorder: { ar: "المسؤول عن القراءة", en: "Recorder" },
  readingsTitle: { ar: "📊 القراءات (°م)", en: "📊 Readings (°C)" },
  allowed: { ar: "المسموح:", en: "Allowed:" },
  notes: { ar: "ملاحظات (في حالة الانحراف، اذكر الإجراء التصحيحي)", en: "Notes (if deviation, mention corrective action)" },
  saveBtn: { ar: "💾 حفظ القراءات", en: "💾 Save Readings" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  needRecorder: { ar: "أدخل اسم المسؤول", en: "Enter recorder name" },
  needOne: { ar: "أدخل قراءة واحدة على الأقل", en: "Enter at least one reading" },
  saved: { ar: "✅ تم حفظ القراءات", en: "✅ Readings saved" },
  confirmDel: { ar: "حذف؟", en: "Delete?" },
  noRecords: { ar: "لا توجد قراءات", en: "No readings" },
  evalOk: { ar: "✅ ضمن النطاق", en: "✅ In range" },
  evalDev: { ar: "🚨 انحراف", en: "🚨 Deviation" },
  cols: {
    dateTime: { ar: "التاريخ/الوقت", en: "Date/Time" },
    recorder: { ar: "المسؤول", en: "Recorder" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  del: { ar: "حذف", en: "Delete" },
};

const ROOMS = [
  { id: "frozen-1", labelAr: "غرفة تجميد #1 (-18°م)",     labelEn: "Frozen Room #1 (-18°C)",     target: -18, min: -25, max: -15, type: "frozen" },
  { id: "frozen-2", labelAr: "غرفة تجميد #2 (-18°م)",     labelEn: "Frozen Room #2 (-18°C)",     target: -18, min: -25, max: -15, type: "frozen" },
  { id: "frozen-3", labelAr: "غرفة تجميد #3 (-18°م)",     labelEn: "Frozen Room #3 (-18°C)",     target: -18, min: -25, max: -15, type: "frozen" },
  { id: "chiller-1",labelAr: "غرفة تبريد #1 (0 إلى +4°م)", labelEn: "Chiller Room #1 (0 to +4°C)", target: 2,   min: 0,   max: 4,   type: "chiller" },
  { id: "chiller-2",labelAr: "غرفة تبريد #2 (0 إلى +4°م)", labelEn: "Chiller Room #2 (0 to +4°C)", target: 2,   min: 0,   max: 4,   type: "chiller" },
  { id: "chiller-3",labelAr: "غرفة تبريد #3 (0 إلى +4°م)", labelEn: "Chiller Room #3 (0 to +4°C)", target: 2,   min: 0,   max: 4,   type: "chiller" },
  { id: "receiving",labelAr: "منطقة الاستلام (0 إلى +4°م)", labelEn: "Receiving Bay (0 to +4°C)",   target: 3,   min: 0,   max: 4,   type: "chiller" },
  { id: "dispatch", labelAr: "منطقة الشحن (0 إلى +4°م)",     labelEn: "Dispatch Bay (0 to +4°C)",     target: 3,   min: 0,   max: 4,   type: "chiller" },
];

const blank = () => ({
  date: todayISO(), time: nowHHMM(), recorder: "",
  readings: ROOMS.reduce((acc, r) => ({ ...acc, [r.id]: "" }), {}),
  notes: "",
});

function evaluate(value, room) {
  const v = Number(value);
  if (isNaN(v) || value === "") return null;
  if (v >= room.min && v <= room.max) return { ok: true,  color: "#166534", bg: "#dcfce7" };
  return { ok: false, color: "#7f1d1d", bg: "#fee2e2" };
}

export default function HSETemperatureLog() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);

  function setReading(roomId, val) { setDraft((d) => ({ ...d, readings: { ...d.readings, [roomId]: val } })); }
  function save() {
    if (!draft.recorder.trim()) { alert(pick(T.needRecorder)); return; }
    const allEmpty = Object.values(draft.readings).every((v) => v === "" || v == null);
    if (allEmpty) { alert(pick(T.needOne)); return; }
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

  const stats = useMemo(() => {
    let total = 0, ok = 0, dev = 0;
    items.forEach((it) => {
      ROOMS.forEach((r) => {
        const v = it.readings?.[r.id];
        if (v === "" || v == null) return;
        const ev = evaluate(v, r); if (!ev) return;
        total++; if (ev.ok) ok++; else dev++;
      });
    });
    const compliance = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { total, ok, dev, compliance };
  }, [items]);

  const roomLabel = (r) => lang === "ar" ? r.labelAr : r.labelEn;

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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newReading)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>{pick(T.totalReadings)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.total}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14, background: "#dcfce7" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>{pick(T.ok)}</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#166534" }}>{stats.ok}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14, background: "#fee2e2" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#b91c1c" }}>{pick(T.dev)}</div>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#b91c1c" }}>{stats.dev}</div>
          </div>
          <div style={{ ...cardStyle, padding: 14, background: stats.compliance >= 99 ? "#dcfce7" : stats.compliance >= 90 ? "#fef9c3" : "#fee2e2" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>{pick(T.compliance)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.compliance}%</div>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.recorder)}</label><input type="text" value={draft.recorder} onChange={(e) => setDraft({ ...draft, recorder: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(T.readingsTitle)}</div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
              {ROOMS.map((r) => {
                const v = draft.readings[r.id];
                const ev = evaluate(v, r);
                return (
                  <div key={r.id} style={{ padding: 12, borderRadius: 10, background: r.type === "frozen" ? "#dbeafe" : "#dcfce7", border: "1px solid rgba(120,53,15,0.18)" }}>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>{roomLabel(r)}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>{pick(T.allowed)} {r.min}°C → {r.max}°C</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="number" step="0.1" value={v} onChange={(e) => setReading(r.id, e.target.value)} placeholder="0.0" style={{ ...inputStyle, fontWeight: 800 }} />
                      <span>°C</span>
                    </div>
                    {ev && (
                      <div style={{ marginTop: 6, padding: "3px 8px", borderRadius: 6, background: ev.bg, color: ev.color, fontSize: 12, fontWeight: 900, display: "inline-block" }}>
                        {ev.ok ? pick(T.evalOk) : pick(T.evalDev)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{pick(T.notes)}</label>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
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
                  <th style={thStyle}>{pick(T.cols.dateTime)}</th>
                  <th style={thStyle}>{pick(T.cols.recorder)}</th>
                  {ROOMS.map((r) => <th key={r.id} style={{ ...thStyle, fontSize: 11 }}>{(roomLabel(r)).split("(")[0]}</th>)}
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td style={tdStyle}>{it.date}<br /><small>{it.time}</small></td>
                    <td style={tdStyle}>{it.recorder}</td>
                    {ROOMS.map((r) => {
                      const v = it.readings?.[r.id];
                      const ev = evaluate(v, r);
                      return (
                        <td key={r.id} style={{ ...tdStyle, textAlign: "center", background: ev?.bg }}>
                          <span style={{ color: ev?.color, fontWeight: 800 }}>
                            {v === "" || v == null ? "—" : `${v}°`}
                          </span>
                        </td>
                      );
                    })}
                    <td style={tdStyle}>
                      <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={ROOMS.length + 3} style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
