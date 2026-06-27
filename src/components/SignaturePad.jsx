// src/components/SignaturePad.jsx
// مكوّن توقيع رقمي قابل لإعادة الاستخدام.
// - يدعم الفأرة + اللمس + القلم (Pointer Events) — يعمل على التابلت/الموبايل/الديسكتوب.
// - يُخرج التوقيع كصورة Base64 (PNG) عبر onChange.
// - يدعم القفل (locked): يمنع التعديل بعد التوقيع.
//
// الاستخدام:
//   const [sig, setSig] = useState("");
//   <SignaturePad
//     label="Inspector Signature"
//     value={sig}
//     onChange={setSig}
//     width={400}
//     height={150}
//   />

import React, { useEffect, useRef, useState } from "react";

export default function SignaturePad({
  label,
  value = "",
  onChange,
  width = 400,
  height = 150,
  penColor = "#0b1f4d",
  background = "#fff",
  disabled = false,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const strokeRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasContent, setHasContent] = useState(!!value);
  const [drawingWidth, setDrawingWidth] = useState(width);

  useEffect(() => {
    function measure() {
      const parent = containerRef.current?.parentElement;
      const available = parent?.clientWidth || width + 8;
      setDrawingWidth(Math.max(120, Math.min(width, available - 8)));
    }
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    if (containerRef.current?.parentElement) ro.observe(containerRef.current.parentElement);
    return () => ro.disconnect();
  }, [width]);

  /* ====== تهيئة الـ canvas مع دعم DPR للحصول على دقة عالية ====== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = drawingWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${drawingWidth}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, drawingWidth, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.2;

    // إذا كان هناك value سابق، ارسمه
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, drawingWidth, height);
      img.src = value;
      setHasContent(true);
    } else {
      setHasContent(false);
    }
  }, [drawingWidth, height, value, background, penColor]);

  // إعادة الرسم عند تغيير value من الخارج (مثلاً تحميل سجل قديم)
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e) {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    strokeRef.current = false;
    lastPointRef.current = getPos(e);
  }

  function moveDraw(e) {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    const last = lastPointRef.current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
    strokeRef.current = true;
    if (!hasContent) setHasContent(true);
  }

  function endDraw(e) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try { canvasRef.current.releasePointerCapture?.(e.pointerId); } catch {}
    // إخراج Base64 وتمريره للأب
    if (typeof onChange === "function" && (strokeRef.current || hasContent)) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      onChange(dataUrl);
    }
  }

  function clearPad() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, drawingWidth, height);
    strokeRef.current = false;
    setHasContent(false);
    if (typeof onChange === "function") onChange("");
  }

  return (
    <div ref={containerRef} style={{ display: "block", width: "100%", maxWidth: width + 8 }}>
      {label && (
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.92rem",
            color: "#374151",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          border: "2px dashed #cbd5e1",
          borderRadius: 10,
          background: "#f8fafc",
          padding: 4,
          width: "100%",
          maxWidth: drawingWidth + 8,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onPointerLeave={endDraw}
          style={{
            display: "block",
            background,
            borderRadius: 8,
            cursor: disabled ? "not-allowed" : "crosshair",
            touchAction: "none",
            userSelect: "none",
          }}
        />
        {!hasContent && !disabled && (
          <div
            style={{
              position: "absolute",
              inset: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              color: "#94a3b8",
              fontSize: "0.95rem",
              fontStyle: "italic",
            }}
          >
            Sign here
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button
          type="button"
          onClick={clearPad}
          disabled={disabled || !hasContent}
          style={{
            padding: "6px 12px",
            border: "1px solid #ef4444",
            color: hasContent && !disabled ? "#ef4444" : "#fca5a5",
            background: "#fff",
            borderRadius: 8,
            fontWeight: 700,
            cursor: hasContent && !disabled ? "pointer" : "not-allowed",
            fontSize: "0.85rem",
          }}
        >
          Clear
        </button>
        {hasContent && (
          <span
            style={{
              fontSize: "0.85rem",
              color: "#059669",
              alignSelf: "center",
              fontWeight: 700,
            }}
          >
            Signed
          </span>
        )}
      </div>
    </div>
  );
}
