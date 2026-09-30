// src/companies/exaltis/training/sessions/participants.js
// Training sessions — participants, details and data-quality checks.
// (Split out of TrainingSessionsList.jsx — the code is unchanged.)
import { safeModule, QUIZ_BANK } from "../TrainingSessionsList.helpers";
import { MODULE_DETAILS_BI } from "../TrainingReferenceModal";
import { hasQuiz, lookupBank } from "./quiz";

/* ===================== ✅ Participant images (Cloudinary, max 2/each) ===================== */
export const MAX_PARTICIPANT_IMAGES = 2;

export async function compressToFile(file, { maxDim = 1280, quality = 0.8 } = {}) {
  const dataURL = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataURL;
  });
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality
    );
  });
}

/* ===================== ✅ NEW: dedupe participants (EmployeeId first, then name) ===================== */
export function norm(s) {
  return String(s ?? "").trim();
}

export function participantKey(p) {
  const eid = norm(p?.employeeId);
  if (eid) return `eid:${eid}`;
  const name = norm(p?.name).toLowerCase();
  if (name) return `name:${name}`;
  return `row:${Math.random().toString(36).slice(2)}`;
}

export function cleanParticipant(p) {
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

export function dedupeParticipants(list) {
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
export function parseTrainingDetails(rawText) {
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

/* ✅ Soft pastel tones for details blocks (light, eye-comfortable) */
export const DETAIL_TONES = [
  { bd: "#bfdbfe", bg: "linear-gradient(180deg,#f4f9ff,#eaf3ff)", head: "#1e40af", body: "#fbfdff" }, // blue
  { bd: "#ddd6fe", bg: "linear-gradient(180deg,#f8f6ff,#f1eeff)", head: "#5b21b6", body: "#fcfbff" }, // violet
  { bd: "#fed7aa", bg: "linear-gradient(180deg,#fff8f1,#fff1e3)", head: "#9a3412", body: "#fffbf6" }, // orange
  { bd: "#bbf7d0", bg: "linear-gradient(180deg,#f2fcf6,#e9f9ef)", head: "#15803d", body: "#f7fdfa" }, // green
  { bd: "#fecdd3", bg: "linear-gradient(180deg,#fff5f6,#ffedef)", head: "#be123c", body: "#fffafb" }, // rose
  { bd: "#e2e8f0", bg: "linear-gradient(180deg,#f8fafc,#eef2f7)", head: "#334155", body: "#fbfcfe" }, // slate
];

/* ===================== ✅ per-session quick stats (for smart sort/filter) ===================== */
export function rowStats(r) {
  const list = Array.isArray(r?.payload?.participants) ? r.payload.participants : [];
  const valid = list.filter((p) => String(p?.name || "").trim());
  const total = valid.length;
  const pass = valid.filter(
    (p) => String(p?.result || "").toUpperCase() === "PASS"
  ).length;
  const rate = total ? Math.round((pass / total) * 100) : 0;
  return { total, pass, rate };
}

export function sessionParticipants(r, overrideList) {
  const list = Array.isArray(overrideList) ? overrideList : r?.payload?.participants;
  return Array.isArray(list) ? list : [];
}

export function namedParticipants(r, overrideList) {
  return sessionParticipants(r, overrideList).filter((p) => String(p?.name || "").trim());
}

export function missingEmployeeIdParticipants(r, overrideList) {
  return namedParticipants(r, overrideList).filter((p) => !String(p?.employeeId || "").trim());
}

export function hasAnyQuestionSource(r, bank) {
  if (hasQuiz(r?.payload)) return true;
  const moduleName = safeModule(r);
  const live = lookupBank(bank, moduleName);
  if (live.length) return true;
  return lookupBank(QUIZ_BANK, moduleName).length > 0;
}

export function dataQualityIssuesForSession(r, bank, participantOverride) {
  if (!r) return [];
  const issues = [];
  const valid = namedParticipants(r, participantOverride);
  const missingIds = missingEmployeeIdParticipants(r, participantOverride);

  if (!hasAnyQuestionSource(r, bank)) {
    issues.push({
      key: "no_questions",
      label: "No Questions",
      detail: "Training has no question bank.",
      tone: "red",
    });
  }
  if (!valid.length) {
    issues.push({
      key: "no_participants",
      label: "No Participants",
      detail: "Session has no participants.",
      tone: "amber",
    });
  }
  if (missingIds.length) {
    issues.push({
      key: "missing_employee_id",
      label: `${missingIds.length} Missing ID`,
      detail: "Participant(s) missing Employee ID.",
      tone: "amber",
    });
  }
  return issues;
}

export function issueTone(issue) {
  if (issue?.tone === "red") {
    return { bg: "#fef2f2", bd: "#fecaca", fg: "#991b1b" };
  }
  return { bg: "#fffbeb", bd: "#fde68a", fg: "#92400e" };
}

/* ===================== Constants ===================== */
export const TOTAL_MODULES = Object.keys(MODULE_DETAILS_BI).filter((k) => k !== '__DEFAULT__').length; // مشتق من المرجع حتى لا يتخلّف عن عدد الوحدات
