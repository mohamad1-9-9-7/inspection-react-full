// src/companies/exaltis/cars/pages/loadingReports/useToasts.js
// Loading reports — toast messages.
// (Split out of LoadingReports.jsx — the code is unchanged.)
import { useState, useRef } from "react";

/* ====================== Toast ====================== */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const push = (text, type = "info", ttl = 3500) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  };

  const api = {
    info: (t) => push(t, "info"),
    ok: (t) => push(t, "ok"),
    err: (t) => push(t, "err", 5000),
  };

  const UI = () => (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>
      ))}
    </div>
  );

  return { UI, ...api };
}
