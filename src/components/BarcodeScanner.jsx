// src/components/BarcodeScanner.jsx
//
// 📷 Camera barcode reader — a full-screen layer over the page.
//
//   <BarcodeScanner open lang="ar" onResult={(text) => …} onClose={…} />
//
// Reads the codes found on cartons: EAN-13 / EAN-8 / UPC-A / ITF-14 (the
// product number), GS1-128 and GS1 DataMatrix (number + dates + batch) and
// QR. Uses ZXing (@zxing/browser), loaded only when the layer opens, because
// iPhone browsers have no built-in barcode reader. The back camera is asked
// for first.
//
// A handheld / Bluetooth reader types the code like a keyboard and presses
// Enter — the box at the bottom takes it, and also a code typed by hand.
//
// Rendered into <body> (outside #root) so the app's forced font sizes and
// overflow rules don't reach it.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TX = {
  en: {
    title: "Scan the barcode", hint: "Point the camera at the barcode or the square code on the carton.",
    starting: "Starting the camera…", denied: "The camera is blocked. Allow the camera for this site in the browser settings, or type the code below.",
    noCam: "No camera found on this device — type the code or use a barcode reader.",
    manual: "Or type it / use a barcode reader", use: "Use", close: "Close", torch: "🔦 Light",
  },
  ar: {
    title: "امسح الباركود", hint: "وجّه الكاميرا على الباركود أو المربّع اللي على الكرتونة.",
    starting: "عم نشغّل الكاميرا…", denied: "الكاميرا ممنوعة. اسمح للكاميرا لهالموقع من إعدادات المتصفح، أو اكتب الكود تحت.",
    noCam: "ما في كاميرا على هالجهاز — اكتب الكود أو استعمل قارئ باركود.",
    manual: "أو اكتبه / استعمل قارئ الباركود", use: "استعمل", close: "إغلاق", torch: "🔦 ضو",
  },
};

const CSS = `
.bcs { position:fixed; inset:0; z-index:10000; background:#0b1220; color:#fff; display:flex; flex-direction:column;
  font-family: Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
.bcs * { box-sizing:border-box; }
.bcs-top { display:flex; align-items:center; gap:10px; padding:12px 14px; }
.bcs-top h2 { margin:0; font-size:18px; font-weight:800; flex:1; }
.bcs-btn { border:1px solid rgba(255,255,255,.35); background:rgba(255,255,255,.08); color:#fff; border-radius:12px;
  padding:9px 14px; font-size:15px; font-weight:700; cursor:pointer; }
.bcs-btn.pri { background:#2563eb; border-color:#2563eb; }
.bcs-view { position:relative; flex:1; min-height:0; overflow:hidden; background:#000; }
.bcs-view video { width:100%; height:100%; object-fit:cover; }
.bcs-frame { position:absolute; left:50%; top:50%; width:min(78vw, 360px); height:min(46vw, 230px); transform:translate(-50%,-50%);
  border:3px solid #22c55e; border-radius:16px; box-shadow:0 0 0 9999px rgba(0,0,0,.38); pointer-events:none; }
.bcs-line { position:absolute; left:6%; right:6%; top:50%; height:2px; background:#ef4444; box-shadow:0 0 8px #ef4444;
  animation: bcsScan 1.8s ease-in-out infinite alternate; }
@keyframes bcsScan { from { top:12% } to { top:88% } }
.bcs-msg { position:absolute; left:12px; right:12px; bottom:14px; text-align:center; font-size:14px; font-weight:700;
  background:rgba(0,0,0,.55); border-radius:12px; padding:9px 12px; }
.bcs-bottom { padding:12px 14px calc(14px + env(safe-area-inset-bottom)); display:grid; gap:8px; }
.bcs-bottom label { font-size:13px; opacity:.85; }
.bcs-row { display:flex; gap:8px; }
.bcs-row input { flex:1; min-width:0; border-radius:12px; border:1px solid rgba(255,255,255,.35); background:#111a2e; color:#fff;
  padding:11px 12px; font-size:16px; direction:ltr; }
`;

export default function BarcodeScanner({ open, lang = "en", onResult, onClose }) {
  const s = TX[lang === "ar" ? "ar" : "en"];
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const doneRef = useRef(false);
  const [state, setState] = useState("starting"); // starting | live | denied | nocam
  const [torch, setTorch] = useState(null); // null = not supported
  const [typed, setTyped] = useState("");
  // the latest callback, without restarting the camera when the parent re-renders
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!open) return undefined;
    doneRef.current = false;
    setState("starting");
    setTyped("");
    let alive = true;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"), import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF,
          BarcodeFormat.CODE_128, BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (!result || doneRef.current) return;
            doneRef.current = true;
            try { navigator.vibrate?.(80); } catch { /* no vibration */ }
            controlsRef.current?.stop();
            onResultRef.current?.(result.getText());
          }
        );
        if (!alive) { controls.stop(); return; }
        controlsRef.current = controls;
        setState("live");
        if (typeof controls.switchTorch === "function") setTorch(false);
      } catch (e) {
        if (!alive) return;
        const name = e?.name || "";
        setState(name === "NotFoundError" || name === "OverconstrainedError" ? "nocam" : "denied");
      }
    })();
    return () => {
      alive = false;
      try { controlsRef.current?.stop(); } catch { /* already stopped */ }
      controlsRef.current = null;
      setTorch(null);
    };
  }, [open]);

  if (!open) return null;

  const submitTyped = () => {
    const v = typed.trim();
    if (!v || doneRef.current) return;
    doneRef.current = true;
    onResultRef.current?.(v);
  };
  const flipTorch = async () => {
    try { await controlsRef.current?.switchTorch?.(!torch); setTorch(!torch); } catch { setTorch(null); }
  };

  return createPortal(
    <div className="bcs" dir={lang === "ar" ? "rtl" : "ltr"} role="dialog" aria-label={s.title}>
      <style>{CSS}</style>
      <div className="bcs-top">
        <h2>📷 {s.title}</h2>
        {torch !== null ? <button type="button" className="bcs-btn" onClick={flipTorch}>{s.torch}</button> : null}
        <button type="button" className="bcs-btn" onClick={onClose}>{s.close}</button>
      </div>
      <div className="bcs-view">
        <video ref={videoRef} muted playsInline />
        {state === "live" ? <div className="bcs-frame"><div className="bcs-line" /></div> : null}
        <div className="bcs-msg">
          {state === "starting" ? s.starting : state === "denied" ? s.denied : state === "nocam" ? s.noCam : s.hint}
        </div>
      </div>
      <div className="bcs-bottom">
        <label htmlFor="bcs-typed">{s.manual}</label>
        <div className="bcs-row">
          <input id="bcs-typed" value={typed} inputMode="text" autoComplete="off" autoCorrect="off" spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTyped(); } }} />
          <button type="button" className="bcs-btn pri" onClick={submitTyped}>{s.use}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
