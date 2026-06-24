import React from "react";
import SanitizerView from "../pos19/view pos 19/SanitizerConcentrationVerificationView";

export default function POS10SanitizerConcentrationView() {
  return <SanitizerView reportType="pos10_sanitizer_concentration" branch="POS 10" formRef="FS-HACCP/POS10/SAN/08" reporter="pos10" exportPrefix="POS10_SanitizerConc" branchLabel="POS 10" />;
}
