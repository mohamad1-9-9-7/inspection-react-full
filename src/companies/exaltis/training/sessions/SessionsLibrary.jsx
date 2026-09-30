// src/companies/exaltis/training/sessions/SessionsLibrary.jsx
// Training sessions — the library panel (sessions list / date tree).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { SessionsList } from "./SessionsList";
import { SessionsDateTree } from "./SessionsDateTree";

export function SessionsLibrary({ rightPanelHeight, glass, THEME, setRightTab, rightTab, loading, visible, activeFilterCount, selected, openSession, globalLang, liveQuizBank, dateTree, openYears, setOpenYears, openMonths, setOpenMonths, openDays, setOpenDays }) {
  return (
    <div
      style={{
        width: 460,
        minWidth: 380,
        maxWidth: 520,
        position: "sticky",
        top: 14,
        height: rightPanelHeight,
        overflow: "hidden",
        ...glass,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${THEME.headerLine}`,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          background: THEME.headerBg,
          color: THEME.headerText,
        }}
      >
        <div style={{ fontWeight: 1000, fontSize: 14, letterSpacing: 0.3 }}>📚 Library</div>
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.6)",
          border: `1px solid ${THEME.headerLine}`,
          borderRadius: 10,
          padding: 3,
          gap: 2,
        }}>
          <button
            onClick={() => setRightTab("SESSIONS")}
            style={{
              border: "none",
              background: rightTab === "SESSIONS" ? "#fff" : "transparent",
              color: rightTab === "SESSIONS" ? "#1e3a8a" : THEME.headerSub,
              boxShadow: rightTab === "SESSIONS" ? "0 1px 3px rgba(30,58,138,0.18)" : "none",
              fontWeight: 1000,
              fontSize: 11,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              letterSpacing: 0.3,
              transition: "all .12s",
            }}
          >
            Sessions
          </button>
          <button
            onClick={() => setRightTab("TREE")}
            style={{
              border: "none",
              background: rightTab === "TREE" ? "#fff" : "transparent",
              color: rightTab === "TREE" ? "#1e3a8a" : THEME.headerSub,
              boxShadow: rightTab === "TREE" ? "0 1px 3px rgba(30,58,138,0.18)" : "none",
              fontWeight: 1000,
              fontSize: 11,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              letterSpacing: 0.3,
              transition: "all .12s",
            }}
          >
            Date Tree
          </button>
        </div>
      </div>

      <div
        style={{
          padding: 12,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          background: "#f8fafc",
        }}
      >
        {rightTab === "SESSIONS" ? (
          <SessionsList loading={loading} THEME={THEME} visible={visible} activeFilterCount={activeFilterCount} selected={selected} openSession={openSession} globalLang={globalLang} liveQuizBank={liveQuizBank} />
        ) : (
          <SessionsDateTree dateTree={dateTree} THEME={THEME} openYears={openYears} setOpenYears={setOpenYears} openMonths={openMonths} setOpenMonths={setOpenMonths} openDays={openDays} setOpenDays={setOpenDays} selected={selected} openSession={openSession} globalLang={globalLang} />
        )}
      </div>
    </div>
  );
}
