// src/components/BarcodeScanner.jsx
//
// 📷 Camera barcode reader — a full-screen layer over the page.
//
//   <BarcodeScanner open lang="ar" onResult={(text) => …} onClose={…} />
//
// Reads the codes found on cartons: EAN-13 / EAN-8 / UPC-A / ITF-14 (the
// product number), GS1-128 and GS1 DataMatrix (number + dates + batch) and
// QR. One 1080p stream from the back camera with continuous focus (a long,
// narrow carcass-tag GS1-128 needs the pixels). Reader: the browser's own
// BarcodeDetector when it has one (Chrome on Android — faster, better on
// long barcodes); otherwise ZXing (@zxing/browser, loaded only then), as on
// iPhone, which has no built-in reader.
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
    title: "Scan the barcode", hint: "Fit the WHOLE barcode inside the frame, phone level, 15–25 cm away. Hold still a second.",
    starting: "Starting the camera…", denied: "The camera is blocked. Allow the camera for this site in the browser settings, or type the code below.",
    noCam: "No camera found on this device — type the code or use a barcode reader.",
    manual: "Or type the numbers under the barcode, e.g. (01)…(13)…, or use a barcode reader", use: "Use", close: "Close", torch: "🔦 Light",
  },
  ar: {
    title: "امسح الباركود", hint: "خلّي الباركود كلّو جوّا الإطار، التلفون مستقيم وعلى بعد 15–25 سم، وثبّت ثانية.",
    starting: "عم نشغّل الكاميرا…", denied: "الكاميرا ممنوعة. اسمح للكاميرا لهالموقع من إعدادات المتصفح، أو اكتب الكود تحت.",
    noCam: "ما في كاميرا على هالجهاز — اكتب الكود أو استعمل قارئ باركود.",
    manual: "أو اكتب الأرقام اللي تحت الباركود متل (01)…(13)…، أو استعمل قارئ الباركود", use: "استعمل", close: "إغلاق", torch: "🔦 ضو",
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
.bcs-frame { position:absolute; left:50%; top:50%; width:min(92vw, 560px); height:min(40vw, 240px); transform:translate(-50%,-50%);
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

/* The browser's built-in BarcodeDetector when it reads the carton formats,
   else null. */
const NATIVE_FORMATS = ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "data_matrix", "qr_code"];
async function nativeDetector() {
  try {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) return null;
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.includes("code_128") || !formats.includes("ean_13")) return null;
    return new window.BarcodeDetector({ formats });
  } catch {
    return null;
  }
}

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
    const found = (text) => {
      if (!text || doneRef.current) return;
      doneRef.current = true;
      try { navigator.vibrate?.(80); } catch { /* no vibration */ }
      controlsRef.current?.stop();
      onResultRef.current?.(text);
    };
    (async () => {
      let stream = null;
      try {
        /* One sharp stream: long, narrow barcodes (a carcass tag's GS1-128)
           need the pixels — ask for 1080p and continuous focus. */
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 }, height: { ideal: 1080 },
            advanced: [{ focusMode: "continuous" }],
          },
        });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        const track = stream.getVideoTracks()[0];
        const caps = typeof track?.getCapabilities === "function" ? track.getCapabilities() : {};
        const stopStream = () => stream.getTracks().forEach((t) => t.stop());
        const torchFn = caps?.torch
          ? (on) => track.applyConstraints({ advanced: [{ torch: on }] })
          : null;

        /* The phone's own reader first (Chrome on Android: fast and good with
           long Code-128 / GS1-128); ZXing where there is none (iPhone). */
        const native = await nativeDetector();
        if (native) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          let timer = 0;
          const tick = async () => {
            if (!alive || doneRef.current) return;
            try {
              if (video.readyState >= 2) {
                const codes = await native.detect(video);
                if (codes && codes.length) { found(codes[0].rawValue); return; }
              }
            } catch { /* frame not ready */ }
            timer = setTimeout(tick, 120);
          };
          tick();
          controlsRef.current = { stop: () => { clearTimeout(timer); stopStream(); }, torch: torchFn };
        } else {
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import("@zxing/browser"), import("@zxing/library"),
          ]);
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF,
            BarcodeFormat.CODE_128, BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });
          const controls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) found(result.getText());
          });
          controlsRef.current = { stop: () => { try { controls.stop(); } catch { /* stopped */ } stopStream(); }, torch: torchFn };
        }
        if (!alive) { controlsRef.current.stop(); return; }
        setState("live");
        if (torchFn) setTorch(false);
      } catch (e) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
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
    try { await controlsRef.current?.torch?.(!torch); setTorch(!torch); } catch { setTorch(null); }
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
          <input id="bcs-typed" value={typed} inputMode="text"
            autoFocus={typeof window !== "undefined" && !!window.matchMedia?.("(pointer: fine)").matches} autoComplete="off" autoCorrect="off" spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTyped(); } }} />
          <button type="button" className="bcs-btn pri" onClick={submitTyped}>{s.use}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
