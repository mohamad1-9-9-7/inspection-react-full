// src/pages/haccp and iso/Calibration/CalibrationExpiryBadge.jsx
// The calibration expiry date of one storage unit, shown beside the unit on
// the temperature sheets (QCS, POS 10/11/15/19) and the QR phone page.
// Only the expiry date is shown — the full record lives in the Calibration Log.

import React, { useEffect, useState } from "react";
import { calibrationForUnit, expiryStatus, fetchCalibrations, fmtDay } from "./calibrationLink";

/** Calibration records, fetched once per page; null while loading. */
export function useCalibrations() {
  const [list, setList] = useState(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchCalibrations(ctrl.signal).then((l) => { if (!ctrl.signal.aborted) setList(l); });
    return () => ctrl.abort();
  }, []);
  return list;
}

const TONE = {
  ok:      { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0", icon: "🎯" },
  soon:    { bg: "#fff7ed", fg: "#b45309", bd: "#fed7aa", icon: "⏳" },
  expired: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca", icon: "⛔" },
  none:    { bg: "#f8fafc", fg: "#64748b", bd: "#e2e8f0", icon: "🎯" },
};

/**
 * records:  from useCalibrations() (null → renders nothing yet)
 * branch:   calibration branch name ("Al Qusais Warehouse", "Abu Dhabi Butchery", …)
 * log:      temperature log id (calibrationLink CALIB_LOGS[branch].log)
 * unitKey:  QCS slot ("cooler-3") or the unit's row name on POS sheets
 * label:    the unit's displayed name (fallback match for old records)
 */
export default function CalibrationExpiryBadge({ records, branch, log, unitKey, label, lang = "en", hideWhenNone = false, style }) {
  if (!records) return null;
  const st = expiryStatus(calibrationForUnit(records, { branch, log, unitKey, label }));
  if (hideWhenNone && st.state === "none") return null;
  const ar = lang === "ar";
  const tone = TONE[st.state];
  const date = fmtDay(st.date);
  const text =
    st.state === "none" ? (ar ? "المعايرة: غير مسجلة" : "Calibration: not recorded")
    : st.failed ? (ar ? "المعايرة فاشلة — خارج الخدمة" : "Calibration failed — out of service")
    : st.state === "expired" ? (ar ? `انتهت المعايرة ${date}` : `Calibration expired ${date}`)
    : (ar ? `المعايرة سارية حتى ${date}` : `Calibration valid until ${date}`);
  return (
    <span
      dir={ar ? "rtl" : "ltr"}
      title={st.state === "soon" ? (ar ? `باقي ${st.days} يوم` : `${st.days} day(s) left`) : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999,
        fontWeight: 700, whiteSpace: "nowrap", background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}`,
        ...style,
      }}
    >
      {tone.icon} {text}
    </span>
  );
}
