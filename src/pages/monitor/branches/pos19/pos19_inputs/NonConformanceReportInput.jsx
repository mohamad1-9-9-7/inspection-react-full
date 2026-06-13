// src/pages/monitor/branches/pos19/pos19_inputs/NonConformanceReportInput.jsx
// Wrapper around the QCS NCR input form, scoped to POS 19 (Al Warqa kitchen).
// Reuses the same UI/logic but stores reports under a separate type
// (`pos19_non_conformance`) so QCS and POS19 data stay fully isolated.

import React from "react";
import QCSNonConformanceReportInput from "../../qcs/NonConformanceReportInput";

export default function POS19NonConformanceReportInput(props) {
  return (
    <QCSNonConformanceReportInput
      {...props}
      type="pos19_non_conformance"
      reporter="pos19"
      headerLine="TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - POS 19 (AL WARQA KITCHEN)"
      locationPlaceholder="e.g., POS 19 - Al Warqa Kitchen"
    />
  );
}
