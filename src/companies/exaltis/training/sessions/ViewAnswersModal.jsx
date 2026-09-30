// src/companies/exaltis/training/sessions/ViewAnswersModal.jsx
// Training sessions — a participant's quiz answers.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { Modal, Badge } from "../TrainingSessionsList.helpers";

export function ViewAnswersModal({ viewOpen, viewParticipant, moduleName, closeAnswers, btn, setViewLang, viewLang, surface, THEME }) {
  return (
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
        <div style={{ color: "#b91c1c", fontWeight: 1000 }}>No saved answers.</div>
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
              const qText = viewLang === "AR" ? (a.q_ar || a.q_en) : (a.q_en || a.q_ar);
              const opts = viewLang === "AR"
                ? (a.options_ar?.length ? a.options_ar : (a.options_en || []))
                : (a.options_en?.length ? a.options_en : (a.options_ar || []));

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
                      let bg = "#f8fafc";
                      if (isCorrect) {
                        border = "#bbf7d0";
                        bg = "#f0fdf4";
                      }
                      if (isChosen && !isCorrect) {
                        border = "#fecaca";
                        bg = "#fef2f2";
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
  );
}
