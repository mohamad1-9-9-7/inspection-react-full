// src/pages/monitor/branches/pos 10/POS10CalibrationInput.jsx
// يستخدم المكوّن المشترك BranchCalibrationInput.
import React from "react";
import BranchCalibrationInput from "../_shared/BranchCalibrationInput";

export default function POS10CalibrationInput() {
  return (
    <BranchCalibrationInput
      config={{
        type: "pos10_calibration_log",
        defaultBranch: "POS 10",
        headerHasDate: true,
        readBranchFromURL: false,
      }}
    />
  );
}
