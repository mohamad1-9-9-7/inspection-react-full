// src/pages/monitor/branches/_shared/branchSupervisor.jsx
// ───────────────────────────────────────────────────────────────────────────
// "Checked By (Branch Supervisor – PIC)" the FTR 1 way, for every branch:
//   employee number → locked name (Staff Directory, then the company record),
//   the number suggestions list that branch's own people first, and a person
//   from another branch is flagged (and confirmed on save) — each sheet belongs
//   to one branch.
//   "Verified by (QA)" is pre-filled with the QA owner, still editable.
//
//   const sup = useBranchSupervisor("POS 10");
//   errors:  sup.errors          payload: { ...sup.fields() }
//   reopen:  sup.load(payload)   UI:      <SupervisorBlock sup={sup} />
//   before saving: if (!sup.confirmOtherBranch()) return;
// ───────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from "react";
import { COMPANY_DIRECTORY, normalizeEmpNo, useStaffDirectory } from "./staffRegistry";
import { makeEmployeeFinder, DEFAULT_QA_VERIFIER } from "../ftr1/ftr1Signatures";
import { EmpNoField } from "../ftr1/CreatorBadge";

const norm = (s) => String(s ?? "").trim();

export const CHECKED_BY_NOTE =
  "Checked By was conducted by the branch supervisor who holds a valid PIC certificate.";

/** "POS 10" / "POS10" / "FTR 1" / "QCS" → a test for the company-record branch label. */
export function branchMatcher(branch) {
  const b = norm(branch).toUpperCase();
  const pos = b.match(/POS\s*0*(\d+)/);
  if (pos) {
    const re = new RegExp(`\\bPOS\\s*0*${pos[1]}\\b`, "i");
    return (label) => re.test(String(label || ""));
  }
  const ftr = b.match(/FTR\s*0*(\d+)/);
  if (ftr) {
    const re = new RegExp(`\\bFTR\\s*0*${ftr[1]}\\b`, "i");
    return (label) => re.test(String(label || ""));
  }
  if (/QCS|QUSAIS|QUASIS/.test(b)) return (label) => /QUASIS|QUSAIS/i.test(String(label || "")) && !/PRODUCTION/i.test(String(label || ""));
  if (/PROD/.test(b)) return (label) => /PRODUCTION/i.test(String(label || ""));
  return () => true;
}

const COMPANY_BY_NO = new Map(COMPANY_DIRECTORY.map((d) => [normalizeEmpNo(d.empNo), d]));

export function useBranchSupervisor(branch, { verifiedKey = "verifiedBy", verifiedDefault = DEFAULT_QA_VERIFIER } = {}) {
  const dir = useStaffDirectory();
  const find = makeEmployeeFinder(dir.byNo);
  const isOwn = useMemo(() => branchMatcher(branch), [branch]);

  const [empNo, setEmpNo] = useState("");
  const [legacyName, setLegacyName] = useState("");
  const [verifiedBy, setVerifiedBy] = useState(verifiedDefault);

  const match = find(empNo);
  const name = match ? match.name : norm(empNo) ? "" : legacyName;
  const unknown = !!norm(empNo) && !dir.loading && !match;
  const homeBranch = COMPANY_BY_NO.get(normalizeEmpNo(empNo))?.branch || "";
  const otherBranch = !!match && !!homeBranch && !isOwn(homeBranch) ? homeBranch : "";

  // This branch's people first, then the Staff Directory.
  const suggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (p) => {
      const k = normalizeEmpNo(p.empNo);
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push({ empNo: p.empNo, name: p.name });
    };
    COMPANY_DIRECTORY.filter((d) => isOwn(d.branch)).forEach(push);
    (dir.staff || []).filter((s) => s.active !== false).forEach(push);
    return out;
  }, [isOwn, dir.staff]);

  const sameAsChecker = !!name && !!norm(verifiedBy) && name.toLowerCase() === norm(verifiedBy).toLowerCase();

  const errors = [];
  if (!norm(empNo) && !legacyName) errors.push("Checked By (Branch Supervisor - PIC): enter the employee number.");
  else if (unknown) errors.push(`Checked By: employee number "${norm(empNo)}" was not found in the Staff Directory.`);
  if (!norm(verifiedBy)) errors.push("Verified by (QA) is required.");
  if (sameAsChecker) errors.push("Verified by (QA) must be independent (cannot be the same as Checked By).");

  return {
    branch,
    empNo, setEmpNo, name, unknown, otherBranch,
    verifiedBy, setVerifiedBy, sameAsChecker,
    suggestions, errors,
    listId: `sup-${norm(branch).replace(/\W+/g, "-").toLowerCase() || "branch"}`,
    fields: () => ({
      checkedBy: name,
      checkedByEmpNo: norm(empNo),
      checkedByNote: CHECKED_BY_NOTE,
      [verifiedKey]: norm(verifiedBy),
    }),
    /** A supervisor from another branch is allowed, but asked about. */
    confirmOtherBranch: () =>
      !otherBranch ||
      window.confirm(`Checked By (${name}) belongs to ${otherBranch}, not ${branch}.\nSave anyway?`),
    load: (p = {}) => {
      setEmpNo(norm(p.checkedByEmpNo));
      setLegacyName(norm(p.checkedByEmpNo) ? "" : norm(p.checkedBy));
      setVerifiedBy(norm(p[verifiedKey]) || verifiedDefault);
    },
    reset: () => { setEmpNo(""); setLegacyName(""); setVerifiedBy(verifiedDefault); },
  };
}

/** Checked By (number → locked name) + Verified by (QA), one row that wraps. */
export function SupervisorBlock({ sup, style }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginTop: 14, ...style }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <EmpNoField
          label="Checked By (Branch Supervisor - PIC):"
          icon="🧑‍💼"
          title={`Employee number of the ${sup.branch} supervisor`}
          empNo={sup.empNo}
          name={sup.name}
          unknown={sup.unknown}
          onEmpNoChange={sup.setEmpNo}
          list={sup.listId}
        />
        {sup.otherBranch && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>
            ⚠️ {sup.name} belongs to {sup.otherBranch} — not {sup.branch}
          </span>
        )}
        <datalist id={sup.listId}>
          {sup.suggestions.map((p) => <option key={p.empNo} value={p.empNo}>{p.name}</option>)}
        </datalist>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 12px", borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#14532d", fontWeight: 700 }}>
        <span aria-hidden="true">✅</span>
        <span style={{ color: "#64748b", fontWeight: 600 }}>Verified by (QA):</span>
        <input
          type="text"
          value={sup.verifiedBy}
          onChange={(e) => sup.setVerifiedBy(e.target.value)}
          style={{ height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, border: `1px solid ${sup.sameAsChecker || !norm(sup.verifiedBy) ? "#ef4444" : "#cbd5e1"}`, minWidth: 220, fontWeight: 700 }}
        />
      </div>
    </div>
  );
}
