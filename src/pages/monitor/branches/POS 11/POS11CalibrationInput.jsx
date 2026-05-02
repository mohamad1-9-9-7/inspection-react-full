// src/pages/monitor/branches/POS 11/POS11CalibrationInput.jsx
// يستخدم المكوّن المشترك BranchCalibrationInput.
import React from "react";
import BranchCalibrationInput from "../_shared/BranchCalibrationInput";

export default function POS11CalibrationInput() {
  return (
    <BranchCalibrationInput
      config={{
        type: "pos11_calibration_log",
        defaultBranch: "POS 11",
        reporter: "pos11",
        headerHasDate: false,       // POS11 يعرض Area فقط بكامل العرض
        readBranchFromURL: true,    // POS11 يقرأ branch من ?branch=
      }}
    />
  );
}
