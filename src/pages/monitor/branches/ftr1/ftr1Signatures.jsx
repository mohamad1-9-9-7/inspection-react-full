// src/pages/monitor/branches/ftr1/ftr1Signatures.jsx
// One signature pattern for every FTR 1 input report:
//   👤 Created by    — employee number → locked name (who filled the sheet in)
//   🧑‍💼 Checked By    — employee number → locked name (branch supervisor / PIC)
//   ✅ Verified by (QA) — pre-filled with the QA owner, still editable
//
//   const directory = useStaffDirectory();
//   const sig = useFtrSignatures(directory, { verifiedKey: "verifiedByQA" });
//   ...validation: [...myErrors, ...sig.errors]
//   ...payload:    { ...myFields, ...sig.fields() }
//   <FtrSignatureBlock sig={sig} />
import React, { useState } from "react";
import { COMPANY_DIRECTORY, normalizeEmpNo } from "../_shared/staffRegistry";
import { getCurrentUser } from "../../../../utils/perms";
import { EmpNoField } from "./CreatorBadge";

/** Pre-filled QA verifier (editable). */
export const DEFAULT_QA_VERIFIER = "MOHAMAD ABDULLAH";

const COMPANY_BY_NO = new Map(COMPANY_DIRECTORY.map((d) => [normalizeEmpNo(d.empNo), d]));
const norm = (s) => String(s ?? "").trim();

/** Staff Directory first, then the company directory. */
export function makeEmployeeFinder(byNo) {
  return (empNo) => {
    const key = normalizeEmpNo(empNo);
    if (!key) return null;
    return (byNo && byNo.get(key)) || COMPANY_BY_NO.get(key) || null;
  };
}

function currentUsername() {
  const u = getCurrentUser() || {};
  return norm(u.username || u.displayName || u.name);
}

/**
 * @param directory   result of useStaffDirectory() (byNo + loading)
 * @param verifiedKey payload key the viewer reads ("verifiedBy" | "verifiedByQA")
 */
export function useFtrSignatures(directory, { verifiedKey = "verifiedBy", verifiedLabel = "Verified by (QA)" } = {}) {
  const { byNo, loading } = directory || {};
  const find = makeEmployeeFinder(byNo);

  const [creatorNo, setCreatorNo] = useState("");
  const [checkedNo, setCheckedNo] = useState("");
  const [verifiedBy, setVerifiedBy] = useState(DEFAULT_QA_VERIFIER);

  const creatorMatch = find(creatorNo);
  const checkedMatch = find(checkedNo);
  const creatorName = creatorMatch ? creatorMatch.name : "";
  const checkedName = checkedMatch ? checkedMatch.name : "";
  const creatorUnknown = !!norm(creatorNo) && !loading && !creatorMatch;
  const checkedUnknown = !!norm(checkedNo) && !loading && !checkedMatch;
  const sameAsChecker =
    !!checkedName && !!norm(verifiedBy) && checkedName.toLowerCase() === norm(verifiedBy).toLowerCase();

  const errors = [];
  if (!norm(creatorNo)) errors.push("Created by: enter your employee number.");
  else if (creatorUnknown) errors.push(`Created by: employee number "${norm(creatorNo)}" was not found in the Staff Directory.`);
  if (!norm(checkedNo)) errors.push("Checked By: enter the supervisor's employee number.");
  else if (checkedUnknown) errors.push(`Checked By: employee number "${norm(checkedNo)}" was not found in the Staff Directory.`);
  if (!norm(verifiedBy)) errors.push(`${verifiedLabel} is required.`);
  if (sameAsChecker) errors.push(`${verifiedLabel} must be independent (cannot be the same as Checked By).`);

  const fields = () => ({
    createdBy: creatorName,
    createdByEmpNo: norm(creatorNo),
    createdByUser: currentUsername(),
    checkedBy: checkedName,
    checkedByEmpNo: norm(checkedNo),
    [verifiedKey]: norm(verifiedBy),
  });

  const reset = () => {
    setCreatorNo("");
    setCheckedNo("");
    setVerifiedBy(DEFAULT_QA_VERIFIER);
  };

  /** Re-open a saved sheet (e.g. the receiving log's existing day record). */
  const load = (p = {}) => {
    setCreatorNo(norm(p.createdByEmpNo));
    setCheckedNo(norm(p.checkedByEmpNo));
    setVerifiedBy(norm(p[verifiedKey]) || DEFAULT_QA_VERIFIER);
  };

  return {
    creatorNo, setCreatorNo, creatorName, creatorUnknown,
    checkedNo, setCheckedNo, checkedName, checkedUnknown,
    verifiedBy, setVerifiedBy, sameAsChecker,
    verifiedLabel, errors, fields, reset, load, find,
  };
}

const VERIFY_CHIP = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px 6px 12px",
  borderRadius: 12,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  fontWeight: 700,
};

/** The three signature boxes in one row (wraps on narrow screens). */
export function FtrSignatureBlock({ sig, style }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "1rem",
        ...style,
      }}
    >
      <EmpNoField
        label="Created by:"
        title="Your employee number"
        empNo={sig.creatorNo}
        name={sig.creatorName}
        unknown={sig.creatorUnknown}
        onEmpNoChange={sig.setCreatorNo}
      />
      <EmpNoField
        label="Checked By:"
        icon="🧑‍💼"
        title="Branch supervisor (PIC) employee number"
        empNo={sig.checkedNo}
        name={sig.checkedName}
        unknown={sig.checkedUnknown}
        onEmpNoChange={sig.setCheckedNo}
      />
      <div style={VERIFY_CHIP}>
        <span aria-hidden="true">✅</span>
        <span style={{ color: "#64748b", fontWeight: 600 }}>{sig.verifiedLabel}:</span>
        <input
          type="text"
          value={sig.verifiedBy}
          onChange={(e) => sig.setVerifiedBy(e.target.value)}
          style={{
            height: 36,
            boxSizing: "border-box",
            padding: "0 10px",
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: sig.sameAsChecker || !norm(sig.verifiedBy) ? "#ef4444" : "#cbd5e1",
            minWidth: 220,
            fontWeight: 700,
          }}
        />
      </div>
    </div>
  );
}
