import React from "react";
import SanitizerInput from "../pos19/pos19_inputs/SanitizerConcentrationVerificationInput";

export default function POS15SanitizerConcentrationInput() {
  return <SanitizerInput reportType="pos15_sanitizer_concentration" branch="POS 15" formRef="FS-HACCP/POS15/SAN/08" reporter="pos15" />;
}
