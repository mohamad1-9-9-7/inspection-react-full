// src/pages/monitor/branches/pos 10/POS10PestControlInput.jsx
// يستخدم المكوّن المشترك BranchPestControlInput.
import React from "react";
import BranchPestControlInput from "../_shared/BranchPestControlInput";

export default function POS10PestControlInput() {
  return (
    <BranchPestControlInput
      config={{
        type: "pos10_pest_control",
        defaultBranch: "POS 10",
      }}
    />
  );
}
