// src/pages/haccp and iso/_shared/ImageLightbox.jsx
// Full-screen image viewer: zoom (wheel / buttons / double-click), drag to pan,
// rotate, swipe or arrows to move between images, thumbnail strip, real
// download, open original. Rendered through a portal on <body> so it escapes
// globals.css' forced font sizes and any overflow/stacking of the page;
// `theme-keep` keeps it dark and photos un-flipped in night mode.
//
// Cloudinary URLs get delivery transforms: f_auto turns iPhone HEIC photos
// into something every browser can show, and thumbnails are small crops
// instead of the full multi-MB original.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

export function cldUrl(url, transform) {
  const m = CLD.exec(String(url || ""));
  return m ? `${m[1]}${transform}/${m[2]}` : url;
}
export const thumbUrl = (u) => cldUrl(u, "c_fill,w_160,h_160,g_auto,f_auto,q_auto");
export const viewUrl = (u) => cldUrl(u, "f_auto,q_auto,w_2400,c_limit");
export const downloadUrl = (u) => cldUrl(u, "fl_attachment");

export function isImageUrl(url, name) {
  const s = `${name || ""} ${url || ""}`.toLowerCase();
  if (/\.pdf(\?|\s|$)/.test(s)) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif|avif|tiff?)(\?|\s|$)/.test(s) || CLD.test(String(url || ""));
}

/* <img> that shows the light thumbnail and falls back to the original if the transform fails */
export function Thumb({ url, alt, className, style }) {
  const [src, setSrc] = useState(thumbUrl(url));
  useEffect(() => { setSrc(thumbUrl(url)); }, [url]);
  return (
    <img
      src={src}
      alt={alt || ""}
      className={className}
      style={style}
      loading="lazy"
      draggable={false}
      onError={() => { if (src !== url) setSrc(url); }}
    />
  );
}

const ZMIN = 1;
const ZMAX = 6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CSS = `
.ilb{position:fixed;inset:0;z-index:2147480000;background:rgba(9,14,26,.96);color:#fff;
  font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;display:flex;flex-direction:column;
  user-select:none;-webkit-user-select:none;animation:ilbIn .16s ease-out}
@keyframes ilbIn{from{opacity:0}to{opacity:1}}
.ilb *{box-sizing:border-box}
.ilb-top{display:flex;align-items:center;gap:12px;padding:10px 14px;background:linear-gradient(180deg,rgba(9,14,26,.95),rgba(9,14,26,.6));
  position:relative;z-index:3;flex-wrap:wrap}
.ilb-info{flex:1 1 200px;min-width:0}
.ilb-title{font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ilb-sub{font-size:12.5px;opacity:.72;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ilb-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ilb-b{height:36px;min-width:36px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.08);color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;
  align-items:center;justify-content:center;gap:5px;text-decoration:none;font-family:inherit;transition:background .15s}
.ilb-b:hover{background:rgba(255,255,255,.2)}
.ilb-b:disabled{opacity:.35;cursor:default}
.ilb-b.x{background:rgba(220,38,38,.85);border-color:rgba(255,255,255,.25)}
.ilb-b.x:hover{background:#dc2626}
.ilb-z{font-size:12.5px;font-weight:800;min-width:46px;text-align:center;opacity:.85}
.ilb-sep{width:1px;height:22px;background:rgba(255,255,255,.18);margin:0 2px}
.ilb-stage{position:relative;flex:1;overflow:hidden;touch-action:none;display:flex;align-items:center;justify-content:center}
.ilb-img{max-width:100%;max-height:100%;object-fit:contain;display:block;will-change:transform;
  box-shadow:0 10px 40px rgba(0,0,0,.5);background:#111;border-radius:2px}
.ilb-img.anim{transition:transform .18s ease-out}
.ilb-stage.grab{cursor:grab}.ilb-stage.grabbing{cursor:grabbing}
.ilb-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:52px;height:52px;border-radius:50%;
  border:1px solid rgba(255,255,255,.22);background:rgba(15,23,42,.55);color:#fff;font-size:30px;line-height:1;
  cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
.ilb-nav:hover{background:rgba(59,130,246,.75)}
.ilb-nav.l{left:14px}.ilb-nav.r{right:14px}
.ilb-msg{position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;opacity:.9;pointer-events:none}
.ilb-msg a{pointer-events:auto}
.ilb-spin{width:38px;height:38px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#60a5fa;animation:ilbSpin .8s linear infinite}
@keyframes ilbSpin{to{transform:rotate(360deg)}}
.ilb-strip{display:flex;gap:8px;padding:10px 14px 14px;overflow-x:auto;justify-content:center;position:relative;z-index:3;
  background:linear-gradient(0deg,rgba(9,14,26,.95),rgba(9,14,26,.55))}
.ilb-t{flex:0 0 auto;width:62px;height:62px;border-radius:9px;overflow:hidden;border:2px solid transparent;opacity:.55;
  cursor:pointer;padding:0;background:#1e293b;transition:opacity .15s,border-color .15s}
.ilb-t:hover{opacity:.9}
.ilb-t.on{border-color:#60a5fa;opacity:1}
.ilb-t img{width:100%;height:100%;object-fit:cover;display:block}
.ilb-hint{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:12px;opacity:.55;pointer-events:none;white-space:nowrap}
@media (max-width:640px){
  .ilb-nav{width:42px;height:42px;font-size:24px}
  .ilb-nav.l{left:6px}.ilb-nav.r{right:6px}
  .ilb-hide-sm{display:none}
  .ilb-t{width:50px;height:50px}
  .ilb-hint{display:none}
}
`;

/**
 * images: [{ url, name }]
 * index:  first image to show
 * title:  heading (e.g. the equipment name); falls back to "Image n / N"
 */
export default function ImageLightbox({ images, index = 0, title, isAr, onClose }) {
  const total = images?.length || 0;
  const [i, setI] = useState(clamp(index, 0, Math.max(0, total - 1)));
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [state, setState] = useState("loading"); // loading | ok | error
  const [original, setOriginal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ptr = useRef(null);
  const stageRef = useRef(null);
  const L = (ar, en) => (isAr ? ar : en);

  const cur = images?.[i];
  const go = useCallback((d) => { if (total > 1) setI((v) => (v + d + total) % total); }, [total]);
  const setZoomTo = useCallback((z) => {
    const nz = clamp(z, ZMIN, ZMAX);
    setZoom(nz);
    if (nz === 1) setPan({ x: 0, y: 0 });
  }, []);
  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); setRot(0); }, []);

  /* new image → fresh view */
  useEffect(() => { reset(); setState("loading"); setOriginal(false); }, [i, reset]);

  /* keyboard + scroll lock */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setZoomTo(zoom * 1.25);
      else if (e.key === "-" || e.key === "_") setZoomTo(zoom / 1.25);
      else if (e.key === "0") reset();
      else if (e.key === "r" || e.key === "R") setRot((r) => r + 90);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose, reset, setZoomTo, zoom]);

  /* wheel zoom — attached natively so preventDefault works (React wheel listeners are passive) */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) => {
        const nz = clamp(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), ZMIN, ZMAX);
        if (nz === 1) setPan({ x: 0, y: 0 });
        return nz;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* preload the neighbours so next/prev is instant */
  useEffect(() => {
    if (total < 2) return;
    [1, -1].forEach((d) => {
      const n = images[(i + d + total) % total];
      if (n?.url) { const im = new Image(); im.src = viewUrl(n.url); }
    });
  }, [i, images, total]);

  if (!cur) return null;

  const src = original ? cur.url : viewUrl(cur.url);

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    ptr.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false, onImg: e.target.tagName === "IMG" };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (zoom > 1) setDragging(true);
  }
  function onPointerMove(e) {
    const p = ptr.current;
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) p.moved = true;
    if (zoom > 1) setPan({ x: p.px + dx, y: p.py + dy });
  }
  function onPointerUp(e) {
    const p = ptr.current;
    ptr.current = null;
    setDragging(false);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (zoom === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(dx < 0 ? 1 : -1); return; }
    if (!p.moved && !p.onImg && zoom === 1) onClose(); // tap on the dark area closes
  }

  const name = cur.name || "";
  const heading = title || `${L("صورة", "Image")} ${i + 1} / ${total}`;
  const sub = [title ? `${i + 1} / ${total}` : "", name].filter(Boolean).join(" · ");

  return createPortal(
    <div className="ilb theme-keep" role="dialog" aria-modal="true" aria-label={heading} dir="ltr">
      <style>{CSS}</style>

      <div className="ilb-top">
        <div className="ilb-info" dir={isAr ? "rtl" : "ltr"}>
          <div className="ilb-title">{heading}</div>
          {sub && <div className="ilb-sub">{sub}</div>}
        </div>
        <div className="ilb-tools">
          <button type="button" className="ilb-b" onClick={() => setZoomTo(zoom / 1.25)} disabled={zoom <= ZMIN} title={L("تصغير (-)", "Zoom out (-)")}>−</button>
          <span className="ilb-z">{Math.round(zoom * 100)}%</span>
          <button type="button" className="ilb-b" onClick={() => setZoomTo(zoom * 1.25)} disabled={zoom >= ZMAX} title={L("تكبير (+)", "Zoom in (+)")}>+</button>
          <button type="button" className="ilb-b ilb-hide-sm" onClick={reset} title={L("ملاءمة الشاشة (0)", "Fit to screen (0)")}>⤢</button>
          <button type="button" className="ilb-b" onClick={() => setRot((r) => r + 90)} title={L("تدوير (R)", "Rotate (R)")}>⟳</button>
          <span className="ilb-sep ilb-hide-sm" />
          <a className="ilb-b" href={downloadUrl(cur.url)} download={name || undefined} title={L("تنزيل", "Download")}>⬇<span className="ilb-hide-sm">{L("تنزيل", "Download")}</span></a>
          <a className="ilb-b ilb-hide-sm" href={cur.url} target="_blank" rel="noreferrer" title={L("فتح الأصل في تبويب جديد", "Open original in a new tab")}>↗</a>
          <button type="button" className="ilb-b x" onClick={onClose} title={L("إغلاق (Esc)", "Close (Esc)")} aria-label={L("إغلاق", "Close")}>✕</button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`ilb-stage${zoom > 1 ? (dragging ? " grabbing" : " grab") : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { ptr.current = null; setDragging(false); }}
        onDoubleClick={() => setZoomTo(zoom > 1 ? 1 : 2.5)}
      >
        <img
          key={src}
          src={src}
          alt={name}
          draggable={false}
          className={`ilb-img${dragging ? "" : " anim"}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rot}deg)`,
            visibility: state === "error" ? "hidden" : "visible",
          }}
          onLoad={() => setState("ok")}
          onError={() => {
            if (!original && src !== cur.url) setOriginal(true);
            else setState("error");
          }}
        />

        {state === "loading" && <div className="ilb-msg"><div className="ilb-spin" /></div>}
        {state === "error" && (
          <div className="ilb-msg">
            <div>⚠ {L("تعذّر عرض الصورة هنا", "This image can't be shown here")}</div>
            <a className="ilb-b" href={cur.url} target="_blank" rel="noreferrer">↗ {L("فتح الملف الأصلي", "Open the original file")}</a>
          </div>
        )}

        {total > 1 && (
          <>
            <button type="button" className="ilb-nav l" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)} aria-label={L("السابقة", "Previous")}>‹</button>
            <button type="button" className="ilb-nav r" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)} aria-label={L("التالية", "Next")}>›</button>
          </>
        )}
        {zoom === 1 && state === "ok" && (
          <div className="ilb-hint">
            {L("عجلة الماوس أو نقرتين للتكبير · اسحب للتنقل · Esc للإغلاق", "Wheel or double-click to zoom · swipe to browse · Esc to close")}
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="ilb-strip">
          {images.map((im, k) => (
            <button
              key={im.url + k}
              type="button"
              className={`ilb-t${k === i ? " on" : ""}`}
              onClick={() => setI(k)}
              title={im.name || `${k + 1}`}
              aria-label={`${L("صورة", "Image")} ${k + 1}`}
            >
              <Thumb url={im.url} alt={im.name} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
