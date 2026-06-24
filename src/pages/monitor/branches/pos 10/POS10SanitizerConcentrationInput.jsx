import React from "react";
import SanitizerInput from "../pos19/pos19_inputs/SanitizerConcentrationVerificationInput";

export default function POS10SanitizerConcentrationInput() {
  return <SanitizerInput reportType="pos10_sanitizer_concentration" branch="POS 10" formRef="FS-HACCP/POS10/SAN/08" reporter="pos10" />;
}
