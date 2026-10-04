// src/pages/shared/ImageLightbox.jsx
// The read-only photo viewer behind the 👁 buttons on the browse pages
// (returns, customer returns, destruction, meat daily).
//
// Everything here only changes how the picture is LOOKED AT: zoom, pan,
// rotate, flip, full screen, download, copy, print, open in a new tab.
// Nothing is saved back - a rotated photo is rotated on this screen only, and
// there is no delete or replace. The pages that own the photos keep that.
//
// Keys: ← → photo · + − zoom · 0 fit · R / Shift+R rotate · F full screen · Esc close
// Mouse: wheel zooms at the pointer, drag pans, double-click toggles 2x.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiX, FiZoomIn, FiZoomOut, FiMaximize, FiMinimize, FiRotateCcw, FiRotateCw,
  FiDownload, FiCopy, FiPrinter, FiExternalLink, FiChevronLeft, FiChevronRight,
  FiMaximize2, FiCheck,
} from "react-icons/fi";
import { thumbUrl } from "../../utils/imageUpload";

const MIN = 0.2;
const MAX = 8;
const START = { scale: 1, rot: 0, flip: false, x: 0, y: 0 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** A file name a person can recognise later: "Roast Chicken Sausage-2.jpg". */
function fileNameFor(title, index, src) {
  const base = String(title || "image").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || "image";
  const ext = (String(src).split("?")[0].match(/\.(jpe?g|png|webp|gif|heic|avif)$/i) || [])[1] || "jpg";
  return `${base}-${index + 1}.${ext.toLowerCase()}`;
}

/** The picture as a PNG blob - the one image type every clipboard accepts. */
function pngBlobOf(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

export default function ImageLightbox({ open, images = [], title = "", startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(0);
  const [view, setView] = useState(START);
  const [full, setFull] = useState(false);
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const drag = useRef(null);
  const noteTimer = useRef(0);

  const count = images.length;
  const src = images[idx] || "";

  useEffect(() => {
    if (open) {
      setIdx(clamp(startIndex, 0, Math.max(0, count - 1)));
      setView(START);
    }
  }, [open, startIndex, count]);

  // each photo opens fitted and upright
  useEffect(() => {
    setView(START);
    setLoaded(false);
  }, [idx]);

  const flash = useCallback((msg) => {
    setNote(msg);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(""), 1800);
  }, []);

  const go = useCallback((d) => {
    if (count > 1) setIdx((i) => (i + d + count) % count);
  }, [count]);

  /* Zoom keeping the point under `at` (stage-centre coordinates) still. */
  const zoomBy = useCallback((factor, at = { x: 0, y: 0 }) => {
    setView((v) => {
      const scale = clamp(v.scale * factor, MIN, MAX);
      const k = scale / v.scale;
      if (scale <= 1) return { ...v, scale, x: scale === 1 ? 0 : v.x * k, y: scale === 1 ? 0 : v.y * k };
      return { ...v, scale, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k };
    });
  }, []);

  const pointAt = (e) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  const rotate = (d) => setView((v) => ({ ...v, rot: (v.rot + d + 360) % 360 }));
  const reset = () => setView(START);

  const toggleFull = useCallback(() => {
    const el = rootRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const download = async () => {
    const name = fileNameFor(title, idx, src);
    try {
      const res = await fetch(src, { mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      flash("Downloaded");
    } catch {
      // the host refused a cross-site read: hand the file to the browser instead
      window.open(src, "_blank", "noopener");
    }
  };

  const copy = async () => {
    try {
      if (!navigator.clipboard?.write || typeof window.ClipboardItem === "undefined") throw new Error("no clipboard");
      const blob = await pngBlobOf(src);
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      flash("Image copied — paste it anywhere");
    } catch {
      try {
        await navigator.clipboard.writeText(src);
        flash("Link copied");
      } catch {
        flash("Copy is not allowed in this browser");
      }
    }
  };

  const print = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const safe = String(title || "").replace(/[<>&]/g, "");
    w.document.write(
      `<!doctype html><html><head><title>${safe}</title><style>` +
        `body{margin:0;font-family:sans-serif;text-align:center}` +
        `h3{margin:12px 0 8px;font-size:15px}` +
        `img{max-width:100%;max-height:92vh;transform:rotate(${view.rot}deg) scaleX(${view.flip ? -1 : 1})}` +
        `</style></head><body><h3>${safe}</h3><img src="${src}" onload="setTimeout(function(){print();},150)"></body></html>`
    );
    w.document.close();
  };

  /* keyboard */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      const k = e.key;
      if (k === "Escape") {
        if (document.fullscreenElement) return; // the browser leaves full screen first
        onClose?.();
      } else if (k === "ArrowRight") go(1);
      else if (k === "ArrowLeft") go(-1);
      else if (k === "+" || k === "=") zoomBy(1.25);
      else if (k === "-" || k === "_") zoomBy(1 / 1.25);
      else if (k === "0") reset();
      else if (k === "r" || k === "R") rotate(e.shiftKey ? -90 : 90);
      else if (k === "f" || k === "F") toggleFull();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, go, zoomBy, toggleFull, onClose]);

  /* wheel must be non-passive to stop the page scrolling under the viewer */
  useEffect(() => {
    const el = stageRef.current;
    if (!open || !el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, pointAt(e));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, zoomBy]);

  if (!open) return null;

  const onDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    setView((v) => ({ ...v, x: d.x + e.clientX - d.sx, y: d.y + e.clientY - d.sy }));
  };
  const onUp = () => { drag.current = null; };

  const tool = (icon, label, onClick, opts = {}) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={opts.disabled}
      style={{ ...S.btn, ...(opts.active ? S.btnOn : null), ...(opts.disabled ? S.btnOff : null) }}
    >
      {icon}
    </button>
  );

  const pct = Math.round(view.scale * 100);

  return (
    <div ref={rootRef} style={S.overlay} onClick={onClose} dir="ltr">
      <div style={S.frame} onClick={(e) => e.stopPropagation()}>
        {/* top bar */}
        <div style={S.bar}>
          <div style={S.title} title={title}>
            {title || "Images"}
            {count > 1 && <span style={S.count}>{idx + 1} / {count}</span>}
          </div>
          <div style={S.tools}>
            {tool(<FiZoomOut />, "Zoom out (−)", () => zoomBy(1 / 1.25), { disabled: view.scale <= MIN })}
            <button type="button" onClick={reset} title="Fit to screen (0)" style={{ ...S.btn, width: "auto", padding: "0 10px", fontWeight: 700 }}>
              {pct}%
            </button>
            {tool(<FiZoomIn />, "Zoom in (+)", () => zoomBy(1.25), { disabled: view.scale >= MAX })}
            <span style={S.sep} />
            {tool(<FiRotateCcw />, "Rotate left (Shift+R)", () => rotate(-90))}
            {tool(<FiRotateCw />, "Rotate right (R)", () => rotate(90))}
            {tool(<span style={{ fontWeight: 800, fontSize: 15 }}>⇋</span>, "Mirror", () => setView((v) => ({ ...v, flip: !v.flip })), { active: view.flip })}
            {tool(<FiMaximize2 />, "Reset view (0)", reset)}
            <span style={S.sep} />
            {tool(<FiDownload />, "Download", download)}
            {tool(<FiCopy />, "Copy image", copy)}
            {tool(<FiPrinter />, "Print", print)}
            {tool(<FiExternalLink />, "Open in a new tab", () => window.open(src, "_blank", "noopener"))}
            {tool(full ? <FiMinimize /> : <FiMaximize />, full ? "Exit full screen (F)" : "Full screen (F)", toggleFull, { active: full })}
            <span style={S.sep} />
            {tool(<FiX />, "Close (Esc)", onClose)}
          </div>
        </div>

        {/* the picture */}
        <div
          ref={stageRef}
          style={{ ...S.stage, cursor: drag.current ? "grabbing" : "grab" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={(e) => (view.scale > 1 ? reset() : zoomBy(2 / view.scale, pointAt(e)))}
        >
          {src ? (
            <img
              key={src}
              src={src}
              alt={title || "image"}
              draggable={false}
              onLoad={() => setLoaded(true)}
              style={{
                ...S.img,
                opacity: loaded ? 1 : 0.3,
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale}) rotate(${view.rot}deg) scaleX(${view.flip ? -1 : 1})`,
                transition: drag.current ? "none" : "transform .15s ease, opacity .2s",
              }}
            />
          ) : (
            <div style={{ color: "#cbd5e1" }}>No images.</div>
          )}

          {count > 1 && (
            <>
              <button type="button" style={{ ...S.nav, left: 12 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)} title="Previous (←)">
                <FiChevronLeft />
              </button>
              <button type="button" style={{ ...S.nav, right: 12 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)} title="Next (→)">
                <FiChevronRight />
              </button>
            </>
          )}

          {note && (
            <div style={S.note}>
              <FiCheck style={{ marginRight: 6 }} />
              {note}
            </div>
          )}
        </div>

        {/* thumbnails */}
        {count > 1 && (
          <div style={S.strip}>
            {images.map((u, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                style={{ ...S.thumb, borderColor: i === idx ? "#a78bfa" : "transparent", opacity: i === idx ? 1 : 0.6 }}
              >
                <img src={thumbUrl(u, 160)} alt={`${i + 1}`} style={S.thumbImg} />
              </button>
            ))}
          </div>
        )}

        <div style={S.hint}>
          Wheel = zoom · drag = move · double-click = 2x · ← → photos · view only, nothing here changes the photo
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 10050, background: "rgba(10,10,20,.88)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
  },
  frame: {
    width: "min(1400px, 100%)", height: "100%", display: "flex", flexDirection: "column",
    background: "#111827", borderRadius: 14, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.5)",
  },
  bar: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
    padding: "8px 12px", background: "#1f2937", borderBottom: "1px solid #374151",
  },
  title: {
    color: "#f9fafb", fontWeight: 700, display: "flex", alignItems: "center", gap: 10,
    minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  count: { background: "#374151", color: "#e5e7eb", borderRadius: 999, padding: "2px 10px", fontSize: 12 },
  tools: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  btn: {
    width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "#374151", color: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16,
  },
  btnOn: { background: "#7c3aed", color: "#fff" },
  btnOff: { opacity: 0.4, cursor: "not-allowed" },
  sep: { width: 1, height: 22, background: "#4b5563", margin: "0 4px" },
  stage: {
    position: "relative", flex: 1, minHeight: 0, overflow: "hidden", display: "flex",
    alignItems: "center", justifyContent: "center", background: "#0b0f19", touchAction: "none", userSelect: "none",
  },
  img: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transformOrigin: "center center", pointerEvents: "none" },
  nav: {
    position: "absolute", top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%",
    border: "none", background: "rgba(31,41,55,.8)", color: "#fff", fontSize: 22, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  note: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(16,185,129,.95)",
    color: "#fff", padding: "6px 14px", borderRadius: 999, fontWeight: 700, display: "flex", alignItems: "center",
  },
  strip: { display: "flex", gap: 8, padding: 8, overflowX: "auto", background: "#1f2937", borderTop: "1px solid #374151" },
  thumb: { flex: "0 0 auto", padding: 0, border: "2px solid transparent", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#111827" },
  thumbImg: { width: 84, height: 64, objectFit: "cover", display: "block" },
  hint: { color: "#9ca3af", fontSize: 12, textAlign: "center", padding: "4px 8px 6px", background: "#1f2937" },
};
