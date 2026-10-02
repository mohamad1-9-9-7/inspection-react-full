// src/pages/monitor/branches/pos 10/POS10ReceivingLogInput.jsx
// POS 10 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";

export default function POS10ReceivingLogInput() {
  return (
    <ReceivingLogForm
      branch="POS 10"
      type="pos10_receiving_log_butchery"
      reporter="pos10"
      documentNo="FSMS/BR/F01A"
    />
  );
}
