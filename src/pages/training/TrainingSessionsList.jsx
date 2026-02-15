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

  /* ===================== ✅ THEME (NO WHITE) ===================== */
  const THEME = {
    text: "#e5e7eb",
    textStrong: "#f1f5f9",
    muted: "#94a3b8",
    muted2: "#a1a1aa",
    line: "rgba(148,163,184,0.22)",
    lineStrong: "rgba(148,163,184,0.30)",
    glassBg: "rgba(15,23,42,0.72)",
    glassBd: "rgba(148,163,184,0.22)",
    glassShadow: "0 20px 60px rgba(0,0,0,0.45)",
    surfaceBg: "rgba(2,6,23,0.36)",
    surfaceBd: "rgba(148,163,184,0.20)",
    surfaceShadow: "0 12px 32px rgba(0,0,0,0.35)",
    inputBg: "rgba(2,6,23,0.55)",
    inputBd: "rgba(148,163,184,0.22)",
    inputPh: "rgba(148,163,184,0.75)",
    headerBg: "linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.30))",
  };

  const pageStyle = {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(1200px 700px at 10% 10%, rgba(14,165,233,0.35), transparent 60%)," +
      "radial-gradient(900px 600px at 90% 0%, rgba(124,58,237,0.35), transparent 55%)," +
      "radial-gradient(900px 700px at 70% 100%, rgba(16,185,129,0.20), transparent 55%)," +
      "linear-gradient(135deg, #0b1220 0%, #111827 45%, #030712 100%)",
    padding: "18px 14px",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily:
      "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    color: THEME.text,
  };

  const glass = {
    background: THEME.glassBg,
    border: `1px solid ${THEME.glassBd}`,
    borderRadius: 18,
    boxShadow: THEME.glassShadow,
    backdropFilter: "blur(14px)",
  };

  const surface = {
    background: THEME.surfaceBg,
    border: `1px solid ${THEME.surfaceBd}`,
    borderRadius: 16,
    boxShadow: THEME.surfaceShadow,
  };

  const btn = (kind = "light") => {
    const m = {
      dark: { bg: "linear-gradient(135deg,#0b1220,#111827)", fg: THEME.textStrong, bd: "rgba(148,163,184,0.25)" },
      light: { bg: "rgba(2,6,23,0.35)", fg: THEME.text, bd: "rgba(148,163,184,0.22)" },
      blue: { bg: "linear-gradient(135deg, rgba(6,182,212,0.85), rgba(37,99,235,0.85))", fg: "#081018", bd: "rgba(147,197,253,0.35)" },
      red: { bg: "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(190,18,60,0.85))", fg: "#120207", bd: "rgba(254,205,211,0.35)" },
      violet: { bg: "linear-gradient(135deg, rgba(124,58,237,0.85), rgba(79,70,229,0.85))", fg: "#0c0617", bd: "rgba(199,210,254,0.35)" },
      green: { bg: "linear-gradient(135deg, rgba(16,185,129,0.85), rgba(5,150,105,0.85))", fg: "#03110b", bd: "rgba(167,243,208,0.35)" },
      gray: { bg: "linear-gradient(135deg, rgba(100,116,139,0.75), rgba(71,85,105,0.75))", fg: "#05070b", bd: "rgba(203,213,225,0.28)" },
    };
    const c = m[kind] || m.light;
    return {
      padding: "10px 12px",
      borderRadius: 12,
      border: `1px solid ${c.bd}`,
      background: c.bg,
      color: c.fg,
      cursor: "pointer",
      fontWeight: 1000,
      boxShadow: kind === "blue" ? "0 12px 26px rgba(37,99,235,0.25)" : "none",
      whiteSpace: "nowrap",
    };
  };

  const inputStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: `1px solid ${THEME.inputBd}`,
    outline: "none",
    fontWeight: 900,
    color: THEME.textStrong,
    background: THEME.inputBg,
  };

  const TOP_EST = 170;
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

  return (
    <div style={pageStyle}>
      <div style={{ ...glass, padding: 16 }}>
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
            <div style={{ fontSize: 18, fontWeight: 1100, color: THEME.textStrong }}>
              🎓 Training Sessions
            </div>
            <div style={{ marginTop: 6, color: THEME.muted, fontSize: 13, fontWeight: 800 }}>
              {info || `Loaded: ${rows.length}`} {loading ? " — Loading..." : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => nav("/training/create")} style={btn("dark")}>
              ➕ New Training
            </button>
            <button
              onClick={load}
              disabled={loading}
              style={{
                ...btn("light"),
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              🔄 Refresh
            </button>
            <button onClick={() => nav("/training")} style={btn("light")}>
              ↩ Back
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search... (Branch / Module / Title / Date)"
            style={{
              flex: 1,
              minWidth: 280,
              ...inputStyle,
            }}
          />
          <Badge text={`Total: ${rows.length}`} tone="violet" />
          <Badge text={`Filtered: ${filtered.length}`} tone="blue" />
        </div>
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
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: `1px solid ${THEME.line}`,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              background: THEME.headerBg,
            }}
          >
            <div style={{ fontWeight: 1100, color: THEME.textStrong }}>📚 Library</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setRightTab("SESSIONS")}
                style={{
                  ...btn(rightTab === "SESSIONS" ? "dark" : "light"),
                  padding: "8px 10px",
                }}
              >
                Sessions
              </button>
              <button
                onClick={() => setRightTab("TREE")}
                style={{
                  ...btn(rightTab === "TREE" ? "dark" : "light"),
                  padding: "8px 10px",
                }}
              >
                Date Tree
              </button>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              height: "calc(100% - 56px)",
              overflow: "auto",
            }}
          >
            {rightTab === "SESSIONS" ? (
              <div style={{ display: "grid", gap: 10 }}>
                {loading ? (
                  <div style={{ padding: 12, color: THEME.muted, fontWeight: 900 }}>
                    Loading…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 12, color: THEME.muted, fontWeight: 900 }}>
                    No sessions found.
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
                          borderRadius: 16,
                          border: active
                            ? "1px solid rgba(99,102,241,0.70)"
                            : `1px solid ${THEME.line}`,
                          background: active
                            ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(2,6,23,0.18))"
                            : "linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.18))",
                          padding: 12,
                          cursor: "pointer",
                          boxShadow: active
                            ? "0 18px 45px rgba(99,102,241,0.18)"
                            : "0 10px 28px rgba(0,0,0,0.22)",
                          color: THEME.text,
                        }}
                        title="Open"
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontWeight: 1000, color: THEME.textStrong }}>
                            {safeTitle(r) || "Training Session"}
                          </div>
                          <Badge text={safeDate(r) || "-"} tone="blue" />
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Badge text={safeModule(r) || "Module -"} tone="violet" />
                          <Badge text={safeBranch(r) || "Branch -"} tone="gray" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {Object.keys(dateTree).length === 0 ? (
                  <div style={{ padding: 12, color: THEME.muted, fontWeight: 900 }}>
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
                            borderRadius: 16,
                            background: "rgba(2,6,23,0.22)",
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={() =>
                              setOpenYears((p) => ({ ...p, [year]: !p[year] }))
                            }
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: 12,
                              cursor: "pointer",
                              border: "none",
                              background: THEME.headerBg,
                              fontWeight: 1100,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              color: THEME.textStrong,
                            }}
                          >
                            <span>📁 {year}</span>
                            <span style={{ color: THEME.muted }}>
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
                                      borderRadius: 14,
                                      overflow: "hidden",
                                      background: "rgba(2,6,23,0.16)",
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
                                        padding: 10,
                                        cursor: "pointer",
                                        border: "none",
                                        background: "rgba(2,6,23,0.18)",
                                        fontWeight: 1000,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        color: THEME.textStrong,
                                      }}
                                    >
                                      <span>📂 {month}</span>
                                      <span style={{ color: THEME.muted }}>
                                        {isMonthOpen ? "▾" : "▸"}
                                      </span>
                                    </button>

                                    {isMonthOpen && (
                                      <div
                                        style={{
                                          padding: 10,
                                          display: "grid",
                                          gap: 8,
                                          background: "rgba(2,6,23,0.12)",
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
                                                borderRadius: 12,
                                                overflow: "hidden",
                                                background: "rgba(2,6,23,0.18)",
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
                                                  padding: 10,
                                                  cursor: "pointer",
                                                  border: "none",
                                                  background: "rgba(2,6,23,0.18)",
                                                  fontWeight: 1000,
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "center",
                                                  color: THEME.textStrong,
                                                }}
                                              >
                                                <span>📅 {day}</span>
                                                <span style={{ color: THEME.muted }}>
                                                  {list.length} {isDayOpen ? "▾" : "▸"}
                                                </span>
                                              </button>

                                              {isDayOpen && (
                                                <div
                                                  style={{
                                                    padding: 10,
                                                    display: "grid",
                                                    gap: 8,
                                                    background: "rgba(2,6,23,0.10)",
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
                                                          borderRadius: 12,
                                                          border: active
                                                            ? "1px solid rgba(99,102,241,0.70)"
                                                            : `1px solid ${THEME.line}`,
                                                          background: active
                                                            ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(2,6,23,0.18))"
                                                            : "rgba(2,6,23,0.18)",
                                                          padding: 10,
                                                          cursor: "pointer",
                                                          boxShadow: "0 10px 24px rgba(0,0,0,0.20)",
                                                          color: THEME.text,
                                                        }}
                                                      >
                                                        <div style={{ fontWeight: 1000, color: THEME.textStrong }}>
                                                          {safeTitle(r) || "Training Session"}
                                                        </div>
                                                        <div
                                                          style={{
                                                            marginTop: 6,
                                                            display: "flex",
                                                            gap: 8,
                                                            flexWrap: "wrap",
                                                          }}
                                                        >
                                                          <Badge text={safeModule(r) || "Module -"} tone="violet" />
                                                          <Badge text={safeBranch(r) || "Branch -"} tone="gray" />
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

      <div style={{ marginTop: 14, textAlign: "left", color: "rgba(226,232,240,0.85)", fontWeight: 900 }}>
        Built by Eng. Mohammed Abdullah
      </div>
    </div>
  );
}