// src/pages/monitor/branches/pos19/view pos 19/NonConformanceReportsView.jsx
// Wrapper around the QCS NCR viewer, scoped to POS 19 (Al Warqa kitchen).
// Lists only reports stored under `pos19_non_conformance`.

import React from "react";
import QCSNonConformanceReportsView from "../../qcs/NonConformanceReportsView";

export default function POS19NonConformanceReportsView(props) {
  return (
    <QCSNonConformanceReportsView
      {...props}
      type="pos19_non_conformance"
      headerLine="TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - POS 19 (AL WARQA KITCHEN)"
      inputPath="/monitor/pos19"
      inputTab="nonConformance"
    />
  );
}
