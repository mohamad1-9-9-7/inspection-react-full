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
// Against wrong reads:
//   • a line barcode (EAN / UPC / ITF / Code-128) counts only once the SAME
//     text was read on two frames — a half-seen ITF or a smudged EAN that
//     happens to pass gives a different text next frame. DataMatrix / QR
//     carry their own error correction and count at once.
//   • EAN / UPC must have a right check digit; an ITF must be a whole ITF-14.
//   • the native reader looks inside the green frame first (a carton has
//     several barcodes — the one aimed at wins), the whole picture every few
//     frames for a barcode bigger than the frame; among several codes a GS1
//     one (with the product number) wins, then the one nearest the centre.
// Helps: zoom (when the camera has it), the light, another camera (some
// phones open the wide lens, which can't focus close — the choice is kept on
// the phone), a beep + vibration on a read, and tips after a while without one.
//
// A handheld / Bluetooth reader types the code like a keyboard and presses
// Enter — the box at the bottom takes it, and also a code typed by hand.
//
// Rendered into <body> (outside #root) so the app's forced font sizes and
// overflow rules don't reach it.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isValidGtin, parseGs1 } from "../utils/gs1Barcode";

const TX = {
  en: {
    title: "Scan the barcode", hint: "Fit the WHOLE barcode inside the frame, phone level, 15–25 cm away. Hold still a second.",
    starting: "Starting the camera…", denied: "The camera is blocked. Allow the camera for this site in the browser settings, or type the code below.",
    noCam: "No camera found on this device — type the code or use a barcode reader.",
    manual: "Or type the numbers under the barcode, e.g. (01)…(13)…, or use a barcode reader", use: "Use", close: "Close", torch: "🔦 Light",
    camera: "🔄 Camera", slow: "Not reading? Try the 🔦 light, zoom, move a little further away, tilt the phone against glare, or 🔄 another camera.",
    checking: "Reading… hold still",
  },
  ar: {
    title: "امسح الباركود", hint: "خلّي الباركود كلّو جوّا الإطار، التلفون مستقيم وعلى بعد 15–25 سم، وثبّت ثانية.",
    starting: "عم نشغّل الكاميرا…", denied: "الكاميرا ممنوعة. اسمح للكاميرا لهالموقع من إعدادات المتصفح، أو اكتب الكود تحت.",
    noCam: "ما في كاميرا على هالجهاز — اكتب الكود أو استعمل قارئ باركود.",
    manual: "أو اكتب الأرقام اللي تحت الباركود متل (01)…(13)…، أو استعمل قارئ الباركود", use: "استعمل", close: "إغلاق", torch: "🔦 ضو",
    camera: "🔄 كاميرا", slow: "ما عم يقرأ؟ جرّب 🔦 الضو، أو الزوم، أو بعّد التلفون شوي، أو ميّلو عن اللمعة، أو 🔄 كاميرا تانية.",
    checking: "عم يقرأ… ثبّت",
  },
};

const CSS = `
.bcs { position:fixed; inset:0; z-index:10000; background:#0b1220; color:#fff; display:flex; flex-direction:column;
  font-family: Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
.bcs * { box-sizing:border-box; }
.bcs-top { display:flex; align-items:center; gap:8px; padding:12px 14px; flex-wrap:wrap; }
.bcs-top h2 { margin:0; font-size:18px; font-weight:800; flex:1; min-width:140px; }
.bcs-btn { border:1px solid rgba(255,255,255,.35); background:rgba(255,255,255,.08); color:#fff; border-radius:12px;
  padding:9px 14px; font-size:15px; font-weight:700; cursor:pointer; }
.bcs-btn.on { background:#facc15; border-color:#facc15; color:#111827; }
.bcs-btn.pri { background:#2563eb; border-color:#2563eb; }
.bcs-view { position:relative; flex:1; min-height:0; overflow:hidden; background:#000; }
.bcs-view video { width:100%; height:100%; object-fit:cover; }
.bcs-frame { position:absolute; left:50%; top:50%; width:min(92vw, 560px); height:min(40vw, 240px); transform:translate(-50%,-50%);
  border:3px solid #22c55e; border-radius:16px; box-shadow:0 0 0 9999px rgba(0,0,0,.38); pointer-events:none; transition:border-color .15s; }
.bcs-frame.seen { border-color:#facc15; }
.bcs-line { position:absolute; left:6%; right:6%; top:50%; height:2px; background:#ef4444; box-shadow:0 0 8px #ef4444;
  animation: bcsScan 1.8s ease-in-out infinite alternate; }
@keyframes bcsScan { from { top:12% } to { top:88% } }
.bcs-zoom { position:absolute; right:12px; top:12px; display:flex; flex-direction:column; gap:6px; }
.bcs-zoom button { width:52px; height:44px; border-radius:12px; border:1px solid rgba(255,255,255,.4); background:rgba(0,0,0,.5);
  color:#fff; font-weight:800; font-size:15px; cursor:pointer; }
.bcs-zoom button.on { background:#22c55e; border-color:#22c55e; color:#04130a; }
.bcs-msg { position:absolute; left:12px; right:12px; bottom:14px; text-align:center; font-size:14px; font-weight:700;
  background:rgba(0,0,0,.55); border-radius:12px; padding:9px 12px; }
.bcs-bottom { padding:12px 14px calc(14px + env(safe-area-inset-bottom)); display:grid; gap:8px; }
.bcs-bottom label { font-size:13px; opacity:.85; }
.bcs-row { display:flex; gap:8px; }
.bcs-row input { flex:1; min-width:0; border-radius:12px; border:1px solid rgba(255,255,255,.35); background:#111a2e; color:#fff;
  padding:11px 12px; font-size:16px; direction:ltr; }
`;

const CAM_KEY = "barcode_scanner_camera"; // the camera picked on this phone (a convenience only)
const SLOW_MS = 8000;
const CONFIRM_MS = 1500; // a line barcode's second matching read must come within this

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

/* ZXing format names → the native ones, so one set of rules serves both. */
const ZX_FORMAT = { EAN_13: "ean_13", EAN_8: "ean_8", UPC_A: "upc_a", UPC_E: "upc_e", ITF: "itf", CODE_128: "code_128", DATA_MATRIX: "data_matrix", QR_CODE: "qr_code" };

/* Is this read believable? EAN / UPC need a right check digit (UPC-E is
   checked on two frames only), an ITF must be a whole ITF-14. */
function plausible(text, format) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (format === "ean_13" || format === "ean_8" || format === "upc_a") return /^\d+$/.test(t) && isValidGtin(t);
  if (format === "upc_e") return /^\d{6,8}$/.test(t);
  if (format === "itf") return /^\d{14}$/.test(t) && isValidGtin(t);
  return true;
}
const needsTwoReads = (format) => format !== "data_matrix" && format !== "qr_code";
const isGs1 = (text) => { const ai = parseGs1(text); return !!(ai && (ai["01"] || ai["02"])); };

/* Among several codes in one frame: a GS1 code with the product number,
   then a product barcode, then the one nearest the centre (cx, cy). */
function bestCode(codes, cx, cy) {
  const ok = codes.filter((c) => plausible(c.rawValue, c.format));
  if (!ok.length) return null;
  const rank = (c) => (isGs1(c.rawValue) ? 0 : ["ean_13", "ean_8", "upc_a", "upc_e", "itf"].includes(c.format) ? 1 : 2);
  const dist = (c) => {
    const b = c.boundingBox;
    return b ? (b.x + b.width / 2 - cx) ** 2 + (b.y + b.height / 2 - cy) ** 2 : 0;
  };
  return ok.sort((a, b) => rank(a) - rank(b) || dist(a) - dist(b))[0];
}

/* A short beep — heard in a noisy cold room where a vibration isn't felt. */
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1800;
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    osc.onended = () => ctx.close().catch(() => {});
  } catch { /* no sound */ }
}

const readCam = () => { try { return localStorage.getItem(CAM_KEY) || ""; } catch { return ""; } };
const saveCam = (id) => { try { localStorage.setItem(CAM_KEY, id); } catch { /* cache only */ } };

/* The part of the video picture under the green frame (object-fit: cover
   crops the picture, so the frame's screen box is mapped back to pixels),
   with a margin. null = can't tell yet. */
function frameRect(video, frame) {
  const W = video.videoWidth; const H = video.videoHeight;
  if (!W || !H || !frame) return null;
  const v = video.getBoundingClientRect();
  const f = frame.getBoundingClientRect();
  const scale = Math.max(v.width / W, v.height / H);
  const ox = (v.width - W * scale) / 2; const oy = (v.height - H * scale) / 2;
  const mx = f.width * 0.15; const my = f.height * 0.35;
  const x = Math.max(0, (f.left - v.left - mx - ox) / scale);
  const y = Math.max(0, (f.top - v.top - my - oy) / scale);
  const w = Math.min(W - x, (f.width + 2 * mx) / scale);
  const h = Math.min(H - y, (f.height + 2 * my) / scale);
  return w > 40 && h > 20 ? { x, y, w, h } : null;
}

export default function BarcodeScanner({ open, lang = "en", onResult, onClose }) {
  const s = TX[lang === "ar" ? "ar" : "en"];
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const controlsRef = useRef(null);
  const doneRef = useRef(false);
  const [state, setState] = useState("starting"); // starting | live | denied | nocam
  const [torch, setTorch] = useState(null); // null = not supported
  const [zoom, setZoom] = useState(null); // { min, max, value } | null
  const [cams, setCams] = useState([]); // back-camera choices
  const [camId, setCamId] = useState(() => readCam());
  const [seen, setSeen] = useState(false); // a first read waits for its confirmation
  const [slow, setSlow] = useState(false);
  const [typed, setTyped] = useState("");
  // the latest callback, without restarting the camera when the parent re-renders
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!open) return undefined;
    doneRef.current = false;
    setState("starting");
    setSeen(false); setSlow(false);
    let alive = true;
    let slowTimer = 0;
    let seenTimer = 0;
    // two-frame confirmation for line barcodes
    let last = { text: "", at: 0 };
    const found = (text) => {
      if (!text || doneRef.current) return;
      doneRef.current = true;
      beep();
      try { navigator.vibrate?.(80); } catch { /* no vibration */ }
      controlsRef.current?.stop();
      onResultRef.current?.(text);
    };
    const offer = (text, format) => {
      if (!plausible(text, format)) return;
      if (!needsTwoReads(format)) { found(text); return; }
      const now = Date.now();
      if (last.text === text && now - last.at <= CONFIRM_MS) { found(text); return; }
      last = { text, at: now };
      setSeen(true);
      clearTimeout(seenTimer);
      seenTimer = setTimeout(() => { if (alive) setSeen(false); }, CONFIRM_MS + 200);
    };
    (async () => {
      let stream = null;
      try {
        /* One sharp stream: long, narrow barcodes (a carcass tag's GS1-128)
           need the pixels — ask for 1080p and continuous focus. */
        const video0 = {
          width: { ideal: 1920 }, height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" }],
        };
        const want = camId ? { ...video0, deviceId: { exact: camId } } : { ...video0, facingMode: { ideal: "environment" } };
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: want });
        } catch (e) {
          // the saved camera is gone (another phone / browser): back to the default one
          if (!camId || e?.name === "NotAllowedError") throw e;
          saveCam("");
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...video0, facingMode: { ideal: "environment" } } });
        }
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        const track = stream.getVideoTracks()[0];
        const caps = typeof track?.getCapabilities === "function" ? track.getCapabilities() : {};
        const stopStream = () => stream.getTracks().forEach((t) => t.stop());
        const torchFn = caps?.torch
          ? (on) => track.applyConstraints({ advanced: [{ torch: on }] })
          : null;
        const zoomFn = caps?.zoom && caps.zoom.max > caps.zoom.min
          ? (z) => track.applyConstraints({ advanced: [{ zoom: z }] })
          : null;

        // the cameras to switch between (labels are known once the camera is allowed)
        navigator.mediaDevices.enumerateDevices?.()
          .then((list) => {
            if (!alive) return;
            const vids = list.filter((d) => d.kind === "videoinput");
            const back = vids.filter((d) => !/front|user|face|selfie|أمام/i.test(d.label));
            setCams((back.length > 1 ? back : vids).map((d) => d.deviceId).filter(Boolean));
          })
          .catch(() => {});

        /* The phone's own reader first (Chrome on Android: fast and good with
           long Code-128 / GS1-128); ZXing where there is none (iPhone). */
        const native = await nativeDetector();
        if (native) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          let timer = 0;
          let n = 0;
          const tick = async () => {
            if (!alive || doneRef.current) return;
            try {
              if (video.readyState >= 2) {
                n += 1;
                // inside the frame on most frames, the whole picture every 4th
                const r = n % 4 ? frameRect(video, frameRef.current) : null;
                let codes; let cx; let cy;
                if (r && ctx) {
                  canvas.width = Math.round(r.w); canvas.height = Math.round(r.h);
                  ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
                  codes = await native.detect(canvas);
                  cx = canvas.width / 2; cy = canvas.height / 2;
                } else {
                  codes = await native.detect(video);
                  cx = video.videoWidth / 2; cy = video.videoHeight / 2;
                }
                const best = codes && codes.length ? bestCode(codes, cx, cy) : null;
                if (best) offer(best.rawValue, best.format);
              }
            } catch { /* frame not ready */ }
            if (!doneRef.current) timer = setTimeout(tick, 90);
          };
          tick();
          controlsRef.current = { stop: () => { clearTimeout(timer); stopStream(); }, torch: torchFn, zoom: zoomFn };
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
          // an ITF-14 only (a shorter ITF is a half-read carton code)
          hints.set(DecodeHintType.ALLOWED_LENGTHS, Int32Array.from([14]));
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
          const controls = await reader.decodeFromStream(stream, video, (result) => {
            if (!result) return;
            offer(result.getText(), ZX_FORMAT[BarcodeFormat[result.getBarcodeFormat()]] || "");
          });
          controlsRef.current = { stop: () => { try { controls.stop(); } catch { /* stopped */ } stopStream(); }, torch: torchFn, zoom: zoomFn };
        }
        if (!alive) { controlsRef.current.stop(); return; }
        setState("live");
        if (torchFn) setTorch(false);
        if (zoomFn) setZoom({ min: caps.zoom.min, max: caps.zoom.max, value: caps.zoom.min });
        slowTimer = setTimeout(() => { if (alive && !doneRef.current) setSlow(true); }, SLOW_MS);
      } catch (e) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (!alive) return;
        const name = e?.name || "";
        setState(name === "NotFoundError" || name === "OverconstrainedError" ? "nocam" : "denied");
      }
    })();
    return () => {
      alive = false;
      clearTimeout(slowTimer); clearTimeout(seenTimer);
      try { controlsRef.current?.stop(); } catch { /* already stopped */ }
      controlsRef.current = null;
      setTorch(null); setZoom(null);
    };
  }, [open, camId]);

  // a fresh layer starts with an empty box (not on a camera switch)
  useEffect(() => { if (open) setTyped(""); }, [open]);

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
  const setZoomTo = async (z) => {
    if (!zoom) return;
    const v = Math.min(zoom.max, Math.max(zoom.min, z));
    try { await controlsRef.current?.zoom?.(v); setZoom({ ...zoom, value: v }); } catch { setZoom(null); }
  };
  // 1× / 2× / 3× within what the camera allows
  const zoomSteps = zoom ? [zoom.min, 2, 3].filter((z, i, a) => z >= zoom.min && z <= zoom.max && a.indexOf(z) === i) : [];
  const nextCam = () => {
    if (cams.length < 2) return;
    const at = cams.indexOf(camId);
    const id = cams[(at + 1) % cams.length];
    saveCam(id);
    setCamId(id);
  };

  return createPortal(
    <div className="bcs" dir={lang === "ar" ? "rtl" : "ltr"} role="dialog" aria-label={s.title}>
      <style>{CSS}</style>
      <div className="bcs-top">
        <h2>📷 {s.title}</h2>
        {cams.length > 1 ? <button type="button" className="bcs-btn" onClick={nextCam}>{s.camera}</button> : null}
        {torch !== null ? <button type="button" className={`bcs-btn ${torch ? "on" : ""}`} onClick={flipTorch}>{s.torch}</button> : null}
        <button type="button" className="bcs-btn" onClick={onClose}>{s.close}</button>
      </div>
      <div className="bcs-view">
        <video ref={videoRef} muted playsInline />
        {state === "live" ? <div ref={frameRef} className={`bcs-frame ${seen ? "seen" : ""}`}><div className="bcs-line" /></div> : null}
        {state === "live" && zoomSteps.length > 1 ? (
          <div className="bcs-zoom" dir="ltr">
            {zoomSteps.map((z) => (
              <button key={z} type="button" className={Math.abs(zoom.value - z) < 0.05 ? "on" : ""} onClick={() => setZoomTo(z)}>
                {z === zoom.min ? "1×" : `${z}×`}
              </button>
            ))}
          </div>
        ) : null}
        <div className="bcs-msg">
          {state === "starting" ? s.starting : state === "denied" ? s.denied : state === "nocam" ? s.noCam
            : seen ? s.checking : slow ? s.slow : s.hint}
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
