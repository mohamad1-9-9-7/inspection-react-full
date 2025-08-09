import React from "react";

export default function QuestionsTab({ questions, setQuestions }) {
  const handleDeleteQuestion = (index) => {
    if (window.confirm("❗ هل أنت متأكد من حذف هذا السؤال؟")) {
      const updated = questions.filter((_, i) => i !== index);
      localStorage.setItem("allQuestions", JSON.stringify(updated));
      setQuestions(updated);
    }
  };

  return (
    <div style={cardStyle}>
      <h3>📚 جميع الأسئلة ({questions.length})</h3>

      {questions.length === 0 ? (
        <p>❗ لا توجد أسئلة محفوظة.</p>
      ) : (
        questions.map((q, idx) => (
          <div key={idx} style={questionStyle}>
            <strong>
              📌 {q.type} - {q.section}
            </strong>
            <p style={{ margin: "0.5rem 0" }}>{q.text}</p>
            <button
              onClick={() => handleDeleteQuestion(idx)}
              style={deleteButtonStyle}
            >
              🗑️ حذف
            </button>
          </div>
        ))
      )}
    </div>
  );
}

const cardStyle = {
  backgroundColor: "white",
  padding: "2rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const questionStyle = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "1rem",
  marginBottom: "1rem",
  backgroundColor: "#f9f9f9",
};

const deleteButtonStyle = {
  backgroundColor: "#e74c3c",
  color: "white",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
