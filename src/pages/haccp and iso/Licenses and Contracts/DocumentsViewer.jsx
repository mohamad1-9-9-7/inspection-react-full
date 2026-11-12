// src/pages/haccp and iso/Licenses and Contracts/DocumentsViewer.jsx
//
// Popup that shows every document of one license / contract:
//   left  — versions timeline: CURRENT first, then the archive left behind by
//           each renewal (validity, replaced on / by, note)
//   right — large viewer: images (zoom + rotate) and PDFs page by page,
//           prev/next page + page strip, open / download, full screen, and
//           "Compare" = current beside the previous version.
//
// PDFs uploaded through /api/images live on Cloudinary under image/upload,
// so every page can be fetched as a picture with the pg_<n> transformation
// (works even where the account blocks raw PDF delivery). The page count is
// found by probing pg_1, pg_2 … until one fails.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { documentVersions, isImageUrl, isPdfUrl, displayUrl, fmtDate, STATUS, statusOf } from "./licensesKit";

const L = {
  en: {
    docs: "Documents", current: "Current", archived: "Archived", version: "Version",
    validUntil: "Valid until", issued: "Issued", replaced: "Replaced on", by: "by",
    noFiles: "No file attached to this version.", open: "Open", download: "Download",
    compare: "⇆ Compare", single: "▣ Single", rotate: "Rotate", fit: "Fit",
    previous: "Previous version", close: "Close", full: "Full screen", exitFull: "Exit full screen",
    page: "Page", of: "of", loadingPages: "counting pages…",
    cantPreview: "This file can't be previewed here.", empty: "No documents attached yet.",
    files: (n) => `${n} file${n === 1 ? "" : "s"}`, hint: "← → pages · ↑ ↓ files · Esc close",
  },
  ar: {
    docs: "المستندات", current: "الحالي", archived: "مؤرشف", version: "الإصدار",
    validUntil: "ساري حتى", issued: "صدر", replaced: "استُبدل في", by: "بواسطة",
    noFiles: "لا يوجد ملف مرفق لهذا الإصدار.", open: "فتح", download: "تنزيل",
    compare: "⇆ مقارنة", single: "▣ عرض واحد", rotate: "تدوير", fit: "ملاءمة",
    previous: "الإصدار السابق", close: "إغلاق", full: "ملء الشاشة", exitFull: "إنهاء ملء الشاشة",
    page: "صفحة", of: "من", loadingPages: "جارٍ عدّ الصفحات…",
    cantPreview: "لا يمكن معاينة هذا الملف هنا.", empty: "لا توجد مستندات مرفقة بعد.",
    files: (n) => `${n} ملف`, hint: "← → الصفحات · ↑ ↓ الملفات · Esc إغلاق",
  },
};

const C = { ink: "#0f172a", sub: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f8fafc", brand: "#4f46e5" };
const tool = {
  background: "#fff", border: `1px solid ${C.line}`, color: "#334155", borderRadius: 8, padding: "7px 11px",
  fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex",
  alignItems: "center", gap: 4, lineHeight: 1.1,
};

/* ───────────── file helpers ───────────── */
const isCloudPdf = (url) => isPdfUrl(url) && String(url).includes("/image/upload/");
/** One page of a Cloudinary PDF as a JPG. */
function pdfPage(url, page, w = 1600) {
  return String(url).replace("/image/upload/", `/image/upload/f_jpg,pg_${page},q_auto,w_${w},c_limit/`);
}
const isPicture = (url) => isImageUrl(url) && !isPdfUrl(url);

function fileName(f, i) {
  if (f.name) return f.name;
  const tail = decodeURIComponent(String(f.url).split("?")[0].split("/").pop() || "");
  if (tail && tail.length < 40) return tail;
  return isPdfUrl(f.url) ? `PDF ${i + 1}` : isPicture(f.url) ? `Image ${i + 1}` : `File ${i + 1}`;
}

/** Counts the pages of a Cloudinary PDF by loading pg_1, pg_2 … (small, cached by the CDN). */
function usePdfPageCount(url) {
  const [count, setCount] = useState({ url: "", n: 0, done: false });
  useEffect(() => {
    if (!isCloudPdf(url)) { setCount({ url, n: 0, done: true }); return undefined; }
    let alive = true;
    setCount({ url, n: 1, done: false });
    const probe = (p) => {
      if (p > 80) { if (alive) setCount({ url, n: 80, done: true }); return; }
      const img = new Image();
      img.onload = () => { if (!alive) return; setCount({ url, n: p, done: false }); probe(p + 1); };
      img.onerror = () => { if (alive) setCount({ url, n: Math.max(1, p - 1), done: true }); };
      img.src = pdfPage(url, p, 60);
    };
    probe(1);
    return () => { alive = false; };
  }, [url]);
  return count.url === url ? count : { n: 0, done: false };
}

function Thumb({ url, size = 46 }) {
  const src = isCloudPdf(url) ? pdfPage(url, 1, 160) : isPicture(url) ? displayUrl(url, 160) : "";
  return (
    <span style={{ position: "relative", flex: "none", display: "block" }}>
      {src ? (
        <img src={src} alt="" style={{ width: size, height: size * 0.76, objectFit: "cover", objectPosition: "top", borderRadius: 6, border: `1px solid ${C.line}`, display: "block", background: "#fff" }} />
      ) : (
        <span style={{ width: size, height: size * 0.76, borderRadius: 6, display: "grid", placeItems: "center", background: C.soft, border: `1px solid ${C.line}`, color: C.sub, fontWeight: 900, fontSize: 10 }}>FILE</span>
      )}
      {isPdfUrl(url) && (
        <span style={{ position: "absolute", bottom: 2, insetInlineEnd: 2, background: "#dc2626", color: "#fff", fontSize: 8, fontWeight: 900, borderRadius: 3, padding: "0 3px" }}>PDF</span>
      )}
    </span>
  );
}

/* ───────────── one viewing pane ───────────── */
function Pane({ t, lang, file, tag, tagTone, compact, page, setPage, pageInfo }) {
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const scroller = useRef(null);
  useEffect(() => { setZoom(1); setRot(0); }, [file?.url]);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [page, file?.url]);

  if (!file) {
    return <div style={{ flex: 1, display: "grid", placeItems: "center", color: C.faint, fontWeight: 700, background: C.soft, borderRadius: 12 }}>{t.noFiles}</div>;
  }
  const cloudPdf = isCloudPdf(file.url);
  const picture = isPicture(file.url);
  const zoomable = cloudPdf || picture;
  const src = cloudPdf ? pdfPage(file.url, page, 2000) : picture ? displayUrl(file.url, 2000) : "";
  const n = pageInfo?.n || 1;
  const multi = cloudPdf && (n > 1 || !pageInfo?.done);
  const prevIcon = lang === "ar" ? "▶" : "◀";
  const nextIcon = lang === "ar" ? "◀" : "▶";
  const rotated = rot % 180 !== 0;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      {/* toolbar */}
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: tagTone.bg, color: tagTone.color, border: `1px solid ${tagTone.bd}` }}>{tag}</span>
        <b style={{ fontSize: 14, flex: 1, minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.label}>{file.label}</b>
        {multi && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 10, padding: 3 }}>
            <button type="button" style={{ ...tool, padding: "5px 9px" }} disabled={page <= 1} onClick={() => setPage(page - 1)}>{prevIcon}</button>
            <span style={{ fontSize: 13, fontWeight: 800, padding: "0 6px", whiteSpace: "nowrap" }}>
              {t.page} {page} {t.of} {pageInfo?.done ? n : `${n}…`}
            </span>
            <button type="button" style={{ ...tool, padding: "5px 9px" }} disabled={pageInfo?.done && page >= n} onClick={() => setPage(page + 1)}>{nextIcon}</button>
          </span>
        )}
        {zoomable && (
          <>
            <button type="button" style={tool} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</button>
            <button type="button" style={{ ...tool, minWidth: 58, justifyContent: "center" }} onClick={() => setZoom(1)} title={t.fit}>{Math.round(zoom * 100)}%</button>
            <button type="button" style={tool} onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>＋</button>
            <button type="button" style={tool} onClick={() => setRot((r) => (r + 90) % 360)} title={t.rotate}>⟳</button>
          </>
        )}
        {!compact && <a href={file.url} target="_blank" rel="noreferrer" style={tool}>↗ {t.open}</a>}
        <a href={file.url} download style={tool} title={t.download}>⬇</a>
      </div>

      {/* page */}
      <div ref={scroller} style={{
        flex: 1, minHeight: 0, overflow: "auto", padding: 16,
        background: "repeating-conic-gradient(#eef2f7 0% 25%, #f8fafc 0% 50%) 50% / 24px 24px",
        display: "flex", justifyContent: "center", alignItems: zoom <= 1 && !rotated ? "center" : "flex-start",
      }}>
        {zoomable ? (
          <img key={src} src={src} alt={file.label}
            style={{
              display: "block",
              ...(zoom <= 1
                ? (rotated ? { maxWidth: "70vh", maxHeight: "60vw" } : { maxWidth: "100%", maxHeight: "100%" })
                : { width: `${zoom * 100}%`, maxWidth: "none" }),
              transform: `rotate(${rot}deg)${zoom < 1 ? ` scale(${zoom})` : ""}`,
              transformOrigin: "center", transition: "transform .2s",
              margin: rotated ? "12% 0" : 0,
              borderRadius: 6, boxShadow: "0 10px 30px rgba(15,23,42,0.22)", background: "#fff",
            }} />
        ) : isPdfUrl(file.url) ? (
          <iframe title={file.label} src={file.url} style={{ width: "100%", height: "100%", minHeight: 480, border: "none", borderRadius: 8, background: "#fff" }} />
        ) : (
          <div style={{ color: C.sub, fontWeight: 700, alignSelf: "center" }}>{t.cantPreview}</div>
        )}
      </div>

      {/* page strip */}
      {multi && !compact && n > 1 && (
        <div style={{ borderTop: `1px solid ${C.line}`, padding: "8px 10px", display: "flex", gap: 8, overflowX: "auto", background: "#fcfcfd" }}>
          {Array.from({ length: n }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => setPage(p)} style={{
              flex: "none", padding: 2, borderRadius: 6, cursor: "pointer", background: "#fff",
              border: `2px solid ${p === page ? C.brand : C.line}`, position: "relative",
            }}>
              <img src={pdfPage(file.url, p, 120)} alt="" style={{ width: 52, height: 68, objectFit: "cover", objectPosition: "top", display: "block", borderRadius: 3 }} />
              <span style={{ position: "absolute", bottom: 3, insetInlineStart: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 900, background: p === page ? C.brand : "rgba(15,23,42,0.7)", color: "#fff", borderRadius: 4, padding: "0 5px" }}>{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── main ───────────── */
export default function DocumentsViewer({ item, lang = "en", onClose }) {
  const t = L[lang] || L.en;
  const versions = useMemo(() => documentVersions(item), [item]);
  const flat = useMemo(() => {
    const out = [];
    versions.forEach((v, vi) => v.files.forEach((f, fi) => {
      if (f.carried) return;
      out.push({ ...f, vi, label: fileName(f, fi) });
    }));
    return out;
  }, [versions]);

  const [sel, setSel] = useState(0);
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const boxRef = useRef(null);

  const cur = flat[sel] || null;
  const pageInfo = usePdfPageCount(cur?.url || "");
  useEffect(() => { setPage(1); }, [sel]);

  // close / navigate with the keyboard
  const nav = useRef({});
  nav.current = { flatN: flat.length, pageInfo, page };
  useEffect(() => {
    const k = (e) => {
      const { flatN, pageInfo: pi, page: pg } = nav.current;
      if (e.key === "Escape" && !document.fullscreenElement) { onClose?.(); return; }
      const fwd = lang === "ar" ? "ArrowLeft" : "ArrowRight";
      const back = lang === "ar" ? "ArrowRight" : "ArrowLeft";
      if (e.key === fwd || e.key === "PageDown") {
        if (!(pi.done && pg >= pi.n) && pi.n > 0) setPage(pg + 1);
        e.preventDefault();
      } else if (e.key === back || e.key === "PageUp") {
        if (pg > 1) setPage(pg - 1);
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        setSel((s) => Math.min(flatN - 1, s + 1)); e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setSel((s) => Math.max(0, s - 1)); e.preventDefault();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [lang, onClose]);

  useEffect(() => {
    const f = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else boxRef.current?.requestFullscreen?.().catch(() => {});
  }
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen?.(); }, []);

  // lock page scroll behind the popup
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const curVersion = cur ? versions[cur.vi] : versions[0];
  const olderV = cur ? versions.slice(cur.vi + 1).find((v) => v.files.some((f) => !f.carried)) : null;
  const olderFile = olderV ? (() => { const f = olderV.files.find((x) => !x.carried); return f ? { ...f, label: fileName(f, 0) } : null; })() : null;
  const olderInfo = usePdfPageCount(compare && olderFile ? olderFile.url : "");
  const [olderPage, setOlderPage] = useState(1);
  useEffect(() => { setOlderPage(1); }, [olderFile?.url]);
  const canCompare = !!olderFile;
  const st = STATUS[statusOf(item.expiryDate).key];

  const toneCurrent = { bg: "#ecfdf5", color: "#065f46", bd: "#a7f3d0" };
  const toneArchived = { bg: "#f1f5f9", color: "#475569", bd: "#cbd5e1" };
  const tagFor = (v) => (v.current ? t.current : `${t.archived} · ${t.version} ${v.n}`);

  const ui = (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.65)", zIndex: 10001 }}>
      <div ref={boxRef} dir={lang === "ar" ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", inset: isFull ? 0 : 14, background: "#fff", borderRadius: isFull ? 0 : 16,
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: 'system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif', color: C.ink,
      }}>
        {/* header */}
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.line}`, background: "linear-gradient(90deg,#eef2ff,#ffffff 60%)", flexWrap: "wrap" }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#fff", border: `1px solid ${C.line}`, fontSize: 20 }}>{item.kind === "license" ? "🪪" : "📄"}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 17, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}{item.company ? ` — ${item.company}` : ""}</div>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 700 }}>
              {item.branch} · {t.docs}: {flat.length} · {t.validUntil} <span style={{ color: st.color }}>{fmtDate(item.expiryDate, lang)}</span>
              <span style={{ color: C.faint, marginInlineStart: 10, fontWeight: 600 }}>{t.hint}</span>
            </div>
          </div>
          {canCompare && (
            <button type="button" onClick={() => setCompare((c) => !c)}
              style={{ ...tool, padding: "9px 13px", background: compare ? C.brand : "#fff", color: compare ? "#fff" : "#334155", borderColor: compare ? C.brand : C.line }}>
              {compare ? t.single : t.compare}
            </button>
          )}
          <button type="button" onClick={toggleFull} style={{ ...tool, padding: "9px 13px" }} title={isFull ? t.exitFull : t.full}>{isFull ? "🗗" : "⛶"} {isFull ? t.exitFull : t.full}</button>
          <button type="button" onClick={onClose} style={{ ...tool, padding: "9px 13px", color: "#991b1b", borderColor: "#fecaca" }}>✕ {t.close}</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "290px minmax(0,1fr)" }}>
          {/* versions timeline */}
          <div style={{ borderInlineEnd: `1px solid ${C.line}`, overflowY: "auto", padding: 12, background: "#fcfcfd" }}>
            {flat.length === 0 && <div style={{ color: C.faint, fontWeight: 700, padding: 10 }}>{t.empty}</div>}
            {versions.map((v, vi) => {
              const files = v.files.filter((f) => !f.carried);
              const tone = v.current ? toneCurrent : toneArchived;
              return (
                <div key={vi} style={{ position: "relative", paddingInlineStart: 18, marginBottom: 16 }}>
                  <span style={{ position: "absolute", insetInlineStart: 4, top: 6, width: 10, height: 10, borderRadius: 99, background: v.current ? "#10b981" : "#cbd5e1", boxShadow: `0 0 0 3px ${v.current ? "#d1fae5" : "#f1f5f9"}` }} />
                  {vi < versions.length - 1 && <span style={{ position: "absolute", insetInlineStart: 8, top: 18, bottom: -16, width: 2, background: C.line }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 900, padding: "2px 9px", borderRadius: 999, background: tone.bg, color: tone.color, border: `1px solid ${tone.bd}` }}>{tagFor(v)}</span>
                    <span style={{ fontSize: 12, color: C.faint, fontWeight: 700 }}>{t.files(files.length)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginTop: 5, lineHeight: 1.55 }}>
                    {v.issuedOn && <div>{t.issued}: {fmtDate(v.issuedOn, lang)}</div>}
                    <div>{t.validUntil}: <b>{fmtDate(v.validUntil, lang)}</b></div>
                    {!v.current && v.replacedOn && <div style={{ color: C.sub }}>{t.replaced} {fmtDate(v.replacedOn, lang)}{v.replacedBy ? ` · ${t.by} ${v.replacedBy}` : ""}</div>}
                    {v.note && <div style={{ color: C.sub, background: C.soft, borderRadius: 8, padding: "4px 8px", marginTop: 4 }}>📝 {v.note}</div>}
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
                          opacity: v.current ? 1 : 0.85, width: "100%", minWidth: 0,
                        }}>
                          <Thumb url={f.url} />
                          <span style={{ fontSize: 13, fontWeight: 800, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={flat[idx]?.label}>{flat[idx]?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* viewer */}
          <div style={{ minWidth: 0, minHeight: 0, padding: 10, display: "flex", gap: 10, background: "#f1f5f9" }}>
            <Pane t={t} lang={lang} file={cur} tag={curVersion ? tagFor(curVersion) : ""} tagTone={curVersion?.current ? toneCurrent : toneArchived}
              compact={compare} page={page} setPage={setPage} pageInfo={pageInfo} />
            {compare && canCompare && (
              <Pane t={t} lang={lang} file={olderFile} tag={`${t.previous} · ${t.version} ${olderV.n}`} tagTone={toneArchived}
                compact page={olderPage} setPage={setOlderPage} pageInfo={olderInfo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // rendered on <body> so no transformed / clipped parent can shrink it
  return createPortal(ui, document.body);
}
