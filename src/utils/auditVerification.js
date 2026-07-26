// auditVerification.js
// The QA verification cycle for internal-audit findings, shared by the QA
// review screen, the public branch portal and the e-mail builder so all three
// agree on what a finding's state actually is.
//
// Lifecycle of one finding:
//
//   Open ──(branch presses "Send Evidence")──▶ Pending QA Verification
//                                                │
//                        QA accepts ─────────────┤────────── QA rejects
//                             ▼                              ▼
//                          Closed                      Open (+ reason)
//                                                     branch can upload again
//
// "Pending QA Verification" is deliberately NOT "Closed": closure rate must
// only count findings a human actually verified.

export const PENDING_VERIFICATION_STATUS = "Pending QA Verification";

export function isClosedStatus(v) {
  return /^\s*closed\s*$/i.test(String(v ?? ""));
}

export function isPendingVerificationStatus(v) {
  return /pending\s*qa/i.test(String(v ?? ""));
}

/**
 * Normalised verdict for one table row.
 * state: "pending" | "accepted" | "rejected" | "" (nothing recorded yet)
 *
 * Rows written before this feature existed have no `verification` object, so
 * the status text is used as a fallback — otherwise every historical finding
 * would look like it was never submitted.
 */
export function getRowVerification(row) {
  const raw = row?.verification && typeof row.verification === "object" ? row.verification : null;
  const recorded = String(raw?.state || "").toLowerCase();
  const detail = {
    by: String(raw?.by || ""),
    at: raw?.at || null,
    reason: String(raw?.reason || ""),
  };

  /* `status` is the authority, `verification` only explains it. QA can always
     override a finding by hand in the review screen, and when they do the
     recorded verdict must not contradict the column everyone reads. */
  if (isClosedStatus(row?.status)) {
    return recorded === "accepted"
      ? { state: "accepted", ...detail }
      : { state: "accepted", by: "", at: null, reason: "" };
  }

  if (recorded === "pending" || recorded === "rejected") {
    return { state: recorded, ...detail };
  }
  /* Accepted but no longer closed = QA reopened it by hand; it needs work again. */
  if (recorded === "accepted") {
    return { state: "", by: "", at: null, reason: "" };
  }
  if (isPendingVerificationStatus(row?.status)) {
    return { state: "pending", by: "", at: null, reason: "" };
  }
  return { state: "", by: "", at: null, reason: "" };
}

/** The branch still has work to do on this finding. */
export function needsBranchAction(row) {
  if (isClosedStatus(row?.status)) return false;
  const { state } = getRowVerification(row);
  return state !== "pending" && state !== "accepted";
}

/** Evidence is in and QA owes the branch a verdict. */
export function isAwaitingQa(row) {
  if (isClosedStatus(row?.status)) return false;
  return getRowVerification(row).state === "pending";
}

export function countAwaitingQa(table = []) {
  return (Array.isArray(table) ? table : []).filter(isAwaitingQa).length;
}

/** Patch that closes a finding after QA checked the evidence. */
export function acceptRowPatch(by = "") {
  return {
    status: "Closed",
    verification: { state: "accepted", by: String(by || ""), at: new Date().toISOString(), reason: "" },
  };
}

/** Patch that sends a finding back to the branch. Reason is mandatory —
    a rejection without one just restarts the same argument. */
export function rejectRowPatch(by = "", reason = "") {
  return {
    status: "Open",
    verification: {
      state: "rejected",
      by: String(by || ""),
      at: new Date().toISOString(),
      reason: String(reason || "").trim(),
    },
  };
}

/** Whoever is signed in on this browser, for the audit trail on a verdict. */
export function currentUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return String(u.username || u.name || "").trim();
  } catch {
    return "";
  }
}

const VERDICT_TONE = {
  pending:  { bg: "#dbeafe", color: "#1d4ed8", label: "Pending QA Verification", labelAr: "بانتظار تحقق الجودة" },
  accepted: { bg: "#dcfce7", color: "#166534", label: "Verified & Closed",       labelAr: "تم التحقق والإغلاق" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected — resubmit",     labelAr: "مرفوض — أعد الإرسال" },
};

export function verificationTone(state) {
  return VERDICT_TONE[state] || null;
}
