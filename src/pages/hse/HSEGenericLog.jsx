// src/pages/hse/HSEGenericLog.jsx
// قالب عام لسجلات HSE البسيطة — يدعم اللغتين

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS,
  loadLocal, appendLocal, deleteLocal,
  tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const COMMON_T = {
  list:    { ar: "📋 السجل", en: "📋 Records" },
  add:     { ar: "+ إضافة",  en: "+ Add" },
  back:    { ar: "← HSE",    en: "← HSE" },
  save:    { ar: "💾 حفظ",   en: "💾 Save" },
  saved:   { ar: "✅ تم الحفظ", en: "✅ Saved" },
  cancel:  { ar: "إلغاء",     en: "Cancel" },
  delete:  { ar: "حذف",      en: "Delete" },
  confirmDelete: { ar: "حذف؟", en: "Delete?" },
  noRecords:     { ar: "لا توجد سجلات", en: "No records" },
  actions:       { ar: "إجراءات", en: "Actions" },
  enterField:    { ar: "أدخل:", en: "Enter:" },
};

/** Resolve label: accepts either string or { ar, en } */
function L(value, lang) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value[lang] ?? value.ar ?? value.en ?? "";
  return String(value);
}

/** Resolve option label */
function OL(opt, lang) {
  if (opt == null) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") {
    if (opt.l !== undefined) return L(opt.l, lang); // legacy { v, l }
    return opt[lang] ?? opt.en ?? opt.ar ?? opt.v ?? "";
  }
  return String(opt);
}

function OV(opt) {
  if (opt == null) return "";
  if (typeof opt === "string") return opt;
  return opt.v ?? opt.value ?? "";
}

export default function HSEGenericLog({
  storageKey, title, subtitle, formCode, icon = "📝",
  fields = [], listColumns = [], backTo = "/hse",
}) {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");

  const blank = useMemo(() => {
    const out = {};
    fields.forEach((f) => { out[f.key] = f.default !== undefined ? f.default : (f.type === "checkbox" ? false : ""); });
    return out;
  }, [fields]);
  const [draft, setDraft] = useState(blank);

  useEffect(() => { setItems(loadLocal(storageKey)); }, [storageKey]);

  function save() {
    for (const f of fields) {
      if (f.required && !String(draft[f.key] ?? "").trim()) {
        alert(`${pick(COMMON_T.enterField)} ${L(f.label, lang)}`);
        return;
      }
    }
    appendLocal(storageKey, draft);
    setItems(loadLocal(storageKey));
    alert(pick(COMMON_T.saved));
    setDraft(blank);
    setTab("list");
  }

  function remove(id) {
    if (!window.confirm(pick(COMMON_T.confirmDelete))) return;
    deleteLocal(storageKey, id);
    setItems(loadLocal(storageKey));
  }

  function renderField(f) {
    const val = draft[f.key];
    const setVal = (v) => setDraft({ ...draft, [f.key]: v });
    const baseStyle = f.fullWidth ? { gridColumn: "1 / -1" } : {};
    const labelText = L(f.label, lang);
    const placeholder = L(f.placeholder, lang);
    switch (f.type) {
      case "textarea":
        return (
          <div key={f.key} style={baseStyle}>
            <label style={labelStyle}>{labelText}{f.required && " *"}</label>
            <textarea value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, minHeight: 70 }} />
          </div>
        );
      case "select":
        return (
          <div key={f.key} style={baseStyle}>
            <label style={labelStyle}>{labelText}{f.required && " *"}</label>
            <select value={val} onChange={(e) => setVal(e.target.value)} style={inputStyle}>
              {(f.options || []).map((o) => (
                <option key={OV(o)} value={OV(o)}>{OL(o, lang)}</option>
              ))}
            </select>
          </div>
        );
      case "checkbox":
        return (
          <label key={f.key} style={{ ...baseStyle, display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "#fff7ed", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <input type="checkbox" checked={val || false} onChange={(e) => setVal(e.target.checked)} />
            {labelText}
          </label>
        );
      default:
        return (
          <div key={f.key} style={baseStyle}>
            <label style={labelStyle}>{labelText}{f.required && " *"}</label>
            <input
              type={f.type || "text"} value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder} style={inputStyle}
              step={f.type === "number" ? (f.step || "any") : undefined}
            />
          </div>
        );
    }
  }

  function renderCell(col, it) {
    const v = it[col.key];
    if (col.render) return col.render(v, it, lang);
    if (v === true) return "✅";
    if (v === false) return "—";
    // If column has options for translation
    if (col.options) return OL(col.options.find((o) => OV(o) === v) || v, lang) || v || "—";
    return v || "—";
  }

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>
              {icon} {L(title, lang)}{" "}
              {formCode && <span style={{ fontSize: 14, color: HSE_COLORS.primary }}>({formCode})</span>}
            </div>
            {subtitle && <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{L(subtitle, lang)}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(COMMON_T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(COMMON_T.add)}</button>
            <button style={buttonGhost} onClick={() => navigate(backTo)}>{pick(COMMON_T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {fields.map(renderField)}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(COMMON_T.save)}</button>
              <button style={buttonGhost} onClick={() => { setDraft(blank); setTab("list"); }}>{pick(COMMON_T.cancel)}</button>
            </div>
          </div>
        )}

        {tab === "list" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {listColumns.map((c) => <th key={c.key} style={thStyle}>{L(c.label, lang)}</th>)}
                  <th style={thStyle}>{pick(COMMON_T.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    {listColumns.map((c) => (
                      <td key={c.key} style={tdStyle}>{renderCell(c, it)}</td>
                    ))}
                    <td style={tdStyle}>
                      <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(COMMON_T.delete)}</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={listColumns.length + 1} style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(COMMON_T.noRecords)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
