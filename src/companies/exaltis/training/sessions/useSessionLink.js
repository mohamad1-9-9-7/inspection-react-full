// src/companies/exaltis/training/sessions/useSessionLink.js
// Training sessions — the public quiz link (token, copy, open).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { PUBLIC_ORIGIN, getId, PASS_MARK, updateReportOnServer } from "../TrainingSessionsList.helpers";
import { lookupBank, hasQuiz, makeToken, buildQuizFromBank } from "./quiz";

export function useSessionLink({ selected, setLinkBusy, liveQuizBank, moduleName, questions, sessionLevel, load }) {
  const getSessionToken = () => String(selected?.payload?.quizToken || "").trim();

  const buildSessionLink = (token) => {
    const origin = String(PUBLIC_ORIGIN || "").replace(/\/$/, "");
    if (!origin || !token) return "";
    // /t/:token opens the other company's quiz page — sweets has its own route.
    return `${origin}/sweets-training/quiz/${encodeURIComponent(token)}`;
  };

  // Returns: url string on success, null if already showed its own error, "" on silent failure
  const ensureTokenAndGetLink = async () => {
    if (!selected) return "";
    const id = getId(selected);
    if (!id) return "";

    setLinkBusy(true);
    try {
      const existingToken = getSessionToken();
      const payload0 = selected.payload || {};
      // ✅ Regenerate quiz if: no quiz yet, OR DB has fresh questions for this module
      const dbQs = lookupBank(liveQuizBank, moduleName);
      const hasDBQuestions = dbQs.length > 0;
      const needQuiz = !hasQuiz(payload0) || hasDBQuestions;

      const nextPayload = { ...payload0 };

      if (!existingToken) {
        nextPayload.quizToken = makeToken(26);
      }

      if (needQuiz) {
        if (!moduleName || !questions.length) {
          const available = Object.keys(liveQuizBank);
          const hint = available.length
            ? `\n\nModules with questions in DB: ${available.join(", ")}\nSession module: "${moduleName}"`
            : "\n\n(No question records found in DB — add questions in Training Admin first.)";
          alert(`No question bank for this module yet.\nCannot generate trainee link.${hint}`);
          return null; // ← null = already alerted, callers should NOT add another alert
        }
        nextPayload.quiz = buildQuizFromBank(moduleName, questions, PASS_MARK, sessionLevel);
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
      return null; // already alerted
    } finally {
      setLinkBusy(false);
    }
  };

  const copySessionLink = async () => {
    const url = await ensureTokenAndGetLink();
    if (url === null) return; // already showed its own error
    if (!url) return alert("Cannot generate link — missing session ID or origin.");
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
    if (url === null) return; // already showed its own error
    if (!url) return alert("Cannot open link — missing session ID or origin.");
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return { getSessionToken, buildSessionLink, copySessionLink, openSessionLink };
}
