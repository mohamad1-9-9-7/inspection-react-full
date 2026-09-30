// src/companies/exaltis/training/sessions/quiz.js
// Training sessions — quiz tokens and question picking.
// (Split out of TrainingSessionsList.jsx — the code is unchanged.)

/* ===================== Small utils (no helpers edits needed) ===================== */
export function makeToken(len = 22) {
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
export function hasQuiz(payload) {
  const q = payload?.quiz || payload?.quizData || payload?.trainingQuiz || null;
  const qs = Array.isArray(q?.questions)
    ? q.questions
    : Array.isArray(payload?.questions)
    ? payload.questions
    : [];
  return Array.isArray(qs) && qs.length > 0;
}

// ✅ Normalize module name for case-insensitive / trimmed lookup
export function normMod(s) { return String(s || "").trim().toLowerCase(); }

// ✅ Look up questions in any bank using exact match then case-insensitive fallback
export function lookupBank(bank, moduleName) {
  if (!moduleName || !bank) return [];
  // 1. Exact match
  if (Array.isArray(bank[moduleName]) && bank[moduleName].length) return bank[moduleName];
  // 2. Case-insensitive match
  const key = normMod(moduleName);
  const found = Object.keys(bank).find((k) => normMod(k) === key);
  return (found && Array.isArray(bank[found]) && bank[found].length) ? bank[found] : [];
}

export function buildQuizFromBank(moduleName, questions, passMark, level = "") {
  const safeQ = Array.isArray(questions) ? questions : [];
  return {
    module: String(moduleName || "").trim(),
    level: String(level || "").trim(), // ✅ NEW: level/difficulty this quiz targets
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

/* ✅ NEW: pick up to `count` questions for a given level (difficulty).
   - level "" → return all (no level chosen → backward compatible)
   - else → questions whose `difficulty` matches the level; if fewer than
     `count` exist it fills from the rest so the quiz still reaches `count`.
   Each level needs its own 5 tagged questions in Training Admin to be fully distinct. */
export function pickLevelQuestions(all, level, count = 5) {
  const arr = Array.isArray(all) ? all : [];
  const lvl = String(level || "").trim().toLowerCase();
  if (!lvl) return arr;
  const chosen = arr
    .filter((q) => String(q?.difficulty || "").trim().toLowerCase() === lvl)
    .slice(0, count);
  if (chosen.length < count) {
    for (const q of arr) {
      if (chosen.length >= count) break;
      if (!chosen.includes(q)) chosen.push(q);
    }
  }
  return chosen;
}
