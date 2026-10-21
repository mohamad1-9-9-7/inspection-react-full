// src/pages/monitor/branches/_shared/SupplierPicker.jsx
// Supplier box of the cooler QR goods-in form. Replaces the browser's plain
// <datalist>: the supplier this product came from last time on top, the
// unit's recent suppliers as one-tap chips, a forgiving search (Arabic
// letter forms, case, spaces) with the match highlighted, and a clear
// "new supplier" row. The typed name is still what is saved.
import React, { useMemo, useRef, useState } from "react";

const TX = {
  en: {
    ph: "Search or type the supplier name", last: "Last time", recent: "Recent in this unit",
    asNew: (q) => `➕ Use “${q}” (new supplier)`, change: "Change", none: "No supplier matches.",
    count: (n) => `${n} suppliers`,
  },
  ar: {
    ph: "ابحث أو اكتب اسم المورد", last: "آخر مرة", recent: "الأكثر استخداماً بهالوحدة",
    asNew: (q) => `➕ استخدم «${q}» (مورد جديد)`, change: "تغيير", none: "ما في مورد بهالاسم.",
    count: (n) => `${n} مورد`,
  },
};

// one spelling for matching: case, Arabic hamza/taa-marbuta/yaa forms, tashkeel, spaces & punctuation
export const normName = (v) => String(v || "")
  .toLowerCase()
  .replace(/[ً-ْـ]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
  .replace(/[\s.,\-_'"()&/]+/g, "");

function Hl({ text, q }) {
  const t = String(text);
  const needle = String(q || "").trim().toLowerCase();
  const i = needle ? t.toLowerCase().indexOf(needle) : -1;
  if (i < 0) return t;
  return <>{t.slice(0, i)}<mark style={{ background: "#fde68a", color: "inherit", padding: 0, borderRadius: 3 }}>{t.slice(i, i + needle.length)}</mark>{t.slice(i + needle.length)}</>;
}

export default function SupplierPicker({ value, onChange, list, recent = [], last = "", lang, locked = false, lockNote = "" }) {
  const s = TX[lang === "ar" ? "ar" : "en"];
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(""); // the name picked → shown as a card while it is the value
  const box = useRef(null);
  const n = normName(value);

  const matches = useMemo(() => {
    if (!n) return [];
    const scored = [];
    list.forEach((name) => {
      const k = normName(name);
      const at = k.indexOf(n);
      if (at < 0) return;
      // starts-with first, then a word that starts with it, then anywhere; shorter names first
      const word = (" " + String(name).toLowerCase()).indexOf(" " + value.trim().toLowerCase()) >= 0;
      scored.push({ name, rank: at === 0 ? 0 : word ? 1 : 2 });
    });
    return scored.sort((a, b) => a.rank - b.rank || a.name.length - b.name.length).slice(0, 8).map((x) => x.name);
  }, [list, n, value]);
  const exact = !!n && list.some((x) => normName(x) === n);

  const choose = (name) => { onChange(name); setOpen(false); setChosen(name); };
  const chips = [last, ...recent].filter((x, i, a) => x && a.findIndex((y) => normName(y) === normName(x)) === i).slice(0, 6);

  // locked = the supplier comes from the barcode (Products Catalog): shown, not changeable here
  if (locked && value) {
    return (
      <div className="card" style={{ margin: 0, padding: "10px 12px", borderColor: "#cbd5e1", background: "#f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }} aria-hidden>🔒</span>
          <div className="t2" dir="auto" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{value}</div>
        </div>
        {lockNote && <div className="sm" style={{ marginTop: 4 }}>{lockNote}</div>}
      </div>
    );
  }

  if (chosen && chosen === value) {
    return (
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, padding: "10px 12px", borderColor: "#86efac", background: "#f0fdf4" }}>
        <span style={{ fontSize: 20 }} aria-hidden>🏭</span>
        <div className="t2" dir="auto" style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{value}</div>
        <button type="button" className="btn" onClick={() => { setChosen(""); setOpen(true); onChange(""); setTimeout(() => box.current?.focus(), 0); }}>
          {s.change}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span aria-hidden style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.55, pointerEvents: "none" }}>🔎</span>
        <input ref={box} className="btn" dir="auto" value={value} placeholder={s.ph} autoComplete="off" name="cq-supplier-search"
          style={{ width: "100%", cursor: "text", fontWeight: 600, paddingInlineStart: 38, paddingInlineEnd: value ? 38 : 12 }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) { e.preventDefault(); choose(matches[0] && !exact ? matches[0] : value.trim()); }
            if (e.key === "Escape") setOpen(false);
          }} />
        {value && (
          <button type="button" aria-label="clear" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); box.current?.focus(); }}
            style={{ position: "absolute", insetInlineEnd: 6, top: "50%", transform: "translateY(-50%)", border: 0, background: "#e2e8f0", borderRadius: 999, width: 26, height: 26, cursor: "pointer", fontWeight: 800, color: "#475569" }}>
            ×
          </button>
        )}
      </div>

      {!value && chips.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          {chips.map((name) => (
            <button key={name} type="button" className="chip" dir="auto" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(name)}>
              {name === last ? <span style={{ color: "#047857" }}>↺ {s.last}: </span> : null}{name}
            </button>
          ))}
        </div>
      )}

      {open && !!n && (
        <div role="listbox" style={{ position: "absolute", zIndex: 30, insetInline: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 14, boxShadow: "0 12px 28px rgba(15,23,42,.16)", overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
          {matches.map((name) => (
            <button key={name} type="button" role="option" aria-selected={normName(name) === n} dir="auto"
              onMouseDown={(e) => e.preventDefault()} onClick={() => choose(name)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "start", border: 0, borderBottom: "1px solid #f1f5f9", background: "#fff", padding: "12px 14px", font: "inherit", fontWeight: 700, color: "#0f172a", cursor: "pointer", minHeight: 46 }}>
              <span aria-hidden style={{ opacity: 0.6 }}>🏭</span>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}><Hl text={name} q={value} /></span>
              {normName(name) === normName(last) && <span className="pill ok">{s.last}</span>}
            </button>
          ))}
          {!matches.length && <div className="sm" style={{ padding: "10px 14px" }}>{s.none}</div>}
          {!exact && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(value.trim())}
              style={{ display: "block", width: "100%", textAlign: "start", border: 0, background: "#f8fafc", padding: "12px 14px", font: "inherit", fontWeight: 800, color: "#1d4ed8", cursor: "pointer", minHeight: 46 }}>
              {s.asNew(value.trim())}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
