// src/pages/training/TrainingHome.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalLang } from "./TrainingSessionsList.helpers";

export default function TrainingHome() {
  const navigate = useNavigate();
  const [lang, setLang] = useGlobalLang();
  const isAr = lang === "ar";
  const tL = (en, ar) => (isAr ? ar : en);

  const pageStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #0ea5e9 0%, #7c3aed 55%, #111827 100%)",
    padding: "18px 14px",
    boxSizing: "border-box",
    direction: isAr ? "rtl" : "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  };

  const glass = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.65)",
    borderRadius: 22,
    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
    backdropFilter: "blur(12px)",
  };

  const card = (active = false) => ({
    borderRadius: 20,
    border: active ? "2px solid #6366f1" : "1px solid #e5e7eb",
    background: active ? "linear-gradient(135deg,#eef2ff,#ffffff)" : "linear-gradient(180deg,#ffffff,#f8fafc)",
    boxShadow: active ? "0 18px 45px rgba(99,102,241,0.18)" : "0 10px 28px rgba(15,23,42,0.08)",
    padding: 18,
    cursor: "pointer",
    transition: "transform 120ms ease, box-shadow 120ms ease",
    display: "grid",
    gap: 10,
    alignContent: "center",
    textAlign: "center",
    minHeight: 190,
    userSelect: "none",
  });

  const iconBox = (tone = "blue") => {
    const map = {
      blue: { bg: "linear-gradient(135deg,#06b6d4,#2563eb)", sh: "rgba(37,99,235,0.28)" },
      violet: { bg: "linear-gradient(135deg,#a78bfa,#7c3aed)", sh: "rgba(124,58,237,0.28)" },
      green: { bg: "linear-gradient(135deg,#34d399,#059669)", sh: "rgba(5,150,105,0.28)" },
      gray: { bg: "linear-gradient(135deg,#111827,#334155)", sh: "rgba(2,6,23,0.25)" },
    };
    const c = map[tone] || map.blue;
    return {
      width: 78,
      height: 78,
      borderRadius: 22,
      margin: "0 auto",
      background: c.bg,
      boxShadow: `0 14px 30px ${c.sh}`,
      display: "grid",
      placeItems: "center",
      color: "#fff",
      fontSize: 34,
      fontWeight: 1000,
    };
  };

  const title = {
    fontWeight: 1100,
    color: "#0f172a",
    fontSize: 16,
    letterSpacing: 0.2,
  };

  const sub = {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.4,
  };

  const topBtn = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    whiteSpace: "nowrap",
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ ...glass, padding: 16, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 1100, color: "#0f172a" }}>🎓 {tL("Internal Training", "التدريب الداخلي")}</div>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 13, fontWeight: 900 }}>
              {tL("Choose an action to continue.", "اختر إجراءً للمتابعة.")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setLang(isAr ? "en" : "ar")} style={topBtn}>🌐 {isAr ? "EN" : "ع"}</button>
            <button onClick={() => navigate(-1)} style={topBtn}>{tL("↩ Back", "↩ رجوع")}</button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 1200, margin: "14px auto 0", display: "grid", gap: 14 }}>
        <div style={{ ...glass, padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
              alignItems: "stretch",
            }}
          >
            {/* Create */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/training/create")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/training/create")}
              style={card(true)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              title={tL("Create a new training session", "إنشاء جلسة تدريبية جديدة")}
            >
              <div style={iconBox("blue")}>➕</div>
              <div style={title}>{tL("Create New Training", "إنشاء تدريب جديد")}</div>
              <div style={sub}>
                {tL("Create a session (branch, module, date, title) and save it online.", "أنشئ جلسة (الفرع، الوحدة، التاريخ، العنوان) واحفظها عبر الإنترنت.")}
              </div>
            </div>

            {/* Sessions */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/training/sessions")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/training/sessions")}
              style={card(false)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              title={tL("Browse training sessions", "تصفح جلسات التدريب")}
            >
              <div style={iconBox("violet")}>📚</div>
              <div style={title}>{tL("Training Library", "مكتبة التدريب")}</div>
              <div style={sub}>
                {tL("Browse sessions, add participants, run quiz, and track KPIs.", "تصفح الجلسات، أضف المشاركين، شغّل الاختبار، وتابع مؤشرات الأداء.")}
              </div>
            </div>

            {/* Annual Plan */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/training/annual-plan")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/training/annual-plan")}
              style={card(false)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              title={tL("View / edit the annual training plan per branch & month", "عرض / تعديل خطة التدريب السنوية لكل فرع وشهر")}
            >
              <div style={iconBox("green")}>📅</div>
              <div style={title}>{tL("Annual Training Plan", "الخطة السنوية للتدريب")}</div>
              <div style={sub}>
                {tL("Yearly schedule — which training is required for each branch in each month.", "الجدول السنوي — أي تدريب مطلوب لكل فرع في كل شهر.")}
              </div>
            </div>

            {/* Admin */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/training/admin")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/training/admin")}
              style={card(false)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              title={tL("Manage modules, questions, references and settings", "إدارة الوحدات والأسئلة والمراجع والإعدادات")}
            >
              <div style={iconBox("violet")}>🛠️</div>
              <div style={title}>{tL("Training Admin", "إدارة التدريب")}</div>
              <div style={sub}>
                {tL("Add/edit modules, questions, references and settings.", "أضف/عدّل الوحدات والأسئلة والمراجع والإعدادات.")}
              </div>
            </div>

            {/* Back */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(-1)}
              onKeyDown={(e) => e.key === "Enter" && navigate(-1)}
              style={card(false)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
              title={tL("Go back", "العودة للخلف")}
            >
              <div style={iconBox("gray")}>↩</div>
              <div style={title}>{tL("Back", "رجوع")}</div>
              <div style={sub}>
                {tL("Return to the previous page.", "العودة إلى الصفحة السابقة.")}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, color: "#64748b", fontSize: 13, fontWeight: 900 }}>
            {tL(
              "✅ Ready: Create Training + Online Save + Sessions Viewer (Participants, Quiz, KPIs) + Annual Plan.",
              "✅ جاهز: إنشاء تدريب + حفظ إلكتروني + عارض الجلسات (المشاركون، الاختبار، مؤشرات الأداء) + الخطة السنوية."
            )}
          </div>
        </div>

        <div style={{ textAlign: isAr ? "right" : "left", color: "rgba(255,255,255,0.9)", fontWeight: 900 }}>
          {tL("Built by Eng. Mohammed Abdullah", "تطوير: م. محمد عبدالله")}
        </div>
      </div>
    </div>
  );
}
