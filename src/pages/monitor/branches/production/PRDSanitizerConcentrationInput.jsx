import React from "react";
import SanitizerInput from "../pos19/pos19_inputs/SanitizerConcentrationVerificationInput";

export default function PRDSanitizerConcentrationInput() {
  return <SanitizerInput reportType="prod_sanitizer_concentration" branch="PRODUCTION" formRef="FS-HACCP/PRD/SAN/08" reporter="production" />;
}
