// src/companies/exaltis/training/sessions/useSessionQuiz.js
// Training sessions — the manual quiz (start, answers, submit).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { PASS_MARK, renumberParticipants, todayISO, getId, updateReportOnServer } from "../TrainingSessionsList.helpers";
import { dedupeParticipants } from "./participants";

export function useSessionQuiz({ selected, participants, moduleName, questions, setQuizIndex, setQuizAnswers, setQuizLang, setQuizOpen, setViewIndex, setViewLang, setViewOpen, quizIndex, quizAnswers, setQuizSaving, setParticipants, load }) {
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
  return { startQuiz, closeQuiz, openAnswers, closeAnswers, submitQuiz };
}
