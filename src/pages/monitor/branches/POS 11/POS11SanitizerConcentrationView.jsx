import React from "react";
import SanitizerView from "../pos19/view pos 19/SanitizerConcentrationVerificationView";

export default function POS11SanitizerConcentrationView() {
  return <SanitizerView reportType="pos11_sanitizer_concentration" branch="POS 11" formRef="FS-HACCP/POS11/SAN/08" reporter="pos11" exportPrefix="POS11_SanitizerConc" branchLabel="POS 11" />;
}
