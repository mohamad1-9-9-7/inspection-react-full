import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/* ===== API base (same pattern) ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });
  const txt = await res.text().catch(() => "");
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    data = txt;
  }
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

/* ✅ NEW endpoints (token is TEXT, not uuid) */
function getInfoEndpoint(token) {
  return `${API_BASE}/api/training-session/by-token/${encodeURIComponent(token)}`;
}
function getSubmitEndpoint(token) {
  return `${API_BASE}/api/training-session/by-token/${encodeURIComponent(token)}/submit`;
}

export default function TrainingQuizLink() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [lang, setLang] = useState("EN");
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ make it tolerant to different server shapes
  const quiz = useMemo(() => {
    const q = info?.quiz || info?.data?.quiz || info?.payload?.quiz || info?.report?.quiz;
    return q || {};
  }, [info]);

  const participantName = useMemo(() => {
    return (
      info?.participant?.name ||
      info?.data?.participant?.name ||
      info?.link?.participant?.name ||
      "-"
    );
  }, [info]);

  const alreadySubmitted = useMemo(() => {
    return Boolean(
      info?.alreadySubmitted ||
        info?.data?.alreadySubmitted ||
        info?.already_submitted ||
        info?.data?.already_submitted
    );
  }, [info]);

  const lastSubmittedAt = useMemo(() => {
    return (
      info?.lastSubmittedAt ||
      info?.data?.lastSubmittedAt ||
      info?.last_submitted_at ||
      info?.data?.last_submitted_at ||
      ""
    );
  }, [info]);

  const questions = useMemo(() => {
    const qs = quiz?.questions || info?.questions || [];
    return Array.isArray(qs) ? qs : [];
  }, [quiz, info]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      setInfo(null);
      setDone(false);
      setAnswers({});
      try {
        const data = await fetchJson(getInfoEndpoint(token));
        setInfo(data);
        setDone(Boolean(data?.alreadySubmitted || data?.data?.alreadySubmitted));
      } catch (e) {
        setMsg(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async () => {
    if (!questions.length) return;

    // validate all answered
    for (let i = 0; i < questions.length; i++) {
      if (typeof answers[i] !== "number") {
        alert(`Please answer question #${i + 1}`);
        return;
      }
    }

    setSaving(true);
    setMsg("");
    try {
      const arr = questions.map((_, i) => answers[i]);

      const out = await fetchJson(getSubmitEndpoint(token), {
        method: "POST",
        body: JSON.stringify({ answers: arr }),
      });

      const score = out?.score ?? out?.data?.score;
      const result = out?.result ?? out?.data?.result;

      setDone(true);
      setMsg(`✅ Submitted. Score: ${score}% — ${result}`);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const page = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0ea5e9 0%, #7c3aed 55%, #111827 100%)",
    padding: 16,
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  };

  const card = {
    maxWidth: 900,
    margin: "0 auto",
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(255,255,255,0.65)",
    borderRadius: 18,
    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
    padding: 16,
  };

  const btn = (active) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    cursor: "pointer",
    fontWeight: 900,
  });

  if (loading) {
    return (
      <div style={page}>
        <div style={card}>Loading…</div>
      </div>
    );
  }

  if (msg && !info) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ fontWeight: 1100, color: "#be123c" }}>Error</div>
          <div style={{ marginTop: 8 }}>{msg}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 1100, fontSize: 18, color: "#0f172a" }}>
              🧪 {quiz?.module || "Training Quiz"}
            </div>
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 900 }}>
              Participant: {participantName}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setLang("EN")} style={btn(lang === "EN")}>
              EN
            </button>
            <button onClick={() => setLang("AR")} style={btn(lang === "AR")}>
              عربي
            </button>
          </div>
        </div>

        {alreadySubmitted || done ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              fontWeight: 1000,
            }}
          >
            ✅ This quiz was already submitted.
            {lastSubmittedAt ? (
              <div style={{ marginTop: 6, color: "#065f46" }}>
                Submitted at: {lastSubmittedAt}
              </div>
            ) : null}
            {msg ? <div style={{ marginTop: 8 }}>{msg}</div> : null}
          </div>
        ) : (
          <>
            <div style={{ marginTop: 10, color: "#64748b", fontWeight: 900 }}>
              Questions: {questions.length} — Pass Mark: {quiz?.passMark ?? 80}%
            </div>

            {msg ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 14,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  fontWeight: 900,
                }}
              >
                {msg}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {questions.map((q, i) => {
                const qText = lang === "AR" ? q.q_ar : q.q_en;
                const opts = lang === "AR" ? (q.options_ar || []) : (q.options_en || []);
                return (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 1100,
                        color: "#0f172a",
                        marginBottom: 10,
                        direction: lang === "AR" ? "rtl" : "ltr",
                      }}
                    >
                      {i + 1}) {qText}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        direction: lang === "AR" ? "rtl" : "ltr",
                      }}
                    >
                      {opts.map((opt, oi) => {
                        const checked = answers[i] === oi;
                        return (
                          <label
                            key={oi}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: `1px solid ${checked ? "#c7d2fe" : "#e5e7eb"}`,
                              background: checked
                                ? "linear-gradient(135deg,#eef2ff,#ffffff)"
                                : "#fff",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                          >
                            <input
                              type="radio"
                              name={`q_${i}`}
                              checked={checked}
                              onChange={() => setAnswers((p) => ({ ...p, [i]: oi }))}
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={saving}
              style={{
                marginTop: 14,
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "1px solid #111827",
                background: "#111827",
                color: "#fff",
                fontWeight: 1100,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.75 : 1,
              }}
            >
              {saving ? "Saving..." : "✅ Submit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
