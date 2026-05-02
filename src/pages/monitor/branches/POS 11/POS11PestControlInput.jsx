// src/pages/monitor/branches/POS 11/POS11PestControlInput.jsx
// يستخدم المكوّن المشترك BranchPestControlInput.
import React from "react";
import BranchPestControlInput from "../_shared/BranchPestControlInput";

export default function POS11PestControlInput() {
  return (
    <BranchPestControlInput
      config={{
        type: "pos11_pest_control",
        defaultBranch: "POS 11",
        reporter: "pos11",
      }}
    />
  );
}
