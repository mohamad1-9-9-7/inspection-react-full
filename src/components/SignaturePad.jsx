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
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasContent, setHasContent] = useState(!!value);

  /* ====== تهيئة الـ canvas مع دعم DPR للحصول على دقة عالية ====== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.2;

    // إذا كان هناك value سابق، ارسمه
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = value;
      setHasContent(true);
    } else {
      setHasContent(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // إعادة الرسم عند تغيير value من الخارج (مثلاً تحميل سجل قديم)
  useEffect(() => {
    if (!value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, width, height);
    img.src = value;
    setHasContent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
    if (!hasContent) setHasContent(true);
  }

  function endDraw(e) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try { canvasRef.current.releasePointerCapture?.(e.pointerId); } catch {}
    // إخراج Base64 وتمريره للأب
    if (typeof onChange === "function") {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      onChange(dataUrl);
    }
  }

  function clearPad() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    setHasContent(false);
    if (typeof onChange === "function") onChange("");
  }

  return (
    <div style={{ display: "inline-block" }}>
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
          width: width + 8,
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
            ✍️ وقّع هنا / Sign here
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
          🗑️ Clear
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
            ✅ Signed
          </span>
        )}
      </div>
    </div>
  );
}
