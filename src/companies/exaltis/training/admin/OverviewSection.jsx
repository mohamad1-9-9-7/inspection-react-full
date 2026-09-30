// src/companies/exaltis/training/admin/OverviewSection.jsx
// Training admin — overview tab.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { getModuleName } from "../TrainingSessionsList.helpers";
import { COLORS } from "./adminModel";
import { btnStyle, cardStyle } from "./adminUi";

/* ===================== OVERVIEW ===================== */
export function OverviewSection({ T, theme, tt, isAr, lang, modules, modulesWithStats, totalQuestions, references, sessionsCount, activity, onJump }) {
  const top5 = [...modulesWithStats].sort((a, b) => b.qCount - a.qCount).slice(0, 6);
  const maxQ = Math.max(...modulesWithStats.map((m) => m.qCount), 1);
  const kpis = [
    { key: "modules", value: modules.length, icon: "📋", color: "indigo", label: tt("nav_modules"), onClick: () => onJump("modules") },
    { key: "questions", value: totalQuestions, icon: "❓", color: "violet", label: tt("nav_questions"), onClick: () => onJump("questions") },
    { key: "references", value: references.length, icon: "📎", color: "emerald", label: tt("nav_references"), onClick: () => onJump("references") },
    { key: "sessions", value: sessionsCount, icon: "🎓", color: "amber", label: tt("nav_sessions"), onClick: () => {} },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {kpis.map((k) => {
          const c = COLORS[k.color];
          return (
            <div key={k.key} onClick={k.onClick} style={{ ...cardStyle(theme, true), padding: 18, background: `linear-gradient(135deg, ${c.bg}, ${T.cardBg})`, borderColor: c.border, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 900 }}>{k.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 1000, color: c.fg, lineHeight: 1.1, marginTop: 4 }}>{k.value}</div>
                </div>
                <div style={{ fontSize: 32 }}>{k.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div style={{ ...cardStyle(theme), padding: 18 }}>
          <div style={{ fontWeight: 1000, marginBottom: 14, fontSize: 15 }}>{tt("overview_top_modules")}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {top5.map((m) => {
              const c = COLORS[m.color] || COLORS.indigo;
              const pct = (m.qCount / maxQ) * 100;
              return (
                <div key={m.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900, marginBottom: 4 }}>
                    <span>{m.icon} {getModuleName(m.name, lang)}</span>
                    <span style={{ color: c.fg }}>{m.qCount}</span>
                  </div>
                  <div style={{ background: T.chip, borderRadius: 99, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${c.solid}, ${c.solid}cc)`, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...cardStyle(theme), padding: 18 }}>
          <div style={{ fontWeight: 1000, marginBottom: 14, fontSize: 15 }}>{tt("overview_quick_actions")}</div>
          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={() => onJump("modules")} style={{ ...btnStyle(theme, "primary"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_add_module")}</button>
            <button onClick={() => onJump("questions")} style={{ ...btnStyle(theme, "ghost"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_add_question")}</button>
            <button onClick={() => onJump("references")} style={{ ...btnStyle(theme, "ghost"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_add_reference")}</button>
            <button onClick={() => onJump("backup")} style={{ ...btnStyle(theme, "ghost"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_backup_data")}</button>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 1000, fontSize: 15 }}>{tt("overview_recent_activity")}</div>
          {activity.length > 0 && <button onClick={() => onJump("activity")} style={btnStyle(theme, "subtle")}>{tt("view_all")}</button>}
        </div>
        {activity.length === 0 ? (
          <div style={{ color: T.textSubtle, textAlign: "center", padding: 20, fontWeight: 800 }}>{tt("no_activity")}</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: T.sectionBg, borderRadius: 8, fontSize: 12 }}>
                <span style={{ fontWeight: 900 }}>{a.action} <span style={{ color: T.textMuted }}>{a.target}</span></span>
                <span style={{ color: T.textSubtle }}>{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
