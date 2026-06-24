import React from "react";
import SanitizerInput from "../pos19/pos19_inputs/SanitizerConcentrationVerificationInput";

export default function POS11SanitizerConcentrationInput() {
  return <SanitizerInput reportType="pos11_sanitizer_concentration" branch="POS 11" formRef="FS-HACCP/POS11/SAN/08" reporter="pos11" />;
}
