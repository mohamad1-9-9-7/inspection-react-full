// src/companies/exaltis/training/admin/adminModel.js
// Training admin — question/reference models, themes and colours.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { QUIZ_BANK } from "../TrainingSessionsList.helpers";
import { QUESTION_BANK as CANON_QB } from "../TrainingSessionCreate";

/* ===================== Normalizer ===================== */
export function normalizeCanonQuestions(mod) {
  // QUIZ_BANK is the bank the trainee quiz actually reads: richer (15 per module)
  // and already tagged Easy/Medium/Hard, so prefer it over the session-sheet bank.
  // Without this, a module present only in QUIZ_BANK shows "0 questions" here while
  // its quiz works — and the first question saved would then shadow all 15.
  const quiz = QUIZ_BANK[mod];
  if (Array.isArray(quiz) && quiz.length) {
    return quiz.map((q) => ({
      q_en: q.q_en || "", q_ar: q.q_ar || "",
      options_en: q.options_en || ["", "", ""], options_ar: q.options_ar || ["", "", ""],
      correct: typeof q.correct === "number" ? q.correct : 0,
      difficulty: q.difficulty || "Medium",
      tags: [],
    }));
  }
  const pack = CANON_QB[mod];
  if (!pack) return [];
  const en = pack.en || [], ar = pack.ar || [];
  const max = Math.max(en.length, ar.length);
  const out = [];
  for (let i = 0; i < max; i++) {
    const e = en[i] || {}, a = ar[i] || {};
    out.push({
      q_en: e.q || "", q_ar: a.q || "",
      options_en: e.options || ["", "", ""], options_ar: a.options || ["", "", ""],
      correct: typeof e.correct === "number" ? e.correct : (typeof a.correct === "number" ? a.correct : 0),
    });
  }
  return out;
}

export function blankQuestion() {
  return { q_en: "", q_ar: "", options_en: ["", "", ""], options_ar: ["", "", ""], correct: 0, difficulty: "Medium", tags: [] };
}

export function blankRef() {
  return { title: "", module: "", refType: "Link", url: "", description: "", content: "", tags: [], isBuiltIn: false };
}

export function blankModuleMeta() {
  return { icon: "📋", color: "indigo", description: "", createdAt: new Date().toISOString().slice(0, 10) };
}

/* ===================== Themes ===================== */
export const THEMES = {
  light: {
    pageBg: "linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)",
    sidebarBg: "linear-gradient(180deg,#123a49 0%,#0f766e 70%,#0f172a 100%)",
    sidebarText: "#e2e8f0", sidebarTextActive: "#fff",
    sidebarItemActive: "linear-gradient(135deg,#0f766e,#2aa8c4)",
    cardBg: "#ffffff", cardBorder: "#dbe4e2", cardShadow: "0 12px 30px rgba(15,23,42,.06)",
    text: "#0f172a", textMuted: "#64748b", textSubtle: "#94a3b8",
    accent: "#0f766e", success: "#059669", danger: "#dc2626", warning: "#d97706",
    inputBg: "#ffffff", inputBorder: "#dbe4e2", sectionBg: "#f4f8f7", chip: "#edf5f3",
  },
  dark: {
    pageBg: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",
    sidebarBg: "linear-gradient(180deg,#020617,#0f172a)",
    sidebarText: "#cbd5e1", sidebarTextActive: "#fff",
    sidebarItemActive: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    cardBg: "#1e293b", cardBorder: "#334155", cardShadow: "0 4px 20px rgba(0,0,0,0.4)",
    text: "#f1f5f9", textMuted: "#94a3b8", textSubtle: "#64748b",
    accent: "#818cf8", success: "#10b981", danger: "#f87171", warning: "#fbbf24",
    inputBg: "#0f172a", inputBorder: "#334155", sectionBg: "#0f172a", chip: "#334155",
  },
};

export const ICONS = ["📋","🧼","📦","🥩","🌡️","🎯","🚨","🚷","⚗️","🐛","🗑️","🦺","🔪","🏋️","🔥","🚑","🛢️","💻","📊","📈","📝","🎓","⚙️","🔬","🧪","🧯","💧","🍳","🧊","☕"];

export const COLORS = {
  indigo:{bg:"#eef2ff",fg:"#4338ca",border:"#c7d2fe",solid:"#6366f1"},
  violet:{bg:"#f5f3ff",fg:"#6d28d9",border:"#ddd6fe",solid:"#8b5cf6"},
  pink:{bg:"#fdf2f8",fg:"#be185d",border:"#fbcfe8",solid:"#ec4899"},
  rose:{bg:"#fff1f2",fg:"#be123c",border:"#fecdd3",solid:"#f43f5e"},
  red:{bg:"#fef2f2",fg:"#b91c1c",border:"#fecaca",solid:"#ef4444"},
  orange:{bg:"#fff7ed",fg:"#c2410c",border:"#fed7aa",solid:"#f97316"},
  amber:{bg:"#fffbeb",fg:"#b45309",border:"#fde68a",solid:"#f59e0b"},
  lime:{bg:"#f7fee7",fg:"#4d7c0f",border:"#d9f99d",solid:"#84cc16"},
  emerald:{bg:"#ecfdf5",fg:"#047857",border:"#a7f3d0",solid:"#10b981"},
  teal:{bg:"#f0fdfa",fg:"#0f766e",border:"#99f6e4",solid:"#14b8a6"},
  cyan:{bg:"#ecfeff",fg:"#0e7490",border:"#a5f3fc",solid:"#06b6d4"},
  sky:{bg:"#f0f9ff",fg:"#0369a1",border:"#bae6fd",solid:"#0ea5e9"},
  blue:{bg:"#eff6ff",fg:"#1d4ed8",border:"#bfdbfe",solid:"#3b82f6"},
};

export const COLOR_KEYS = Object.keys(COLORS);

export const REF_TYPES = ["Link", "PDF", "Video", "SOP", "Policy", "Standard", "Document", "Other"];

export const REF_TYPE_ICONS = { Link:"🔗", PDF:"📄", Video:"🎬", SOP:"📘", Policy:"📜", Standard:"📐", Document:"📑", Other:"📌" };

export const DIFFICULTY = ["Easy", "Medium", "Hard"];

export const DIFF_COLORS = { Easy:"emerald", Medium:"amber", Hard:"rose" };

export const DIFFICULTY_LABEL = {
  en: { Easy: "Easy", Medium: "Medium", Hard: "Hard" },
  ar: { Easy: "سهل", Medium: "متوسط", Hard: "صعب" },
};

export function countQuestions(rec) { return rec?.payload?.questions?.length || 0; }

export function isQuestionComplete(q) {
  return Boolean((q.q_en || q.q_ar) && (q.options_en || []).filter(Boolean).length >= 2 && typeof q.correct === "number");
}
