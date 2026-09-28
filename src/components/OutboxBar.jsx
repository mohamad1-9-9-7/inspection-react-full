// src/components/OutboxBar.jsx
// The one place a user sees saves that are waiting on this device for a
// connection (utils/offlineOutbox.js). Mounted once in App.jsx; renders
// nothing while the outbox is empty.

import React, { useEffect, useRef, useState } from "react";
import { discardEntry, flushOutbox, retryFailed, startOutbox, subscribeOutbox } from "../utils/offlineOutbox";

const lang = () => {
  try { return localStorage.getItem("settings_lang") === "ar" ? "ar" : "en"; } catch { return "en"; }
};

const T = {
  en: {
    waiting: (n) => `${n} saved ${n === 1 ? "sheet is" : "sheets are"} on this device, waiting for the connection`,
    sending: "Sending saved sheets…",
    sent: (n) => `${n} saved ${n === 1 ? "sheet was" : "sheets were"} sent`,
    sendNow: "Send now",
    failed: (n) => `${n} ${n === 1 ? "sheet" : "sheets"} could not be sent`,
    retry: "Try again",
    details: "Details",
    discard: "Discard",
    confirmDiscard: (l) => `Discard "${l}"? This sheet was never saved on the server and will be lost.`,
  },
  ar: {
    waiting: (n) => (n === 1 ? "تقرير واحد محفوظ على هذا الجهاز بانتظار الاتصال" : `${n} تقارير محفوظة على هذا الجهاز بانتظار الاتصال`),
    sending: "جارٍ إرسال التقارير المحفوظة…",
    sent: (n) => (n === 1 ? "تم إرسال التقرير المحفوظ" : `تم إرسال ${n} تقارير محفوظة`),
    sendNow: "أرسل الآن",
    failed: (n) => (n === 1 ? "تعذّر إرسال تقرير واحد" : `تعذّر إرسال ${n} تقارير`),
    retry: "أعد المحاولة",
    details: "التفاصيل",
    discard: "تجاهل",
    confirmDiscard: (l) => `تجاهل «${l}»؟ لم يُحفظ هذا التقرير على الخادم وسيضيع.`,
  },
};

export default function OutboxBar() {
  const [s, setS] = useState({ pending: [], failed: [], flushing: false });
  const [sent, setSent] = useState(0);
  const [open, setOpen] = useState(false);
  const prev = useRef({ total: 0, flushing: false });

  useEffect(() => {
    startOutbox();
    return subscribeOutbox((next) => {
      // Only a finished send counts as delivery; a discard or a new failure
      // also shrinks the list, and neither was delivered.
      const total = next.pending.length + next.failed.length;
      if (prev.current.flushing && !next.flushing && prev.current.total > total) setSent(prev.current.total - total);
      prev.current = { total, flushing: next.flushing };
      setS(next);
    });
  }, []);

  useEffect(() => {
    if (!sent) return undefined;
    const t = setTimeout(() => setSent(0), 4000);
    return () => clearTimeout(t);
  }, [sent]);

  const t = T[lang()];
  const dir = lang() === "ar" ? "rtl" : "ltr";
  const nPending = s.pending.length;
  const nFailed = s.failed.length;
  if (!nPending && !nFailed && !sent) return null;

  if (!nPending && !nFailed) {
    return <div role="status" dir={dir} style={{ ...S.bar, ...S.ok }}>✅ {t.sent(sent)}</div>;
  }

  return (
    <div role="status" aria-live="polite" dir={dir} style={{ ...S.bar, ...(nFailed ? S.bad : S.wait) }}>
      {nPending > 0 && (
        <div style={S.line}>
          <span>{s.flushing ? `⬆️ ${t.sending}` : `📴 ${t.waiting(nPending)}`}</span>
          {!s.flushing && <button type="button" style={S.btn} onClick={() => flushOutbox()}>{t.sendNow}</button>}
        </div>
      )}
      {nFailed > 0 && (
        <>
          <div style={S.line}>
            <span>⚠️ {t.failed(nFailed)}</span>
            <button type="button" style={S.btn} onClick={() => setOpen((o) => !o)}>{t.details}</button>
            <button type="button" style={S.btn} onClick={() => retryFailed()}>{t.retry}</button>
          </div>
          {open && s.failed.map((e) => (
            <div key={e.id} style={S.item}>
              <b>{e.label || e.key}</b>
              <span style={{ opacity: 0.85 }}>{e.error}</span>
              <button
                type="button"
                style={S.btnGhost}
                onClick={() => { if (window.confirm(t.confirmDiscard(e.label || e.key))) discardEntry(e.id); }}
              >
                {t.discard}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const S = {
  bar: {
    position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
    maxWidth: "min(640px, calc(100vw - 24px))", width: "max-content",
    padding: "10px 14px", borderRadius: 14, boxShadow: "0 12px 30px rgba(15,23,42,.25)",
    fontWeight: 700, display: "grid", gap: 8,
  },
  wait: { background: "#fffbeb", color: "#78350f", border: "1.5px solid #fbbf24" },
  bad: { background: "#fef2f2", color: "#7f1d1d", border: "1.5px solid #f87171" },
  ok: { background: "#ecfdf5", color: "#065f46", border: "1.5px solid #34d399" },
  line: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  item: { display: "grid", gap: 4, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,.7)" },
  btn: { border: "1px solid currentColor", background: "#fff", color: "inherit", borderRadius: 10, padding: "4px 12px", fontWeight: 800, cursor: "pointer" },
  btnGhost: { justifySelf: "start", border: 0, background: "transparent", color: "#b91c1c", textDecoration: "underline", fontWeight: 700, cursor: "pointer", padding: 0 },
};
