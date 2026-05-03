// src/pages/training/TrainingSessionsList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  REPORTS_URL,
  TYPE,
  PASS_MARK,
  QUIZ_BANK,
  fetchJson,
  updateReportOnServer,
  deleteReportOnServer,
  normalizeToArray,
  getId,
  safeDate,
  safeBranch,
  safeModule,
  safeTitle,
  sortByNewest,
  makeBlankParticipant,
  renumberParticipants,
  todayISO,
  Badge,
  KPI,
  Modal,
  PUBLIC_ORIGIN, // ✅ NEW
} from "./TrainingSessionsList.helpers";

/* ===================== Small utils (no helpers edits needed) ===================== */
function makeToken(len = 22) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues)
    crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/* ===================== ✅ NEW: ensure quiz exists in report payload ===================== */
function hasQuiz(payload) {
  const q = payload?.quiz || payload?.quizData || payload?.trainingQuiz || null;
  const qs = Array.isArray(q?.questions)
    ? q.questions
    : Array.isArray(payload?.questions)
    ? payload.questions
    : [];
  return Array.isArray(qs) && qs.length > 0;
}

function buildQuizFromBank(moduleName, questions, passMark) {
  const safeQ = Array.isArray(questions) ? questions : [];
  return {
    module: String(moduleName || "").trim(),
    passMark: Number(passMark) || 80,
    questions: safeQ.map((qq) => ({
      q_ar: qq?.q_ar || "",
      q_en: qq?.q_en || "",
      options_ar: Array.isArray(qq?.options_ar) ? qq.options_ar : [],
      options_en: Array.isArray(qq?.options_en) ? qq.options_en : [],
      correct: Number.isFinite(Number(qq?.correct)) ? Number(qq.correct) : 0,
    })),
  };
}

/* ===================== ✅ NEW: dedupe participants (EmployeeId first, then name) ===================== */
function norm(s) {
  return String(s ?? "").trim();
}

function participantKey(p) {
  const eid = norm(p?.employeeId);
  if (eid) return `eid:${eid}`;
  const name = norm(p?.name).toLowerCase();
  if (name) return `name:${name}`;
  return `row:${Math.random().toString(36).slice(2)}`;
}

function cleanParticipant(p) {
  return {
    slNo: norm(p?.slNo),
    name: norm(p?.name),
    designation: norm(p?.designation),
    employeeId: norm(p?.employeeId),
    result: norm(p?.result),
    score: norm(p?.score),
    lastQuizAt: norm(p?.lastQuizAt),
    quizAttempt: p?.quizAttempt || null,
  };
}

function dedupeParticipants(list) {
  const arr = Array.isArray(list) ? list.map(cleanParticipant) : [];
  const map = new Map();

  const scoreNum = (v) => {
    const n = Number(String(v || "").replace("%", ""));
    return Number.isFinite(n) ? n : -1;
  };
  const rank = (p) => {
    let r = 0;
    if (p?.quizAttempt?.answers?.length) r += 50;
    if (norm(p?.result)) r += 10;
    if (scoreNum(p?.score) >= 0) r += 10;
    if (norm(p?.lastQuizAt)) r += 5;
    if (norm(p?.designation)) r += 2;
    return r;
  };

  for (const p of arr) {
    const k = participantKey(p);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, p);
      continue;
    }
    const prevR = rank(prev);
    const curR = rank(p);
    if (curR > prevR) map.set(k, { ...prev, ...p });
    else map.set(k, { ...p, ...prev });
  }

  return Array.from(map.values()).filter((p) => {
    const hasAny =
      p.name ||
      p.designation ||
      p.employeeId ||
      p.result ||
      p.score ||
      p.lastQuizAt ||
      (p.quizAttempt && p.quizAttempt.answers?.length);
    return hasAny;
  });
}

/* ===================== ✅ NEW: parse details text (A–L) into collapsible sections ===================== */
function parseTrainingDetails(rawText) {
  const t = String(rawText || "").replace(/\r/g, "").trim();
  if (!t) return [];

  const lines = t.split("\n").map((x) => x.trimEnd());
  const isHeader = (line) => /^[A-L]\)\s+/.test(line.trim());

  const sections = [];
  let cur = null;

  for (const line of lines) {
    if (!line) continue;
    if (isHeader(line)) {
      if (cur) sections.push(cur);
      const key = line.trim().slice(0, 1);
      cur = { key, header: line.trim(), body: [] };
    } else {
      if (!cur) {
        cur = { key: "•", header: "Training Details", body: [] };
      }
      cur.body.push(line);
    }
  }
  if (cur) sections.push(cur);

  if (sections.length === 1 && sections[0].key === "•") {
    sections[0].header = "DETAIL OF TRAINING";
  }

  return sections.map((s) => ({
    ...s,
    bodyText: s.body.join("\n").trim(),
  }));
}

/* ✅ Dark glass tones for details blocks (NO WHITE) */
const DETAIL_TONES = [
  { bd: "rgba(59,130,246,0.35)", bg: "linear-gradient(180deg, rgba(2,6,23,0.32), rgba(30,41,59,0.28))" }, // blue
  { bd: "rgba(168,85,247,0.35)", bg: "linear-gradient(180deg, rgba(2,6,23,0.32), rgba(49,46,129,0.18))" }, // violet
  { bd: "rgba(249,115,22,0.32)", bg: "linear-gradient(180deg, rgba(2,6,23,0.32), rgba(124,45,18,0.18))" }, // orange
  { bd: "rgba(34,197,94,0.28)", bg: "linear-gradient(180deg, rgba(2,6,23,0.32), rgba(20,83,45,0.18))" }, // green
  { bd: "rgba(244,63,94,0.30)", bg: "linear-gradient(180deg, rgba(2,6,23,0.32), rgba(136,19,55,0.16))" }, // rose
  { bd: "rgba(148,163,184,0.28)", bg: "linear-gradient(180deg, rgba(2,6,23,0.32), rgba(15,23,42,0.22))" }, // slate
];

/* ===================== Component ===================== */
export default function TrainingSessionsList() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");

  const [selected, setSelected] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [savingParticipants, setSavingParticipants] = useState(false);

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(-1);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizLang, setQuizLang] = useState("EN");

  // ✅ View Answers modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState(-1);
  const [viewLang, setViewLang] = useState("EN");

  const [rightTab, setRightTab] = useState("SESSIONS");

  const [openYears, setOpenYears] = useState(() => ({}));
  const [openMonths, setOpenMonths] = useState(() => ({}));
  const [openDays, setOpenDays] = useState(() => ({}));

  // ✅ delete training session
  const [deletingSession, setDeletingSession] = useState(false);

  // ✅ Session Link
  const [linkBusy, setLinkBusy] = useState(false);

  // ✅ NEW: collapsible details state (A–L)
  const [detailOpen, setDetailOpen] = useState(() => ({}));

  const moduleName = selected ? safeModule(selected) : "";

  const questions = useMemo(() => {
    if (!moduleName) return [];
    return QUIZ_BANK[moduleName] || QUIZ_BANK["Food Safety"] || [];
  }, [moduleName]);

  const sessionStats = useMemo(() => {
    if (!selected) return null;
    const list = Array.isArray(participants) ? participants : [];
    const valid = list.filter((p) => String(p?.name || "").trim());
    const total = valid.length;

    const pass = valid.filter(
      (p) => String(p?.result || "").toUpperCase() === "PASS"
    ).length;
    const fail = valid.filter(
      (p) => String(p?.result || "").toUpperCase() === "FAIL"
    ).length;

    const scores = valid
      .map((p) => Number(String(p?.score || "").replace("%", "")))
      .filter((n) => Number.isFinite(n));

    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const rate = total ? Math.round((pass / total) * 100) : 0;

    return { total, pass, fail, avg, rate };
  }, [selected, participants]);

  const load = async () => {
    setLoading(true);
    setInfo("");
    try {
      const data = await fetchJson(
        `${REPORTS_URL}?type=${encodeURIComponent(TYPE)}`
      );
      const arr = normalizeToArray(data).slice().sort(sortByNewest);
      setRows(arr);

      const meta = Array.isArray(data)
        ? "API returned Array"
        : `API returned Object keys: ${Object.keys(data || {}).join(", ") || "none"}`;
      setInfo(`${meta} — Loaded: ${arr.length}`);

      if (selected) {
        const sid = getId(selected);
        const fresh = arr.find((r) => getId(r) === sid);
        if (fresh) {
          setSelected(fresh);
          const raw = fresh?.payload?.participants || [];
          const cleaned = dedupeParticipants(raw);
          setParticipants(renumberParticipants(cleaned));
        }
      }
    } catch (e) {
      console.error(e);
      setInfo(`ERROR: ${String(e?.message || e)}`);
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const blob = `${safeTitle(r)} ${safeBranch(r)} ${safeModule(r)} ${safeDate(r)}`.toLowerCase();
      return blob.includes(s);
    });
  }, [rows, q]);

  const dateTree = useMemo(() => {
    const tree = {};
    for (const r of filtered) {
      const d = safeDate(r) || "Unknown";
      const y = d !== "Unknown" ? d.slice(0, 4) : "Unknown";
      const m = d !== "Unknown" ? d.slice(0, 7) : "Unknown";
      const day = d;

      tree[y] = tree[y] || {};
      tree[y][m] = tree[y][m] || {};
      tree[y][m][day] = tree[y][m][day] || [];
      tree[y][m][day].push(r);
    }
    return tree;
  }, [filtered]);

  const openSession = (r) => {
    setSelected(r);
    const raw = r?.payload?.participants || [];
    const cleaned = dedupeParticipants(raw);
    setParticipants(renumberParticipants(cleaned));

    const det = parseTrainingDetails(String(r?.payload?.details || ""));
    const nextOpen = {};
    det.forEach((s) => (nextOpen[s.key] = false));
    setDetailOpen(nextOpen);

    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
    setViewOpen(false);
    setViewIndex(-1);
  };

  const closeSession = () => {
    setSelected(null);
    setParticipants([]);
    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
    setViewOpen(false);
    setViewIndex(-1);
    setDetailOpen({});
  };

  const addRow = () => {
    setParticipants((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      base.push(makeBlankParticipant());
      return renumberParticipants(base);
    });
  };

  const add5Rows = () => {
    setParticipants((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      for (let i = 0; i < 5; i++) base.push(makeBlankParticipant());
      return renumberParticipants(base);
    });
  };

  const removeRow = (idx) =>
    setParticipants((prev) =>
      renumberParticipants((prev || []).filter((_, i) => i !== idx))
    );

  const updateCell = (idx, key, value) => {
    setParticipants((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      copy[idx] = { ...(copy[idx] || {}), [key]: value };
      return renumberParticipants(copy);
    });
  };

  /* ===================== ✅ ONE SESSION LINK (token-based) ===================== */
  const getSessionToken = () => String(selected?.payload?.quizToken || "").trim();

  const buildSessionLink = (token) => {
    const origin = String(PUBLIC_ORIGIN || "").replace(/\/$/, "");
    if (!origin || !token) return "";
    return `${origin}/t/${encodeURIComponent(token)}`;
  };

  const ensureTokenAndGetLink = async () => {
    if (!selected) return "";
    const id = getId(selected);
    if (!id) return "";

    setLinkBusy(true);
    try {
      const existingToken = getSessionToken();
      const payload0 = selected.payload || {};
      const needQuiz = !hasQuiz(payload0);

      const nextPayload = { ...payload0 };

      if (!existingToken) {
        nextPayload.quizToken = makeToken(26);
      }

      if (needQuiz) {
        if (!moduleName || !questions.length) {
          alert(
            "No question bank for this module yet (cannot generate trainee link)."
          );
          return "";
        }
        nextPayload.quiz = buildQuizFromBank(moduleName, questions, PASS_MARK);
      }

      const finalToken = existingToken || nextPayload.quizToken;
      if (!finalToken) return "";

      const changed = (!existingToken && !!nextPayload.quizToken) || needQuiz;

      if (changed) {
        const updated = { ...selected, payload: nextPayload };
        await updateReportOnServer(id, updated);
        await load();
      }

      return buildSessionLink(finalToken);
    } catch (e) {
      console.error(e);
      alert(`Failed to generate link: ${String(e?.message || e)}`);
      return "";
    } finally {
      setLinkBusy(false);
    }
  };

  const copySessionLink = async () => {
    const url = await ensureTokenAndGetLink();
    if (!url) return alert("Cannot generate link (missing session id/origin).");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert(`✅ Session link copied:\n${url}`);
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (e) {
      console.error(e);
      window.prompt("Copy this link:", url);
    }
  };

  const openSessionLink = async () => {
    const url = await ensureTokenAndGetLink();
    if (!url) return alert("Cannot generate/open link.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const saveParticipants = async () => {
    if (!selected) return;

    const clean = renumberParticipants(dedupeParticipants(participants)).map(
      (p) => ({
        slNo: String(p.slNo || "").trim(),
        name: String(p.name || "").trim(),
        designation: String(p.designation || "").trim(),
        employeeId: String(p.employeeId || "").trim(),
        result: String(p.result || "").trim(),
        score: String(p.score || "").trim(),
        lastQuizAt: String(p.lastQuizAt || "").trim(),
        quizAttempt: p?.quizAttempt || null,
      })
    );

    const hasAny = clean.some(
      (p) => p.name || p.designation || p.employeeId || p.result || p.score
    );
    if (!hasAny) {
      alert("Please add at least one participant before saving.");
      return;
    }

    for (const p of clean) {
      const rowHasData =
        p.name || p.designation || p.employeeId || p.result || p.score;
      if (rowHasData && !p.name) {
        alert(
          "A row contains data but participant name is empty. Please fill the name."
        );
        return;
      }
    }

    setSavingParticipants(true);
    try {
      const id = getId(selected);
      if (!id) throw new Error("Missing report id");

      const updated = {
        ...selected,
        payload: {
          ...(selected.payload || {}),
          participants: clean,
        },
      };

      await updateReportOnServer(id, updated);
      alert("Participants saved successfully ✅");
      await load();
    } catch (e) {
      console.error(e);
      alert(`Save failed: ${String(e?.message || e)}`);
    } finally {
      setSavingParticipants(false);
    }
  };

  const startQuiz = (pIdx) => {
    if (!selected) return;
    const p = participants[pIdx];
    if (!p || !String(p.name || "").trim()) {
      alert("Please enter the participant name before starting the quiz.");
      return;
    }
    if (!moduleName || questions.length === 0) {
      alert("No question bank for this module yet.");
      return;
    }
    setQuizIndex(pIdx);
    setQuizAnswers({});
    setQuizLang("EN");
    setQuizOpen(true);
  };

  const closeQuiz = () => {
    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
  };

  const openAnswers = (pIdx) => {
    const p = participants[pIdx];
    if (!p?.quizAttempt?.answers?.length) {
      alert("No saved answers for this participant yet.");
      return;
    }
    setViewIndex(pIdx);
    setViewLang("EN");
    setViewOpen(true);
  };
  const closeAnswers = () => {
    setViewOpen(false);
    setViewIndex(-1);
  };

  const submitQuiz = async () => {
    if (!selected) return;
    if (quizIndex < 0) return;

    for (let i = 0; i < questions.length; i++) {
      if (typeof quizAnswers[i] !== "number") {
        alert(`Please answer question #${i + 1} before submitting.`);
        return;
      }
    }

    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (quizAnswers[i] === questions[i].correct) correctCount++;
    }
    const score = Math.round((correctCount / questions.length) * 100);
    const result = score >= PASS_MARK ? "PASS" : "FAIL";

    const attemptSnapshot = {
      module: moduleName || "",
      submittedAt: new Date().toISOString(),
      passMark: PASS_MARK,
      score,
      result,
      answers: questions.map((qq, i) => ({
        q_ar: qq.q_ar,
        q_en: qq.q_en,
        options_ar: qq.options_ar,
        options_en: qq.options_en,
        correct: qq.correct,
        chosen: quizAnswers[i],
      })),
    };

    setQuizSaving(true);
    try {
      const updatedParticipants = renumberParticipants(
        dedupeParticipants(
          renumberParticipants(participants).map((p, idx) => {
            if (idx !== quizIndex) return p;
            return {
              ...p,
              score: String(score),
              result,
              lastQuizAt: todayISO(),
              quizAttempt: attemptSnapshot,
            };
          })
        )
      );

      const id = getId(selected);
      if (!id) throw new Error("Missing report id");

      const updated = {
        ...selected,
        payload: {
          ...(selected.payload || {}),
          participants: updatedParticipants.map((p) => ({
            slNo: String(p.slNo || "").trim(),
            name: String(p.name || "").trim(),
            designation: String(p.designation || "").trim(),
            employeeId: String(p.employeeId || "").trim(),
            result: String(p.result || "").trim(),
            score: String(p.score || "").trim(),
            lastQuizAt: String(p.lastQuizAt || "").trim(),
            quizAttempt: p?.quizAttempt || null,
          })),
        },
      };

      await updateReportOnServer(id, updated);

      alert(
        `Saved ✅\n${participants[quizIndex]?.name}\nScore: ${score}% — ${result}`
      );

      setParticipants(updatedParticipants);
      closeQuiz();
      await load();
    } catch (e) {
      console.error(e);
      alert(`Quiz save failed: ${String(e?.message || e)}`);
    } finally {
      setQuizSaving(false);
    }
  };

  const deleteTrainingSession = async () => {
    if (!selected) return;
    const id = getId(selected);
    if (!id) {
      alert("Missing report id");
      return;
    }

    const ok = window.confirm(
      `⚠️ Delete this training session permanently?\n\nTitle: ${
        safeTitle(selected) || "-"
      }\nDate: ${safeDate(selected) || "-"}\nBranch: ${
        safeBranch(selected) || "-"
      }\nModule: ${safeModule(selected) || "-"}`
    );
    if (!ok) return;

    setDeletingSession(true);
    try {
      await deleteReportOnServer(id);
      alert("Training session deleted ✅");
      closeSession();
      await load();
    } catch (e) {
      console.error(e);
      alert(`Delete failed: ${String(e?.message || e)}`);
    } finally {
      setDeletingSession(false);
    }
  };

  const activeParticipant = quizIndex >= 0 ? participants[quizIndex] : null;
  const viewParticipant = viewIndex >= 0 ? participants[viewIndex] : null;

  /* ===================== ✅ THEME (Mock Recall View Style) ===================== */
  const THEME = {
    text: "#1f2937",
    textStrong: "#0b1f4d",
    muted: "#64748b",
    muted2: "#94a3b8",
    line: "#e5e7eb",
    lineStrong: "#cbd5e1",
    glassBg: "#ffffff",
    glassBd: "#e5e7eb",
    glassShadow: "0 1px 3px rgba(0,0,0,0.04)",
    surfaceBg: "#ffffff",
    surfaceBd: "#e5e7eb",
    surfaceShadow: "0 1px 3px rgba(0,0,0,0.04)",
    inputBg: "#f8fafc",
    inputBd: "#e2e8f0",
    inputPh: "#94a3b8",
    headerBg: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
  };

  const pageStyle = {
    minHeight: "100vh",
    width: "100%",
    padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#ecfdf5)",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    color: THEME.text,
  };

  const glass = {
    background: THEME.glassBg,
    border: `1px solid ${THEME.glassBd}`,
    borderRadius: 12,
    boxShadow: THEME.glassShadow,
  };

  const surface = {
    background: THEME.surfaceBg,
    border: `1px solid ${THEME.surfaceBd}`,
    borderRadius: 12,
    boxShadow: THEME.surfaceShadow,
  };

  const btn = (kind = "light") => {
    const m = {
      dark:    { bg: "rgba(255,255,255,0.18)", fg: "#fff",    bd: "rgba(255,255,255,0.4)" },
      light:   { bg: "rgba(255,255,255,0.12)", fg: "#fff",    bd: "rgba(255,255,255,0.3)" },
      blue:    { bg: "#1e40af",                fg: "#fff",    bd: "transparent" },
      red:     { bg: "#fef2f2",                fg: "#991b1b", bd: "#fca5a5" },
      violet:  { bg: "#ede9fe",                fg: "#5b21b6", bd: "#ddd6fe" },
      green:   { bg: "#15803d",                fg: "#fff",    bd: "transparent" },
      gray:    { bg: "#f1f5f9",                fg: "#334155", bd: "#e2e8f0" },
      warning: { bg: "#fff7ed",                fg: "#9a3412", bd: "#fdba74" },
    };
    const c = m[kind] || m.light;
    return {
      padding: "9px 14px",
      borderRadius: 10,
      border: `1px solid ${c.bd}`,
      background: c.bg,
      color: c.fg,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: "0.88rem",
      whiteSpace: "nowrap",
      transition: "filter .12s ease",
    };
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1.5px solid ${THEME.inputBd}`,
    outline: "none",
    fontWeight: 700,
    fontSize: "0.92rem",
    color: THEME.textStrong,
    background: THEME.inputBg,
    fontFamily: "inherit",
  };

  const TOP_EST = 320; // navy header + KPI row + filters bar + margins
  const rightPanelHeight = `calc(100vh - ${TOP_EST}px)`;

  const token = selected ? getSessionToken() : "";
  const sessionLink = token ? buildSessionLink(token) : "";

  const detailsText = selected ? String(selected?.payload?.details || "") : "";
  const objectivesText = selected ? String(selected?.payload?.objectives || "") : "";

  const detailsSections = useMemo(
    () => parseTrainingDetails(detailsText),
    [detailsText]
  );

  const toggleDetail = (k) => setDetailOpen((p) => ({ ...p, [k]: !p[k] }));

  const expandAllDetails = () => {
    const next = {};
    detailsSections.forEach((s) => (next[s.key] = true));
    setDetailOpen(next);
  };

  const collapseAllDetails = () => {
    const next = {};
    detailsSections.forEach((s) => (next[s.key] = false));
    setDetailOpen(next);
  };

  /* ====== KPI calculations (matches Mock Recall View style) ====== */
  const kpis = (() => {
    const total = filtered.length;
    const branches = new Set();
    const modules = new Set();
    let withQuiz = 0;
    let lastDate = null;
    for (const r of filtered) {
      const b = safeBranch(r); if (b) branches.add(b);
      const m = safeModule(r); if (m) modules.add(m);
      if (hasQuiz(r?.payload)) withQuiz += 1;
      const d = safeDate(r);
      if (d && (!lastDate || d > lastDate)) lastDate = d;
    }
    const days = (() => {
      if (!lastDate) return null;
      const dt = new Date(lastDate);
      if (isNaN(dt.getTime())) return null;
      return Math.floor((Date.now() - dt.getTime()) / 86400000);
    })();
    return {
      total,
      branches: branches.size,
      modules: modules.size,
      withQuiz,
      lastDate,
      daysSinceLast: days,
    };
  })();

  return (
    <div style={pageStyle}>
      {/* ========= TOP HEADER (navy gradient, like Mock Recall) ========= */}
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
          color: "#fff",
          padding: "18px 22px",
          borderRadius: 14,
          boxShadow: "0 6px 18px rgba(30,58,95,0.20)",
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>
            🎓 Training Sessions
          </h1>
          <div style={{ opacity: 0.85, marginTop: 4, fontSize: "0.92rem" }}>
            {loading ? "Loading…" : (info || `Browse, view participants, run quizzes, and track KPIs.`)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={load} disabled={loading} style={btn("light")}>
            {loading ? "Refreshing…" : "🔄 Refresh"}
          </button>
          <button onClick={() => nav("/training/create")} style={btn("dark")}>
            ➕ New Training
          </button>
          <button onClick={() => nav("/training")} style={btn("light")}>
            ↩ Back
          </button>
        </div>
      </div>

      {/* ========= KPI ROW ========= */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <KPICardLocal icon="📋" label="Total Sessions" value={kpis.total} sub={q ? `Filtered from ${rows.length}` : "All sessions"} accent="#1e40af" />
        <KPICardLocal icon="🏢" label="Branches Covered" value={kpis.branches} sub="distinct branches" accent="#0891b2" />
        <KPICardLocal icon="📚" label="Modules Covered" value={kpis.modules} sub="distinct modules" accent="#7c3aed" />
        <KPICardLocal icon="📝" label="With Quiz" value={`${kpis.withQuiz}/${kpis.total || 0}`} sub={kpis.total ? `${Math.round((kpis.withQuiz / kpis.total) * 100)}% have quiz` : "—"} accent="#15803d" />
        <KPICardLocal
          icon={kpis.daysSinceLast !== null && kpis.daysSinceLast > 60 ? "⏳" : "📅"}
          label="Since Last Training"
          value={kpis.daysSinceLast !== null ? `${kpis.daysSinceLast} days` : "—"}
          sub={kpis.lastDate || "—"}
          accent="#a16207"
          bad={kpis.daysSinceLast !== null && kpis.daysSinceLast > 90}
        />
      </div>

      {/* ========= FILTER BAR ========= */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Search by Branch / Module / Title / Date…"
          style={{ ...inputStyle, flex: 1, minWidth: 280 }}
        />
        {q && (
          <button onClick={() => setQ("")} style={btn("gray")}>✕ Clear</button>
        )}
        <span style={{ color: "#64748b", fontSize: "0.88rem", fontWeight: 700 }}>
          {filtered.length} session(s)
        </span>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          flexDirection: "row-reverse",
        }}
      >
        {/* RIGHT: Library */}
        <div
          style={{
            width: 460,
            minWidth: 380,
            maxWidth: 520,
            position: "sticky",
            top: 14,
            height: rightPanelHeight,
            overflow: "hidden",
            ...glass,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${THEME.line}`,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              background: THEME.headerBg,
              color: "#fff",
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 14, letterSpacing: 0.3 }}>📚 Library</div>
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.10)",
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}>
              <button
                onClick={() => setRightTab("SESSIONS")}
                style={{
                  border: "none",
                  background: rightTab === "SESSIONS" ? "#fff" : "transparent",
                  color: rightTab === "SESSIONS" ? "#0f172a" : "#cbd5e1",
                  fontWeight: 1000,
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  letterSpacing: 0.3,
                  transition: "all .12s",
                }}
              >
                Sessions
              </button>
              <button
                onClick={() => setRightTab("TREE")}
                style={{
                  border: "none",
                  background: rightTab === "TREE" ? "#fff" : "transparent",
                  color: rightTab === "TREE" ? "#0f172a" : "#cbd5e1",
                  fontWeight: 1000,
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  letterSpacing: 0.3,
                  transition: "all .12s",
                }}
              >
                Date Tree
              </button>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              background: "#f8fafc",
            }}
          >
            {rightTab === "SESSIONS" ? (
              <div style={{ display: "grid", gap: 8 }}>
                {loading ? (
                  <div style={{
                    padding: 24, textAlign: "center",
                    color: THEME.muted, fontWeight: 800, fontSize: 13,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
                      margin: "0 auto 10px",
                      animation: "tspin 0.7s linear infinite",
                    }} />
                    <style>{`@keyframes tspin { to { transform: rotate(360deg); } }`}</style>
                    Loading sessions…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{
                    padding: "40px 16px", textAlign: "center",
                    color: THEME.muted, fontWeight: 700, fontSize: 13,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📭</div>
                    {q ? "No sessions match your search." : "No sessions found yet."}
                  </div>
                ) : (
                  filtered.map((r, idx) => {
                    const active = selected && getId(selected) === getId(r);
                    return (
                      <button
                        key={getId(r) || idx}
                        onClick={() => openSession(r)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: 12,
                          border: active
                            ? "2px solid #6366f1"
                            : `1px solid ${THEME.line}`,
                          background: active ? "#eef2ff" : "#ffffff",
                          padding: "10px 12px",
                          cursor: "pointer",
                          boxShadow: active
                            ? "0 8px 20px rgba(99,102,241,0.18)"
                            : "0 1px 3px rgba(15,23,42,0.05)",
                          color: THEME.text,
                          transition: "all .12s",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                        title="Open"
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{
                            fontWeight: 900, color: THEME.textStrong,
                            fontSize: 13, lineHeight: 1.35,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            flex: 1,
                          }}>
                            {safeTitle(r) || "Training Session"}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 1000,
                            color: "#1e40af",
                            background: "#dbeafe",
                            padding: "3px 8px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                            border: "1px solid #bfdbfe",
                          }}>
                            📅 {safeDate(r) || "-"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            color: "#5b21b6",
                            background: "#ede9fe",
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #ddd6fe",
                          }}>
                            📚 {safeModule(r) || "—"}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            color: "#334155",
                            background: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #e2e8f0",
                          }}>
                            🏢 {safeBranch(r) || "—"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {Object.keys(dateTree).length === 0 ? (
                  <div style={{
                    padding: "40px 16px", textAlign: "center",
                    color: THEME.muted, fontWeight: 700, fontSize: 13,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🗂</div>
                    No data.
                  </div>
                ) : (
                  Object.keys(dateTree)
                    .sort((a, b) => String(b).localeCompare(String(a)))
                    .map((year) => {
                      const isYearOpen = !!openYears[year];
                      const monthsObj = dateTree[year] || {};
                      const months = Object.keys(monthsObj).sort((a, b) =>
                        String(b).localeCompare(String(a))
                      );

                      return (
                        <div
                          key={year}
                          style={{
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 12,
                            background: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                          }}
                        >
                          <button
                            onClick={() =>
                              setOpenYears((p) => ({ ...p, [year]: !p[year] }))
                            }
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 12px",
                              cursor: "pointer",
                              border: "none",
                              background: isYearOpen ? "linear-gradient(135deg,#0f172a,#1e293b)" : "#f1f5f9",
                              fontWeight: 1000,
                              fontSize: 13,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              color: isYearOpen ? "#fff" : THEME.textStrong,
                              transition: "all .15s",
                            }}
                          >
                            <span>📁 {year}</span>
                            <span style={{ color: isYearOpen ? "#cbd5e1" : THEME.muted }}>
                              {isYearOpen ? "▾" : "▸"}
                            </span>
                          </button>

                          {isYearOpen && (
                            <div style={{ padding: 10, display: "grid", gap: 8 }}>
                              {months.map((month) => {
                                const mKey = `${year}_${month}`;
                                const isMonthOpen = !!openMonths[mKey];
                                const daysObj = monthsObj[month] || {};
                                const days = Object.keys(daysObj).sort((a, b) =>
                                  String(b).localeCompare(String(a))
                                );

                                return (
                                  <div
                                    key={mKey}
                                    style={{
                                      border: `1px solid ${THEME.line}`,
                                      borderRadius: 10,
                                      overflow: "hidden",
                                      background: "#fff",
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        setOpenMonths((p) => ({
                                          ...p,
                                          [mKey]: !p[mKey],
                                        }))
                                      }
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        border: "none",
                                        background: isMonthOpen ? "#dbeafe" : "#f8fafc",
                                        fontWeight: 900,
                                        fontSize: 12,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        color: isMonthOpen ? "#1e40af" : THEME.textStrong,
                                        transition: "all .12s",
                                      }}
                                    >
                                      <span>📂 {month}</span>
                                      <span style={{ color: isMonthOpen ? "#3b82f6" : THEME.muted }}>
                                        {isMonthOpen ? "▾" : "▸"}
                                      </span>
                                    </button>

                                    {isMonthOpen && (
                                      <div
                                        style={{
                                          padding: 8,
                                          display: "grid",
                                          gap: 6,
                                          background: "#f8fafc",
                                        }}
                                      >
                                        {days.map((day) => {
                                          const dKey = `${year}_${month}_${day}`;
                                          const isDayOpen = !!openDays[dKey];
                                          const list = daysObj[day] || [];
                                          return (
                                            <div
                                              key={dKey}
                                              style={{
                                                border: `1px solid ${THEME.line}`,
                                                borderRadius: 8,
                                                overflow: "hidden",
                                                background: "#fff",
                                              }}
                                            >
                                              <button
                                                onClick={() =>
                                                  setOpenDays((p) => ({
                                                    ...p,
                                                    [dKey]: !p[dKey],
                                                  }))
                                                }
                                                style={{
                                                  width: "100%",
                                                  textAlign: "left",
                                                  padding: "8px 10px",
                                                  cursor: "pointer",
                                                  border: "none",
                                                  background: isDayOpen ? "#ede9fe" : "#fff",
                                                  fontWeight: 900,
                                                  fontSize: 12,
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "center",
                                                  color: isDayOpen ? "#5b21b6" : THEME.textStrong,
                                                  transition: "all .12s",
                                                }}
                                              >
                                                <span>📅 {day}</span>
                                                <span style={{
                                                  display: "flex", gap: 6, alignItems: "center",
                                                  color: isDayOpen ? "#7c3aed" : THEME.muted,
                                                }}>
                                                  <span style={{
                                                    background: "#fbcfe8",
                                                    color: "#9f1239",
                                                    padding: "1px 7px",
                                                    borderRadius: 999,
                                                    fontSize: 10,
                                                    fontWeight: 1000,
                                                  }}>{list.length}</span>
                                                  {isDayOpen ? "▾" : "▸"}
                                                </span>
                                              </button>

                                              {isDayOpen && (
                                                <div
                                                  style={{
                                                    padding: 8,
                                                    display: "grid",
                                                    gap: 6,
                                                    background: "#f8fafc",
                                                  }}
                                                >
                                                  {list.map((r, i) => {
                                                    const active =
                                                      selected && getId(selected) === getId(r);
                                                    return (
                                                      <button
                                                        key={getId(r) || i}
                                                        onClick={() => openSession(r)}
                                                        style={{
                                                          width: "100%",
                                                          textAlign: "left",
                                                          borderRadius: 8,
                                                          border: active
                                                            ? "2px solid #6366f1"
                                                            : `1px solid ${THEME.line}`,
                                                          background: active ? "#eef2ff" : "#fff",
                                                          padding: "8px 10px",
                                                          cursor: "pointer",
                                                          boxShadow: active
                                                            ? "0 4px 10px rgba(99,102,241,0.15)"
                                                            : "0 1px 2px rgba(15,23,42,0.04)",
                                                          color: THEME.text,
                                                          transition: "all .12s",
                                                        }}
                                                      >
                                                        <div style={{
                                                          fontWeight: 900, color: THEME.textStrong,
                                                          fontSize: 12, lineHeight: 1.3,
                                                          overflow: "hidden",
                                                          display: "-webkit-box",
                                                          WebkitLineClamp: 2,
                                                          WebkitBoxOrient: "vertical",
                                                        }}>
                                                          {safeTitle(r) || "Training Session"}
                                                        </div>
                                                        <div
                                                          style={{
                                                            marginTop: 4,
                                                            display: "flex",
                                                            gap: 4,
                                                            flexWrap: "wrap",
                                                          }}
                                                        >
                                                          <span style={{
                                                            fontSize: 9, fontWeight: 800,
                                                            color: "#5b21b6",
                                                            background: "#ede9fe",
                                                            padding: "2px 6px",
                                                            borderRadius: 999,
                                                          }}>
                                                            📚 {safeModule(r) || "—"}
                                                          </span>
                                                          <span style={{
                                                            fontSize: 9, fontWeight: 800,
                                                            color: "#334155",
                                                            background: "#f1f5f9",
                                                            padding: "2px 6px",
                                                            borderRadius: 999,
                                                          }}>
                                                            🏢 {safeBranch(r) || "—"}
                                                          </span>
                                                        </div>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>

        {/* LEFT: Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div style={{ ...glass, padding: 18, minHeight: "calc(100vh - 220px)" }}>
              <div style={{ fontWeight: 1100, color: THEME.textStrong, fontSize: 16 }}>
                📌 Session Details
              </div>
              <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
                Select a training session from the right panel to view details here.
              </div>
            </div>
          ) : (
            <div style={{ ...glass, padding: 14, minHeight: "calc(100vh - 220px)" }}>
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
                  <div style={{ fontWeight: 1100, fontSize: 16, color: THEME.textStrong }}>
                    📌 Session Details
                  </div>
                  <div style={{ marginTop: 6, color: THEME.textStrong, fontWeight: 1000 }}>
                    {safeTitle(selected)}
                  </div>
                  <div style={{ marginTop: 6, color: THEME.muted, fontSize: 13, fontWeight: 800 }}>
                    Date: {safeDate(selected)} — Branch: {safeBranch(selected)} — Module:{" "}
                    {safeModule(selected)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={deleteTrainingSession}
                    disabled={deletingSession || loading}
                    style={{
                      ...btn("red"),
                      opacity: deletingSession ? 0.75 : 1,
                      cursor: deletingSession ? "not-allowed" : "pointer",
                    }}
                    title="Delete training session"
                  >
                    {deletingSession ? "Deleting..." : "🗑 Delete Training"}
                  </button>

                  <button onClick={closeSession} style={btn("light")} disabled={deletingSession}>
                    ✖ Close
                  </button>
                </div>
              </div>

              {/* ✅ ONE LINK BAR */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(14,165,233,0.45)",
                  background: "linear-gradient(180deg, rgba(2,6,23,0.30), rgba(2,6,23,0.18))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge text="Trainee Link (One for all)" tone="violet" />
                    <Badge text={`Module: ${moduleName || "-"}`} tone="gray" />
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={copySessionLink}
                      disabled={linkBusy || deletingSession}
                      style={{ ...btn("violet"), opacity: linkBusy ? 0.75 : 1 }}
                    >
                      {linkBusy ? "Working..." : "🔗 Generate & Copy Link"}
                    </button>
                    <button
                      onClick={openSessionLink}
                      disabled={linkBusy || deletingSession}
                      style={btn("light")}
                    >
                      ↗ Open
                    </button>
                  </div>
                </div>

                {sessionLink ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
                    Link: <span style={{ userSelect: "all", color: THEME.textStrong }}>{sessionLink}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
                    Click “Generate & Copy Link” to create the session link.
                  </div>
                )}
              </div>

              {/* ✅ Training Details (A–L) — GRID + COLLAPSIBLE */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: `1px solid ${THEME.lineStrong}`,
                  background: "linear-gradient(180deg, rgba(2,6,23,0.30), rgba(2,6,23,0.18))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 1100, color: THEME.textStrong }}>
                    📌 DETAIL OF TRAINING (A–L) — EN / AR
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        const t = String(selected?.payload?.details || "");
                        if (!t.trim()) return alert("No training details saved in this session.");
                        try {
                          if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(t);
                          else window.prompt("Copy details:", t);
                        } catch {
                          window.prompt("Copy details:", t);
                        }
                      }}
                      style={btn("light")}
                    >
                      📋 Copy
                    </button>

                    <button
                      onClick={expandAllDetails}
                      disabled={!detailsSections.length}
                      style={{ ...btn("light"), opacity: detailsSections.length ? 1 : 0.6 }}
                    >
                      ▾ Expand all
                    </button>
                    <button
                      onClick={collapseAllDetails}
                      disabled={!detailsSections.length}
                      style={{ ...btn("light"), opacity: detailsSections.length ? 1 : 0.6 }}
                    >
                      ▸ Collapse all
                    </button>
                  </div>
                </div>

                {detailsSections.length ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    {detailsSections.map((sec, i) => {
                      const open = !!detailOpen[sec.key];
                      const tone = DETAIL_TONES[i % DETAIL_TONES.length];

                      return (
                        <div
                          key={`${sec.key}_${i}`}
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${tone.bd}`,
                            background: tone.bg,
                            overflow: "hidden",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
                          }}
                        >
                          <button
                            onClick={() => toggleDetail(sec.key)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              padding: 12,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                              fontWeight: 1100,
                              color: THEME.textStrong,
                            }}
                            title="Toggle"
                          >
                            <span style={{ lineHeight: 1.3 }}>{sec.header}</span>
                            <span style={{ color: THEME.muted, fontWeight: 1100 }}>
                              {open ? "▾" : "▸"}
                            </span>
                          </button>

                          {open && (
                            <div
                              style={{
                                padding: 12,
                                borderTop: `1px solid ${tone.bd}`,
                                background: "rgba(2,6,23,0.35)",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.7,
                                fontWeight: 900,
                                color: THEME.text,
                              }}
                            >
                              {sec.bodyText || "-"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
                    No training details found for this session.
                  </div>
                )}
              </div>

              {/* ✅ Objectives */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(99,102,241,0.45)",
                  background: "linear-gradient(180deg, rgba(2,6,23,0.30), rgba(2,6,23,0.18))",
                }}
              >
                <div style={{ fontWeight: 1100, color: THEME.textStrong }}>
                  🎯 Objectives / Frequency / Evaluation
                </div>

                {objectivesText.trim() ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 14,
                      border: `1px solid ${THEME.line}`,
                      background: "rgba(2,6,23,0.40)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                      fontWeight: 900,
                      color: THEME.text,
                    }}
                  >
                    {objectivesText}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
                    No objectives found for this session.
                  </div>
                )}
              </div>

              {sessionStats && (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  <KPI label="Participants" value={sessionStats.total} tone="violet" />
                  <KPI label="PASS" value={sessionStats.pass} tone="green" />
                  <KPI label="FAIL" value={sessionStats.fail} tone="red" />
                  <KPI label="Pass Rate" value={`${sessionStats.rate}%`} tone="blue" />
                  <KPI label="Average Score" value={`${sessionStats.avg}%`} tone="gray" />
                </div>
              )}

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge text={`Questions: ${questions.length}`} tone="blue" />
                  <Badge text={`Pass Mark: ${PASS_MARK}%`} tone="green" />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={addRow} style={btn("light")} disabled={deletingSession}>
                    ➕ Add Row
                  </button>
                  <button onClick={add5Rows} style={btn("light")} disabled={deletingSession}>
                    ➕ Add 5 Rows
                  </button>
                  <button
                    onClick={saveParticipants}
                    disabled={savingParticipants || deletingSession}
                    style={{
                      ...btn("dark"),
                      opacity: savingParticipants ? 0.7 : 1,
                      cursor: savingParticipants ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingParticipants ? "Saving..." : "💾 Save Participants"}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      {["SL", "NAME", "DESIGNATION", "EMP ID", "SCORE", "RESULT", "LAST QUIZ", ""].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: 12,
                              background: "rgba(2,6,23,0.45)",
                              borderTop: `1px solid ${THEME.line}`,
                              borderBottom: `1px solid ${THEME.line}`,
                              fontWeight: 1100,
                              whiteSpace: "nowrap",
                              position: "sticky",
                              top: 0,
                              zIndex: 1,
                              color: THEME.textStrong,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 14, color: THEME.muted, fontWeight: 900 }}>
                          No participants yet. Anyone who submits the session link will appear here automatically ✅
                        </td>
                      </tr>
                    ) : (
                      participants.map((p, idx) => {
                        const res = String(p.result || "").toUpperCase();
                        const hasAnswers = !!p?.quizAttempt?.answers?.length;
                        return (
                          <tr key={idx}>
                            <td
                              style={{
                                padding: 12,
                                borderBottom: `1px solid rgba(148,163,184,0.14)`,
                                whiteSpace: "nowrap",
                                fontWeight: 900,
                                color: THEME.text,
                              }}
                            >
                              {p.slNo}
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 240 }}>
                              <input
                                value={p.name || ""}
                                onChange={(e) => updateCell(idx, "name", e.target.value)}
                                placeholder="Participant name"
                                style={inputStyle}
                              />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 220 }}>
                              <input
                                value={p.designation || ""}
                                onChange={(e) => updateCell(idx, "designation", e.target.value)}
                                placeholder="Designation"
                                style={inputStyle}
                              />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 160 }}>
                              <input
                                value={p.employeeId || ""}
                                onChange={(e) => updateCell(idx, "employeeId", e.target.value)}
                                placeholder="Employee ID"
                                style={inputStyle}
                              />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              <Badge text={`${String(p.score || "").replace("%", "") || "-"}%`} tone="blue" />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              {res === "PASS" ? (
                                <Badge text="PASS" tone="green" />
                              ) : res === "FAIL" ? (
                                <Badge text="FAIL" tone="red" />
                              ) : (
                                <Badge text="-" tone="gray" />
                              )}
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <Badge text={p.lastQuizAt || "-"} tone="gray" />
                                {hasAnswers ? <Badge text="Answers Saved" tone="amber" /> : null}
                              </div>
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => startQuiz(idx)} style={btn("blue")} disabled={deletingSession}>
                                  🧪 Start Quiz (Admin)
                                </button>

                                <button
                                  onClick={() => openAnswers(idx)}
                                  disabled={!hasAnswers || deletingSession}
                                  style={{
                                    ...btn("light"),
                                    opacity: hasAnswers ? 1 : 0.5,
                                    cursor: hasAnswers ? "pointer" : "not-allowed",
                                  }}
                                  title={hasAnswers ? "View saved answers" : "No saved answers yet"}
                                >
                                  👁 View Answers
                                </button>

                                <button
                                  onClick={() => removeRow(idx)}
                                  disabled={deletingSession}
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: "1px solid rgba(244,63,94,0.35)",
                                    background: "rgba(127,29,29,0.20)",
                                    color: "#fecdd3",
                                    cursor: "pointer",
                                    fontWeight: 1000,
                                    opacity: deletingSession ? 0.6 : 1,
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10, color: THEME.muted, fontSize: 13, fontWeight: 900 }}>
                ✅ Anyone submits the session link → saved on server → appears here automatically.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== QUIZ MODAL (Admin manual) ===================== */}
      <Modal
        show={quizOpen && !!activeParticipant}
        title={`🧪 Quiz: ${activeParticipant?.name || ""} — ${moduleName || ""}`}
        onClose={() => (quizSaving ? null : closeQuiz())}
        footer={[
          <button
            key="close"
            onClick={() => (quizSaving ? null : closeQuiz())}
            style={btn("light")}
            disabled={quizSaving}
          >
            Close
          </button>,
          <button
            key="submit"
            onClick={submitQuiz}
            style={{
              ...btn("dark"),
              opacity: quizSaving ? 0.75 : 1,
              cursor: quizSaving ? "not-allowed" : "pointer",
            }}
            disabled={quizSaving}
          >
            {quizSaving ? "Saving..." : "✅ Submit & Save"}
          </button>,
        ]}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge text={`Questions: ${questions.length}`} tone="blue" />
            <Badge text={`Pass Mark: ${PASS_MARK}%`} tone="green" />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setQuizLang("EN")}
              style={{
                ...btn(quizLang === "EN" ? "dark" : "light"),
                padding: "8px 10px",
              }}
            >
              EN
            </button>
            <button
              onClick={() => setQuizLang("AR")}
              style={{
                ...btn(quizLang === "AR" ? "dark" : "light"),
                padding: "8px 10px",
              }}
            >
              عربي
            </button>
          </div>
        </div>

        {!moduleName || questions.length === 0 ? (
          <div style={{ color: "#fecdd3", fontWeight: 1000 }}>
            No question bank for this module yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {questions.map((qq, i) => {
              const qText = quizLang === "AR" ? qq.q_ar : qq.q_en;
              const opts = quizLang === "AR" ? qq.options_ar : qq.options_en;

              return (
                <div
                  key={i}
                  style={{
                    ...surface,
                    padding: 14,
                    direction: quizLang === "AR" ? "rtl" : "ltr",
                  }}
                >
                  <div style={{ fontWeight: 1100, marginBottom: 10, color: THEME.textStrong }}>
                    {i + 1}) {qText}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {opts.map((opt, oi) => {
                      const checked = quizAnswers[i] === oi;
                      return (
                        <label
                          key={oi}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: `1px solid ${
                              checked ? "rgba(99,102,241,0.60)" : THEME.line
                            }`,
                            cursor: "pointer",
                            background: checked
                              ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(2,6,23,0.18))"
                              : "rgba(2,6,23,0.22)",
                            fontWeight: 900,
                            color: THEME.text,
                          }}
                        >
                          <input
                            type="radio"
                            name={`q_${i}`}
                            checked={checked}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [i]: oi }))}
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
        )}
      </Modal>

      {/* ===================== VIEW ANSWERS MODAL ===================== */}
      <Modal
        show={viewOpen && !!viewParticipant}
        title={`👁 Answers: ${viewParticipant?.name || ""} — ${
          viewParticipant?.quizAttempt?.module || moduleName || ""
        }`}
        onClose={closeAnswers}
        footer={[
          <button key="close" onClick={closeAnswers} style={btn("dark")}>
            Close
          </button>,
        ]}
      >
        {!(viewParticipant?.quizAttempt?.answers?.length) ? (
          <div style={{ color: "#fecdd3", fontWeight: 1000 }}>No saved answers.</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Badge text={`Score: ${viewParticipant.quizAttempt.score}%`} tone="blue" />
                <Badge
                  text={`Result: ${viewParticipant.quizAttempt.result}`}
                  tone={String(viewParticipant.quizAttempt.result).toUpperCase() === "PASS" ? "green" : "red"}
                />
                <Badge
                  text={`Saved: ${String(viewParticipant.quizAttempt.submittedAt || "").slice(0, 10) || "-"}`}
                  tone="gray"
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setViewLang("EN")}
                  style={{
                    ...btn(viewLang === "EN" ? "dark" : "light"),
                    padding: "8px 10px",
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setViewLang("AR")}
                  style={{
                    ...btn(viewLang === "AR" ? "dark" : "light"),
                    padding: "8px 10px",
                  }}
                >
                  عربي
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {viewParticipant.quizAttempt.answers.map((a, i) => {
                const qText = viewLang === "AR" ? a.q_ar : a.q_en;
                const opts = viewLang === "AR" ? a.options_ar : a.options_en;

                const chosen = typeof a.chosen === "number" ? a.chosen : -1;
                const correct = typeof a.correct === "number" ? a.correct : -1;

                return (
                  <div
                    key={i}
                    style={{
                      ...surface,
                      padding: 14,
                      direction: viewLang === "AR" ? "rtl" : "ltr",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 1100, color: THEME.textStrong }}>
                        {i + 1}) {qText}
                      </div>
                      {chosen === correct ? (
                        <Badge text="Correct" tone="green" />
                      ) : (
                        <Badge text="Wrong" tone="red" />
                      )}
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {opts.map((opt, oi) => {
                        const isChosen = oi === chosen;
                        const isCorrect = oi === correct;

                        let border = THEME.line;
                        let bg = "rgba(2,6,23,0.22)";
                        if (isCorrect) {
                          border = "rgba(34,197,94,0.35)";
                          bg = "rgba(20,83,45,0.18)";
                        }
                        if (isChosen && !isCorrect) {
                          border = "rgba(244,63,94,0.35)";
                          bg = "rgba(127,29,29,0.18)";
                        }

                        return (
                          <div
                            key={oi}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: `1px solid ${border}`,
                              background: bg,
                              fontWeight: 900,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                              color: THEME.text,
                            }}
                          >
                            <div>{opt}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {isChosen ? <Badge text="Chosen" tone="blue" /> : null}
                              {isCorrect ? <Badge text="Correct" tone="green" /> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <div style={{ marginTop: 14, textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "0.85rem" }}>
        Built by Eng. Mohammed Abdullah
      </div>
    </div>
  );
}

/* ============== KPI Card (matches Mock Recall View style) ============== */
function KPICardLocal({ icon, label, value, sub, accent = "#1e40af", bad }) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 180,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderInlineStart: `4px solid ${bad ? "#ef4444" : accent}`,
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 900,
          color: bad ? "#b91c1c" : accent,
          lineHeight: 1.1,
          marginTop: 4,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
          {sub}
        </div>
      )}
    </div>
  );
}