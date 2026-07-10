// src/pages/monitor/branches/pos19/_shared/useReportDateStatus.js
// ───────────────────────────────────────────────────────────────────────────
// "Can I save a report for this date?"
//
// The server allows exactly one report per (type, reportDate). Rather than let
// the operator fill a whole sheet and only discover the clash as an opaque
// "فشل الحفظ" on submit, every input asks this hook up front: it answers from
// the memoised date list (one tiny query per form open), drives the note shown
// beside the date field, and tells the Save button whether to stay disabled.
//
// `editing` = the form has loaded that existing record and will PUT over it,
// so a taken date is expected and must not block the button.
// ───────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { invalidateReportDates, isDateTaken } from "./reportsApi";

const NOTES = {
  checking: { text: "⏳ جارٍ التحقق من التاريخ…", tone: "muted" },
  available: { text: "✅ متاح الحفظ لهذا التاريخ", tone: "ok" },
  taken: { text: "🔒 يوجد تقرير محفوظ لهذا التاريخ — عدّله من شاشة العرض", tone: "blocked" },
  editing: { text: "📝 وضع التعديل — سيتم تحديث التقرير المحفوظ", tone: "edit" },
  error: { text: "⚠️ تعذّر التحقق من التاريخ", tone: "warn" },
};

export default function useReportDateStatus(type, reportDate, { editing = false } = {}) {
  const [phase, setPhase] = useState("checking");
  const [taken, setTaken] = useState(false);
  const reqRef = useRef(0);

  const check = useCallback(
    async ({ force = false } = {}) => {
      if (!type || !reportDate) {
        setPhase("checking");
        setTaken(false);
        return;
      }
      const myReq = ++reqRef.current;
      setPhase("checking");
      try {
        const used = await isDateTaken(type, reportDate, { force });
        if (myReq !== reqRef.current) return; // a newer date won the race
        setTaken(used);
        setPhase(used ? "taken" : "available");
      } catch {
        if (myReq !== reqRef.current) return;
        setTaken(false);
        setPhase("error");
      }
    },
    [type, reportDate]
  );

  useEffect(() => {
    check();
  }, [check]);

  /** Re-read after a write, bypassing the memoised list. */
  const refresh = useCallback(() => {
    invalidateReportDates(type);
    return check({ force: true });
  }, [check, type]);

  const resolved = editing && taken ? "editing" : phase;

  return {
    phase: resolved,
    taken,
    checking: phase === "checking",
    /** Save must stay disabled: the date is spoken for and we're not editing it. */
    blocked: taken && !editing,
    note: NOTES[resolved] || NOTES.checking,
    refresh,
  };
}
