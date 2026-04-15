import React from "react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";

export default function QuestionsTab({ questions, setQuestions }) {
  const handleDeleteQuestion = (index) => {
    if (!window.confirm("❗ هل أنت متأكد من حذف هذا السؤال؟")) return;
    const updated = questions.filter((_, i) => i !== index);
    localStorage.setItem("allQuestions", JSON.stringify(updated));
    setQuestions(updated);
  };

  return (
    <div>
      {/* هيدر */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
          📚 جميع الأسئلة
        </h3>
        <span className="qms-badge qms-badge-info">{questions.length} سؤال</span>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon="❓" message="لا توجد أسئلة محفوظة" sub="أضف أسئلة من صفحة التفتيش" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {questions.map((q, idx) => (
            <div
              key={idx}
              className="qms-card qms-card-sm"
              style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
                  {q.type && <span className="qms-badge qms-badge-info">{q.type}</span>}
                  {q.section && <span className="qms-badge qms-badge-info" style={{ background: "#ede9fe", color: "#5b21b6" }}>{q.section}</span>}
                </div>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-primary)", margin: 0, lineHeight: 1.6 }}>
                  {q.text}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => handleDeleteQuestion(idx)}>
                🗑️
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
