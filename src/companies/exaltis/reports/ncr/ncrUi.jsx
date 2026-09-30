// src/companies/exaltis/reports/ncr/ncrUi.jsx
// Non-conformance entry — card, field and pill.
// (Split out of NonConformanceReportInput.jsx — the code is unchanged.)

/* =========================
   Small building blocks
========================= */
export function Card({ n, en, ar, badge, badgeCalm, locked, children }) {
  return (
    <section className={`ncr-card${locked ? " is-locked" : ""}`}>
      <header className="ncr-card-head">
        <div className="ncr-num">{n}</div>
        <div className="ncr-card-title">
          {en}
          <small>{ar}</small>
        </div>
        {badge ? <div className={`ncr-badge${badgeCalm ? " calm" : ""}`}>{badge}</div> : null}
      </header>
      <div className="ncr-card-body">{children}</div>
    </section>
  );
}

export function Field({ en, ar, required, hint, missing, span2, children }) {
  return (
    <label className={`ncr-f${span2 ? " span2" : ""}${missing ? " is-missing" : ""}`}>
      <div className="ncr-lbl">
        {en} {required ? <b>*</b> : null} <span>— {ar}</span>
      </div>
      {children}
      {hint ? <div className="ncr-hint">{hint}</div> : null}
    </label>
  );
}

export function Pill({ on, tone, onClick, type = "checkbox", en, ar }) {
  return (
    <label className={`ncr-pill${tone ? ` ${tone}` : ""}`} data-on={on ? "1" : "0"}>
      <input type={type} checked={!!on} onChange={onClick} />
      <span>
        {en} {ar ? <small>{ar}</small> : null}
      </span>
    </label>
  );
}
