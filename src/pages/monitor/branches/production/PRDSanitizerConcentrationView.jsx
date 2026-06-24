import React from "react";
import SanitizerView from "../pos19/view pos 19/SanitizerConcentrationVerificationView";

export default function PRDSanitizerConcentrationView() {
  return <SanitizerView reportType="prod_sanitizer_concentration" branch="PRODUCTION" formRef="FS-HACCP/PRD/SAN/08" reporter="production" exportPrefix="PRODUCTION_SanitizerConc" branchLabel="PRODUCTION" />;
}
