// src/pages/hse/HSEGenericLog.jsx
// قالب عام لسجلات HSE البسيطة — يدعم اللغتين — تصميم عصري

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS,
  apiList, apiSave, apiDelete,
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
  noRecords:     { ar: "لا توجد سجلات بعد", en: "No records yet" },
  noRecordsHint: { ar: "اضغط \"+ إضافة\" لإنشاء أول سجل", en: "Click \"+ Add\" to create your first record" },
  actions:       { ar: "إجراءات", en: "Actions" },
  enterField:    { ar: "أدخل:", en: "Enter:" },
};

/* Modern focus-aware input wrapper */
function FocusInput({ as: As = "input", style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <As
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...inputStyle,
        ...style,
        borderColor: focused ? "#ea580c" : "#fed7aa",
        background: focused ? "#fff" : "#fffbf5",
        boxShadow: focused ? "0 0 0 3px rgba(234, 88, 12, 0.15)" : "none",
      }}
    />
  );
}

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
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(storageKey);
    setItems(arr);
  }
  useEffect(() => { reload(); }, [storageKey]);

  async function save() {
    for (const f of fields) {
      if (f.required && !String(draft[f.key] ?? "").trim()) {
        alert(`${pick(COMMON_T.enterField)} ${L(f.label, lang)}`);
        return;
      }
    }
    setSaving(true);
    try {
      await apiSave(storageKey, draft, draft.preparedBy || draft.inspectedBy || draft.recordedBy || "HSE");
      await reload();
      alert(pick(COMMON_T.saved));
      setDraft(blank);
      setTab("list");
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(pick(COMMON_T.confirmDelete))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  function renderField(f) {
    const val = draft[f.key];
    const setVal = (v) => setDraft({ ...draft, [f.key]: v });
    const baseStyle = f.fullWidth ? { gridColumn: "1 / -1" } : {};
    const labelText = L(f.label, lang);
    const placeholder = L(f.placeholder, lang);
    const labelEl = (
      <label style={labelStyle}>
        {labelText}
        {f.required && <span style={{ color: "#dc2626", marginInlineStart: 4 }}>*</span>}
        {f.type === "time" && <span style={{ fontSize: 10, color: "#9a3412", fontWeight: 700, marginInlineStart: 6 }}>(HH:MM:SS)</span>}
      </label>
    );
    switch (f.type) {
      case "textarea":
        return (
          <div key={f.key} style={baseStyle}>
            {labelEl}
            <FocusInput
              as="textarea"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder}
              style={{ minHeight: 80, resize: "vertical" }}
            />
          </div>
        );
      case "select":
        return (
          <div key={f.key} style={baseStyle}>
            {labelEl}
            <FocusInput
              as="select"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            >
              {(f.options || []).map((o) => (
                <option key={OV(o)} value={OV(o)}>{OL(o, lang)}</option>
              ))}
            </FocusInput>
          </div>
        );
      case "checkbox":
        return (
          <label
            key={f.key}
            style={{
              ...baseStyle,
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "12px 14px",
              background: val ? "linear-gradient(135deg, #dcfce7, #f0fdf4)" : "#fffbf5",
              border: `1.5px solid ${val ? "#86efac" : "#fed7aa"}`,
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              color: val ? "#14532d" : "#1f0f00",
              transition: "all .15s",
            }}
          >
            <input
              type="checkbox"
              checked={val || false}
              onChange={(e) => setVal(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#16a34a", cursor: "pointer" }}
            />
            {labelText}
          </label>
        );
      default:
        return (
          <div key={f.key} style={baseStyle}>
            {labelEl}
            <FocusInput
              type={f.type || "text"}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={placeholder}
              step={f.type === "time" ? 1 : (f.type === "number" ? (f.step || "any") : undefined)}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {fields.map(renderField)}
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(COMMON_T.save)}
              </button>
              <button style={buttonGhost} onClick={() => { setDraft(blank); setTab("list"); }} disabled={saving}>{pick(COMMON_T.cancel)}</button>
            </div>
          </div>
        )}

        {tab === "list" && (
          items.length === 0 ? (
            <div style={{
              padding: "60px 20px",
              textAlign: "center",
              background: "#fff",
              borderRadius: 16,
              border: "1px dashed #fed7aa",
              color: "#9a3412",
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{pick(COMMON_T.noRecords)}</div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>{pick(COMMON_T.noRecordsHint)}</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 16 }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {listColumns.map((c) => <th key={c.key} style={thStyle}>{L(c.label, lang)}</th>)}
                    <th style={{ ...thStyle, textAlign: "center" }}>{pick(COMMON_T.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <ModernRow
                      key={it.id}
                      it={it}
                      idx={idx}
                      listColumns={listColumns}
                      renderCell={renderCell}
                      onDelete={() => remove(it.id)}
                      deleteLabel={pick(COMMON_T.delete)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </main>
  );
}

/* Row with hover highlight + alternating background */
function ModernRow({ it, idx, listColumns, renderCell, onDelete, deleteLabel }) {
  const [hover, setHover] = useState(false);
  const baseBg = idx % 2 === 0 ? "#fff" : "#fffbf5";
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#fff7ed" : baseBg,
        transition: "background .15s",
      }}
    >
      {listColumns.map((c) => (
        <td key={c.key} style={tdStyle}>{renderCell(c, it)}</td>
      ))}
      <td style={{ ...tdStyle, textAlign: "center" }}>
        <button
          style={{
            padding: "7px 14px",
            borderRadius: 999,
            background: "#fff5f5",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            transition: "all .15s",
          }}
          onClick={onDelete}
        >
          🗑 {deleteLabel}
        </button>
      </td>
    </tr>
  );
}
