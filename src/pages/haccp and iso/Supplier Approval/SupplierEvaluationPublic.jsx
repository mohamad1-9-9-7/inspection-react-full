import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/* ===================== API base (NORMALIZED) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
  // لو حاطط /api أو /api/reports بالغلط… شيلهم
  s = s.replace(/\/api\/reports.*$/i, "");
  s = s.replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}

const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "supplier_self_assessment_form";

/* ===================== ✅ public token endpoints (MATCH SERVER) ===================== */
/**
 * ✅ Server endpoints:
 * GET  /api/reports/public/:token
 * POST /api/reports/public/:token/submit
 */
function getInfoEndpoint(token) {
  return `${API_BASE}/api/reports/public/${encodeURIComponent(token)}`;
}
function getSubmitEndpoint(token) {
  return `${API_BASE}/api/reports/public/${encodeURIComponent(token)}/submit`;
}

/* ===================== helpers ===================== */
async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });

  const txt = await res.text().catch(() => "");
  let data;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ===== Upload via your server images endpoint (same as other pages) ===== */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

export default function SupplierEvaluationPublic() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  // supplier inputs
  const [fields, setFields] = useState({
    "Company Name": "",
    Address: "",
    Email: "",
    "Technical/Quality Manager": "",
    Telephone: "",
    Products: "",
  });

  const [answers, setAnswers] = useState({});
  const [attachments, setAttachments] = useState([]); // [{name,url}]

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const u = new URL(window.location.href);
      return `${u.origin}${u.pathname}`;
    } catch {
      return window.location.href;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await fetchJson(getInfoEndpoint(token), { method: "GET" });

      // ✅ server returns { ok:true, report:{...} }
      const report = data?.report || data?.item || data?.data || data;
      setInfo(report);

      const p =
        report?.payload ||
        report?.payload_json ||
        report?.data?.payload ||
        report?.item?.payload ||
        {};

      const preFields = p?.fields || {};
      const preEmail = p?.email || p?.supplierEmail || "";

      setFields((prev) => ({
        ...prev,
        ...(preFields || {}),
        Email: preFields?.Email || preFields?.email || preEmail || prev.Email,
      }));

      setAnswers(p?.answers || {});
      setAttachments(Array.isArray(p?.attachments) ? p.attachments : []);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Failed to load"} (token: ${token})`);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const questions = useMemo(() => {
    const p =
      info?.payload ||
      info?.item?.payload ||
      info?.data?.payload ||
      info?.payload_json ||
      {};
    const q = p?.questions || [];
    return Array.isArray(q) ? q : [];
  }, [info]);

  const pickFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setMsg("");
    setSaving(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      setMsg("✅ Files uploaded");
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setMsg("");
    setSaving(true);
    try {
      // ✅ Server expects { fields, answers, attachments }
      await fetchJson(getSubmitEndpoint(token), {
        method: "POST",
        body: JSON.stringify({
          fields,
          answers,
          attachments,
        }),
      });

      setDone(true);
      setMsg("✅ Submitted successfully");
    } catch (e) {
      setMsg(`❌ ${e?.message || "Submit failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const page = {
    minHeight: "100vh",
    padding: 18,
    direction: "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Arial",
    background: "linear-gradient(180deg,#eaf6ff,#ffffff)",
  };

  const card = {
    maxWidth: 980,
    margin: "0 auto",
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(2,6,23,0.12)",
    borderRadius: 18,
    padding: 14,
  };

  const input = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(2,6,23,0.12)",
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  };

  const btn = {
    border: "1px solid rgba(2,6,23,0.12)",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={card}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontWeight: 1100, fontSize: 18, color: "#0f172a" }}>
          Supplier Evaluation Form
        </div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          Token: <b>{token}</b> • Link:{" "}
          <span style={{ wordBreak: "break-word" }}>{shareUrl}</span>
        </div>

        {msg ? (
          <div
            style={{
              marginTop: 10,
              fontWeight: 900,
              color: msg.startsWith("✅") ? "#065f46" : "#991b1b",
            }}
          >
            {msg}
          </div>
        ) : null}

        {done ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(16,185,129,0.35)",
              background: "rgba(16,185,129,0.08)",
              fontWeight: 1000,
            }}
          >
            Thank you. Your submission has been received.
          </div>
        ) : null}

        {/* Company fields */}
        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid rgba(2,6,23,0.12)",
            paddingTop: 12,
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0f172a", marginBottom: 8 }}>
            Company Details
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {Object.keys(fields).map((k) => (
              <div key={k}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
                  {k}
                </div>
                <input
                  style={input}
                  value={fields[k]}
                  onChange={(e) => setFields((prev) => ({ ...prev, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid rgba(2,6,23,0.12)",
            paddingTop: 12,
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0f172a", marginBottom: 8 }}>
            Questions
          </div>

          {questions.length === 0 ? (
            <div style={{ color: "#475569", fontWeight: 800 }}>
              No questions found in this evaluation (admin must save questions in payload.questions).
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {questions.map((q, idx) => {
                const key = q?.key || `q${idx + 1}`;
                const type = q?.type || "text";
                const label = q?.label || key;

                const v = answers[key] ?? "";

                return (
                  <div
                    key={key}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(2,6,23,0.12)",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{label}</div>

                    <div style={{ marginTop: 10 }}>
                      {type === "yesno" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            style={{ ...btn, background: v === true ? "rgba(16,185,129,0.10)" : "#fff" }}
                            onClick={() => setAnswers((prev) => ({ ...prev, [key]: true }))}
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            style={{ ...btn, background: v === false ? "rgba(239,68,68,0.08)" : "#fff" }}
                            onClick={() => setAnswers((prev) => ({ ...prev, [key]: false }))}
                          >
                            NO
                          </button>
                        </div>
                      ) : (
                        <input
                          style={input}
                          value={String(v)}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Type your answer..."
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attachments */}
        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid rgba(2,6,23,0.12)",
            paddingTop: 12,
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0f172a", marginBottom: 8 }}>
            Attachments
          </div>

          <input type="file" multiple onChange={(e) => pickFiles(e.target.files)} disabled={saving} />

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {attachments.map((f, i) => (
              <div
                key={`${f.url}-${i}`}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(2,6,23,0.12)",
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 900,
                    color: "#0f172a",
                    textDecoration: "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  📎 {f.name || `File ${i + 1}`}
                </a>
                <button
                  type="button"
                  style={{ ...btn, borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" }}
                  onClick={() => removeAttachment(i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...btn, background: saving ? "#f1f5f9" : "#fff" }} onClick={submit} disabled={saving}>
            {saving ? "Submitting..." : "✅ Submit"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px){
          div[style*="gridTemplateColumns: 1fr 1fr"]{
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
