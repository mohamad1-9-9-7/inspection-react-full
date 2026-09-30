// src/companies/CompanyBoundary.jsx
// The wall around one company's screens. A crash inside a company module
// (a bad page, a failed chunk download) is caught HERE: that company sees a
// calm message with a retry, and nothing outside the module — the shell,
// other companies, the Platform Center — is affected.
import React from "react";

const ar = () => {
  try { return (localStorage.getItem("settings_lang") || "") === "ar"; } catch { return false; }
};

export default class CompanyBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Visible in the browser console with the module name, for support.
    console.error(`[company:${this.props.module || "?"}] screen crashed:`, error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    // Moving to another screen or company clears the wall.
    if (this.state.error && (prev.resetKey !== this.props.resetKey || prev.module !== this.props.module)) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isAr = ar();
    // A new deploy renames the code chunks; an open tab then fails to load one.
    const chunk = /Loading chunk|ChunkLoadError|dynamically imported module/i.test(String(this.state.error?.message || this.state.error));
    return (
      <div dir={isAr ? "rtl" : "ltr"} role="alert"
        style={{ margin: "24px auto", maxWidth: 560, padding: "22px 24px", borderRadius: 14, background: "#fff",
          border: "1px solid #fecaca", boxShadow: "0 14px 34px rgba(15,23,42,.08)", fontFamily: "inherit", textAlign: "center" }}>
        <div style={{ fontSize: 34, lineHeight: 1 }}>⚠️</div>
        <div style={{ fontWeight: 900, color: "#991b1b", marginTop: 10 }}>
          {chunk
            ? (isAr ? "صار في تحديث للنظام — حدّث الصفحة." : "The system was just updated — reload the page.")
            : (isAr ? "صار خطأ بهالشاشة." : "Something went wrong on this screen.")}
        </div>
        <div style={{ color: "#475569", fontWeight: 700, marginTop: 6 }}>
          {isAr ? "باقي النظام شغّال، وبياناتك محفوظة." : "The rest of the system keeps working and your data is safe."}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}
            style={{ minHeight: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "#0f766e", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
            {chunk ? (isAr ? "تحديث الصفحة" : "Reload") : (isAr ? "حاول مرة تانية" : "Try again")}
          </button>
          {this.props.onHome && (
            <button type="button" onClick={() => { this.setState({ error: null }); this.props.onHome(); }}
              style={{ minHeight: 40, padding: "0 18px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 900, cursor: "pointer" }}>
              {isAr ? "رجوع للرئيسية" : "Back to home"}
            </button>
          )}
        </div>
      </div>
    );
  }
}
