import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/* ===== API base (same pattern) ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

/* ===== small helpers ===== */
function norm(s) {
  return String(s ?? "").trim();
}
function makeParticipantKey({ employeeId, name }) {
  const eid = norm(employeeId);
  const nm = norm(name).toLowerCase();
  if (eid) return `emp:${eid}`; // align with backend key style
  if (nm) return `name:${nm}`;
  return "";
}

/* ===== fetch helpers ===== */
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

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function fetchJsonNoThrow(url, options) {
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
  return { ok: res.ok, status: res.status, data };
}

/* ✅ token is TEXT */
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

  // ✅ trainee identity fields
  const [pName, setPName] = useState("");
  const [pDesignation, setPDesignation] = useState("");
  const [pEmployeeId, setPEmployeeId] = useState("");

  // localStorage key
  const LS_KEY = useMemo(() => `training_participant_${token}`, [token]);

  // ✅ load participant info from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      setPName(norm(obj?.name));
      setPDesignation(norm(obj?.designation));
      setPEmployeeId(norm(obj?.employeeId));
    } catch {
      // ignore
    }
  }, [LS_KEY]);

  // ✅ persist participant info
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          name: norm(pName),
          designation: norm(pDesignation),
          employeeId: norm(pEmployeeId),
        })
      );
    } catch {
      // ignore
    }
  }, [LS_KEY, pName, pDesignation, pEmployeeId]);

  const participantKey = useMemo(
    () => makeParticipantKey({ employeeId: pEmployeeId, name: pName }),
    [pEmployeeId, pName]
  );

  // ✅ tolerate server shapes
  const quiz = useMemo(() => {
    const q = info?.quiz || info?.data?.quiz || info?.payload?.quiz || info?.report?.quiz;
    return q || {};
  }, [info]);

  const questions = useMemo(() => {
    const qs = quiz?.questions || info?.questions || [];
    return Array.isArray(qs) ? qs : [];
  }, [quiz, info]);

  const passMark = useMemo(() => {
    const pm = Number(quiz?.passMark ?? 80);
    return Number.isFinite(pm) ? pm : 80;
  }, [quiz]);

  // ========= load session info =========
  const loadedTokenRef = useRef("");

  const loadInfo = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await fetchJson(getInfoEndpoint(token));
      setInfo(data);
      // ✅ backend GET no longer returns "alreadySubmitted" per person
      setDone(false);
    } catch (e) {
      setInfo(null);
      setDone(false);
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (loadedTokenRef.current === token) return;

    loadedTokenRef.current = token;
    setAnswers({});
    setDone(false);
    setMsg("");
    loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submit = async () => {
    if (!questions.length) return;

    const name = norm(pName);
    const designation = norm(pDesignation);
    const employeeId = norm(pEmployeeId);

    if (!name) {
      alert("Please enter your name.");
      return;
    }
    if (!employeeId) {
      alert("Please enter your Employee ID.");
      return;
    }

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

      // ✅ use no-throw fetch to handle 409 cleanly
      const out = await fetchJsonNoThrow(getSubmitEndpoint(token), {
        method: "POST",
        body: JSON.stringify({
          participant: { name, designation, employeeId },
          answers: arr,
        }),
      });

      // ✅ ALREADY_SUBMITTED
      if (!out.ok && out.status === 409 && out?.data?.error === "ALREADY_SUBMITTED") {
        const score = out?.data?.score ?? "";
        const result = out?.data?.result ?? "";
        const submittedAt = out?.data?.submittedAt ?? "";

        setDone(true);
        setMsg(
          `✅ Already submitted for this trainee.\nScore: ${score}% — ${result}${
            submittedAt ? `\nSubmitted at: ${submittedAt}` : ""
          }`
        );
        return;
      }

      if (!out.ok) {
        // generic error
        setMsg(String(out?.data?.error || out?.data?.message || `HTTP ${out.status}`));
        return;
      }

      const score = out?.data?.score ?? "";
      const result = out?.data?.result ?? "";

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

  const inputStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontWeight: 900,
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
  };

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
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{msg}</div>
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
              Pass Mark: {passMark}%
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

        {/* ✅ trainee info fields */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "linear-gradient(180deg,#ffffff,#f8fafc)",
          }}
        >
          <div style={{ fontWeight: 1100, color: "#0f172a", marginBottom: 10 }}>
            👤 Trainee Details
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12, marginBottom: 6 }}>
                Name
              </div>
              <input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12, marginBottom: 6 }}>
                Employee ID
              </div>
              <input
                value={pEmployeeId}
                onChange={(e) => setPEmployeeId(e.target.value)}
                placeholder="Employee ID"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12, marginBottom: 6 }}>
                Designation
              </div>
              <input
                value={pDesignation}
                onChange={(e) => setPDesignation(e.target.value)}
                placeholder="Designation"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: 10, color: "#64748b", fontWeight: 900, fontSize: 12 }}>
            Submission key (for tracking):{" "}
            <span style={{ userSelect: "all" }}>{participantKey || "-"}</span>
          </div>
        </div>

        {done ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              fontWeight: 1000,
              whiteSpace: "pre-wrap",
            }}
          >
            {msg || "✅ Done"}
          </div>
        ) : (
          <>
            <div style={{ marginTop: 10, color: "#64748b", fontWeight: 900 }}>
              Questions: {questions.length}
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
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {questions.map((q, i) => {
                const qText = lang === "AR" ? q.q_ar : q.q_en;
                const opts = lang === "AR" ? q.options_ar || [] : q.options_en || [];
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
