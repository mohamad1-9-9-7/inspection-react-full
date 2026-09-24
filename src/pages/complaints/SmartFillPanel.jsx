// src/pages/complaints/SmartFillPanel.jsx
// -----------------------------------------------------------------------------
// "🤖 Smart fill" block on the complaint form: paste an e-mail OR upload a
// photo of a paper note, analyze it, preview what was detected, then apply it
// to the form in one click. Text parsing + OCR live in complaintsSmartFill.js.
// -----------------------------------------------------------------------------

import React, { useRef, useState } from "react";
import { imageToText, parseComplaint } from "./complaintsSmartFill";

export default function SmartFillPanel({ suppliers = [], onApply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");        // "" | "ocr" | "parse"
  const [ocrPct, setOcrPct] = useState(0);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);  // { patch, found }
  const fileRef = useRef(null);

  const runOcr = async (fileList) => {
    const file = Array.from(fileList || []).find((f) => String(f.type || "").startsWith("image/"));
    if (!file) return;
    setErr(""); setResult(null); setBusy("ocr"); setOcrPct(0);
    try {
      const got = await imageToText(file, setOcrPct);
      if (!got) { setErr("Couldn't read any text from that photo — try a clearer, straight-on shot."); return; }
      const merged = text.trim() ? `${text.trim()}\n${got}` : got;
      setText(merged);
      analyze(merged);
    } catch (e) {
      setErr(e?.message || "OCR failed.");
    } finally {
      setBusy("");
    }
  };

  const analyze = (src = text) => {
    setErr("");
    const body = String(src || "").trim();
    if (!body) { setErr("Paste some text (or scan a photo) first."); return; }
    setBusy("parse");
    try {
      const r = parseComplaint(body, { suppliers });
      setResult(r);
      if (!r.found.length) setErr("Nothing recognisable was found — you can still apply the text as the description.");
    } finally {
      setBusy("");
    }
  };

  const apply = () => {
    if (!result) return;
    onApply?.(result.patch);
    setOpen(false);
    setResult(null);
    setText("");
  };

  return (
    <div className="qc-block" style={{ borderColor: "#99f6e4", background: "#f4fdfb" }}>
      <h4>
        <span>🤖 Smart fill — paste an email or scan a photo</span>
        <button
          type="button"
          className="qc-btn gray"
          style={{ padding: "5px 12px", fontSize: 12 }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Open"}
        </button>
      </h4>

      {open && (
        <>
          <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600, marginBottom: 8, lineHeight: 1.5 }}>
            Drop the complaint email here, or scan a paper note. It auto-detects the branch/supplier,
            the reasons, severity and any item codes — you review before it fills the form.
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the email text here…  e.g. “Supplier: ABC Foods — expired chicken [20026], 4.5 KG, exp 12/09/2026”"
            style={{
              width: "100%", minHeight: 130, resize: "vertical", padding: "12px 14px",
              border: "1px solid #cbd5e1", borderRadius: 10, fontFamily: "inherit",
              fontSize: "14px", lineHeight: 1.6, background: "#fff", color: "#0f172a",
            }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            <button
              type="button"
              className="qc-btn primary"
              onClick={() => analyze()}
              disabled={!!busy || !text.trim()}
            >
              {busy === "parse" ? "Analyzing…" : "🔍 Analyze"}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files; e.target.value = ""; runOcr(f); }}
            />
            <button
              type="button"
              className="qc-btn teal"
              onClick={() => fileRef.current?.click()}
              disabled={!!busy}
            >
              {busy === "ocr" ? `📷 Reading… ${ocrPct}%` : "📷 Scan a photo"}
            </button>

            {text && !busy && (
              <button type="button" className="qc-btn gray" onClick={() => { setText(""); setResult(null); setErr(""); }}>
                Clear
              </button>
            )}
          </div>

          {err && <div className="qc-alert warn" style={{ marginTop: 10 }}>⚠️ {err}</div>}

          {result && (
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 10,
              border: "1px solid #99f6e4", background: "#fff",
            }}>
              <div style={{ fontWeight: 900, fontSize: 12, color: "#0f766e", marginBottom: 8 }}>
                Detected {result.found.length ? `(${result.found.length})` : ""} — review, then apply:
              </div>
              {result.found.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.found.map((f, i) => (
                    <span key={i} style={{
                      background: "#ecfdf5", color: "#065f46", border: "1px solid #99f6e4",
                      borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800,
                    }}>{f}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 700 }}>
                  Only the description will be filled.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button type="button" className="qc-btn primary" onClick={apply}>✅ Apply to the form</button>
                <button type="button" className="qc-btn gray" onClick={() => setResult(null)}>Cancel</button>
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 8, fontWeight: 600 }}>
                Applying fills empty fields and replaces the items list; nothing is sent until you save.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
