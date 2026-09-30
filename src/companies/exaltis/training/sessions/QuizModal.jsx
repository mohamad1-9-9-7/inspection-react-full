// src/companies/exaltis/training/sessions/QuizModal.jsx
// Training sessions — manual quiz entry for a participant (admin).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { Modal, Badge, PASS_MARK } from "../TrainingSessionsList.helpers";

export function QuizModal({ quizOpen, activeParticipant, moduleName, quizSaving, closeQuiz, btn, submitQuiz, questions, setQuizLang, quizLang, surface, THEME, quizAnswers, setQuizAnswers }) {
  return (
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
        <div style={{ color: "#b91c1c", fontWeight: 1000 }}>
          No question bank for this module yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {questions.map((qq, i) => {
            const qText = quizLang === "AR" ? (qq.q_ar || qq.q_en) : (qq.q_en || qq.q_ar);
            const opts = quizLang === "AR"
              ? (qq.options_ar?.length ? qq.options_ar : (qq.options_en || []))
              : (qq.options_en?.length ? qq.options_en : (qq.options_ar || []));

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
                            checked ? "#818cf8" : THEME.line
                          }`,
                          cursor: "pointer",
                          background: checked ? "#eef2ff" : "#f8fafc",
                          fontWeight: 700,
                          color: THEME.textStrong,
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
  );
}
