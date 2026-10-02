// src/pages/monitor/branches/pos15/POS15ReceivingLogInput.jsx
// POS 15 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";

export default function POS15ReceivingLogInput() {
  return (
    <ReceivingLogForm
      branch="POS 15"
      type="pos15_receiving_log_butchery"
      reporter="pos15"
      documentNo="FSMS/BR/F01A"
    />
  );
}
