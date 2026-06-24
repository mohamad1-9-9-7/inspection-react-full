import React from "react";
import SanitizerView from "../pos19/view pos 19/SanitizerConcentrationVerificationView";

export default function POS15SanitizerConcentrationView() {
  return <SanitizerView reportType="pos15_sanitizer_concentration" branch="POS 15" formRef="FS-HACCP/POS15/SAN/08" reporter="pos15" exportPrefix="POS15_SanitizerConc" branchLabel="POS 15" />;
}
