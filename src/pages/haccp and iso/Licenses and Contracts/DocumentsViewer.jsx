// src/pages/haccp and iso/Licenses and Contracts/DocumentsViewer.jsx
//
// Popup that shows every document of one license / contract:
//   left  — versions timeline: CURRENT first, then the archive left behind by
//           each renewal (validity, replaced on / by, note)
//   right — large viewer (image zoom + rotate, PDF inline), prev/next,
//           open / download, and "Compare" = current beside the previous version.
import React, { useEffect, useMemo, useState } from "react";
import { documentVersions, isImageUrl, isPdfUrl, displayUrl, fmtDate, STATUS, statusOf } from "./licensesKit";

const L = {
  en: {
    docs: "Documents", current: "Current", archived: "Archived", version: "Version",
    validUntil: "Valid until", issued: "Issued", replaced: "Replaced on", by: "by",
    noFiles: "No file attached to this version.", open: "Open", download: "Download",
    compare: "⇆ Compare with previous", single: "▣ Single view", fit: "Fit", rotate: "⟳",
    previous: "Previous version", carried: "kept from previous", close: "Close",
    cantPreview: "This file can't be previewed here.", empty: "No documents attached yet.",
    files: (n) => `${n} file${n === 1 ? "" : "s"}`,
  },
  ar: {
    docs: "المستندات", current: "الحالي", archived: "مؤرشف", version: "الإصدار",
    validUntil: "ساري حتى", issued: "صدر", replaced: "استُبدل في", by: "بواسطة",
    noFiles: "لا يوجد ملف مرفق لهذا الإصدار.", open: "فتح", download: "تنزيل",
    compare: "⇆ مقارنة مع السابق", single: "▣ عرض واحد", fit: "ملاءمة", rotate: "⟳",
    previous: "الإصدار السابق", carried: "مُبقى من السابق", close: "إغلاق",
    cantPreview: "لا يمكن معاينة هذا الملف هنا.", empty: "لا توجد مستندات مرفقة بعد.",
    files: (n) => `${n} ملف`,
  },
};

const C = { ink: "#0f172a", sub: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f8fafc", brand: "#4f46e5" };
const tool = {
  background: "#fff", border: `1px solid ${C.line}`, color: "#334155", borderRadius: 8, padding: "6px 10px",
  fontWeight: 700, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", textDecoration: "none", display: "inline-block",
};

function fileName(f, i) {
  if (f.name) return f.name;
  const tail = decodeURIComponent(String(f.url).split("?")[0].split("/").pop() || "");
  if (tail && tail.length < 40) return tail;
  return isPdfUrl(f.url) ? `PDF ${i + 1}` : isImageUrl(f.url) ? `Image ${i + 1}` : `File ${i + 1}`;
}

function Thumb({ url, size = 46 }) {
  if (isImageUrl(url)) {
    return <img src={displayUrl(url, 160)} alt="" style={{ width: size, height: size * 0.76, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.line}`, flex: "none", display: "block" }} />;
  }
  return (
    <span style={{
      width: size, height: size * 0.76, borderRadius: 6, flex: "none", display: "grid", placeItems: "center",
      background: isPdfUrl(url) ? "#fef2f2" : C.soft, border: `1px solid ${isPdfUrl(url) ? "#fecaca" : C.line}`,
      color: isPdfUrl(url) ? "#b91c1c" : C.sub, fontWeight: 900, fontSize: 10,
    }}>{isPdfUrl(url) ? "PDF" : "FILE"}</span>
  );
}

/** One pane: the file itself + its toolbar. */
function Pane({ t, file, tag, tagTone, zoom, rot, setZoom, setRot, compact }) {
  if (!file) {
    return <div style={{ flex: 1, display: "grid", placeItems: "center", color: C.faint, fontWeight: 700, background: C.soft, borderRadius: 12 }}>{t.noFiles}</div>;
  }
  const img = isImageUrl(file.url);
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 999, background: tagTone.bg, color: tagTone.color, border: `1px solid ${tagTone.bd}` }}>{tag}</span>
        <b style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.label}>{file.label}</b>
        {img && !compact && (
          <>
            <button type="button" style={tool} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</button>
            <button type="button" style={tool} onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
            <button type="button" style={tool} onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>＋</button>
            <button type="button" style={tool} onClick={() => setRot((r) => (r + 90) % 360)}>{t.rotate}</button>
          </>
        )}
        <a href={file.url} target="_blank" rel="noreferrer" style={tool}>↗ {t.open}</a>
        <a href={file.url} download style={tool}>⬇</a>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "repeating-conic-gradient(#f1f5f9 0% 25%, #f8fafc 0% 50%) 50% / 22px 22px", display: "grid", placeItems: img && zoom <= 1 ? "center" : "start center", padding: 12 }}>
        {img ? (
          <img src={displayUrl(file.url, 1800)} alt={file.label}
            style={{
              maxWidth: zoom <= 1 ? "100%" : "none", maxHeight: zoom <= 1 ? "100%" : "none",
              width: zoom > 1 ? `${zoom * 100}%` : undefined,
              transform: `rotate(${rot}deg) scale(${zoom < 1 ? zoom : 1})`, transition: "transform .2s",
              borderRadius: 8, boxShadow: "0 8px 28px rgba(15,23,42,0.18)", background: "#fff",
            }} />
        ) : isPdfUrl(file.url) ? (
          <iframe title={file.label} src={file.url} style={{ width: "100%", height: "100%", minHeight: 420, border: "none", borderRadius: 8, background: "#fff" }} />
        ) : (
          <div style={{ color: C.sub, fontWeight: 700 }}>{t.cantPreview}</div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsViewer({ item, lang = "en", onClose }) {
  const t = L[lang] || L.en;
  const versions = useMemo(() => documentVersions(item), [item]);
  // flat list of every viewable file, newest version first
  const flat = useMemo(() => {
    const out = [];
    versions.forEach((v, vi) => v.files.forEach((f, fi) => {
      if (f.carried) return;
      out.push({ ...f, vi, label: fileName(f, fi) });
    }));
    return out;
  }, [versions]);

  const [sel, setSel] = useState(0);
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);

  useEffect(() => { setZoom(1); setRot(0); }, [sel]);
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown" || e.key === (lang === "ar" ? "ArrowLeft" : "ArrowRight")) setSel((s) => Math.min(flat.length - 1, s + 1));
      if (e.key === "ArrowUp" || e.key === (lang === "ar" ? "ArrowRight" : "ArrowLeft")) setSel((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [flat.length, lang, onClose]);

  const cur = flat[sel] || null;
  const curVersion = cur ? versions[cur.vi] : versions[0];
  // compare: the selected file beside the first file of the version after it (older)
  const olderV = cur ? versions.slice(cur.vi + 1).find((v) => v.files.some((f) => !f.carried)) : null;
  const olderFile = olderV ? (() => { const f = olderV.files.find((x) => !x.carried); return f ? { ...f, label: fileName(f, 0) } : null; })() : null;
  const canCompare = !!olderFile;
  const st = STATUS[statusOf(item.expiryDate).key];

  const toneCurrent = { bg: "#ecfdf5", color: "#065f46", bd: "#a7f3d0" };
  const toneArchived = { bg: "#f1f5f9", color: "#475569", bd: "#cbd5e1" };
  const tagFor = (v) => (v.current ? t.current : `${t.archived} · ${t.version} ${v.n}`);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", zIndex: 10001, display: "grid", placeItems: "center", padding: 12 }}>
      <div dir={lang === "ar" ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()} style={{
        width: "min(1280px, 98vw)", height: "min(860px, 94vh)", background: "#fff", borderRadius: 18,
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: 'system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif', color: C.ink,
      }}>
        {/* header */}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.line}`, background: "linear-gradient(90deg,#eef2ff,#ffffff 60%)" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#fff", border: `1px solid ${C.line}`, fontSize: 20 }}>{item.kind === "license" ? "🪪" : "📄"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}{item.company ? ` — ${item.company}` : ""}</div>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>
              {item.branch} · {t.docs}: {flat.length} · {t.validUntil} <span style={{ color: st.color }}>{fmtDate(item.expiryDate, lang)}</span>
            </div>
          </div>
          {canCompare && (
            <button type="button" onClick={() => setCompare((c) => !c)}
              style={{ ...tool, padding: "8px 12px", background: compare ? C.brand : "#fff", color: compare ? "#fff" : "#334155", borderColor: compare ? C.brand : C.line }}>
              {compare ? t.single : t.compare}
            </button>
          )}
          <button type="button" onClick={onClose} style={{ ...tool, padding: "8px 12px", color: "#991b1b", borderColor: "#fecaca" }}>✕ {t.close}</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "300px minmax(0,1fr)" }}>
          {/* versions timeline */}
          <div style={{ borderInlineEnd: `1px solid ${C.line}`, overflowY: "auto", padding: 12, background: "#fcfcfd" }}>
            {flat.length === 0 && <div style={{ color: C.faint, fontWeight: 700, padding: 10 }}>{t.empty}</div>}
            {versions.map((v, vi) => {
              const files = v.files.filter((f) => !f.carried);
              const tone = v.current ? toneCurrent : toneArchived;
              return (
                <div key={vi} style={{ position: "relative", paddingInlineStart: 18, marginBottom: 14 }}>
                  <span style={{ position: "absolute", insetInlineStart: 4, top: 6, width: 10, height: 10, borderRadius: 99, background: v.current ? "#10b981" : "#cbd5e1", boxShadow: `0 0 0 3px ${v.current ? "#d1fae5" : "#f1f5f9"}` }} />
                  {vi < versions.length - 1 && <span style={{ position: "absolute", insetInlineStart: 8, top: 18, bottom: -14, width: 2, background: C.line }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 999, background: tone.bg, color: tone.color, border: `1px solid ${tone.bd}` }}>{tagFor(v)}</span>
                    <span style={{ fontSize: 11, color: C.faint, fontWeight: 700 }}>{t.files(files.length)}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginTop: 4, lineHeight: 1.5 }}>
                    {v.issuedOn && <div>{t.issued}: {fmtDate(v.issuedOn, lang)}</div>}
                    <div>{t.validUntil}: <b>{fmtDate(v.validUntil, lang)}</b></div>
                    {!v.current && v.replacedOn && <div style={{ color: C.sub }}>{t.replaced} {fmtDate(v.replacedOn, lang)}{v.replacedBy ? ` · ${t.by} ${v.replacedBy}` : ""}</div>}
                    {v.note && <div style={{ color: C.sub, fontStyle: "italic" }}>📝 {v.note}</div>}
                  </div>
                  <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    {files.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>{t.noFiles}</div>}
                    {files.map((f) => {
                      const idx = flat.findIndex((x) => x.url === f.url && x.vi === vi);
                      const on = idx === sel;
                      return (
                        <button key={f.url} type="button" onClick={() => setSel(idx)} style={{
                          display: "flex", alignItems: "center", gap: 8, textAlign: "start", cursor: "pointer", padding: 6, borderRadius: 10,
                          border: `1.5px solid ${on ? "#a5b4fc" : C.line}`, background: on ? "#eef2ff" : "#fff",
                          opacity: v.current ? 1 : 0.85,
                        }}>
                          <Thumb url={f.url} />
                          <span style={{ fontSize: 12, fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flat[idx]?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* viewer */}
          <div style={{ minWidth: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#f8fafc" }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 10 }}>
              <Pane t={t} file={cur} tag={curVersion ? tagFor(curVersion) : ""} tagTone={curVersion?.current ? toneCurrent : toneArchived}
                zoom={zoom} rot={rot} setZoom={setZoom} setRot={setRot} compact={compare} />
              {compare && canCompare && (
                <Pane t={t} file={olderFile} tag={`${t.previous} · ${t.version} ${olderV.n}`} tagTone={toneArchived}
                  zoom={1} rot={0} setZoom={() => {}} setRot={() => {}} compact />
              )}
            </div>
            {flat.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                <button type="button" style={tool} disabled={sel <= 0} onClick={() => setSel((s) => s - 1)}>{lang === "ar" ? "▶" : "◀"}</button>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>{sel + 1} / {flat.length}</span>
                <button type="button" style={tool} disabled={sel >= flat.length - 1} onClick={() => setSel((s) => s + 1)}>{lang === "ar" ? "◀" : "▶"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
