// src/pages/monitor/branches/POS 11/POS11ReceivingLogInput.jsx
// POS 11 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";

export default function POS11ReceivingLogInput() {
  return (
    <ReceivingLogForm
      branch="POS 11"
      type="pos11_receiving_log_butchery"
      reporter="pos11"
      documentNo="FSMS/BR/F01A"
    />
  );
}
