// src/pages/monitor/branches/pos6/POS6ReceivingLogInput.jsx
// POS 6 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";

export default function POS6ReceivingLogInput() {
  return (
    <ReceivingLogForm
      branch="POS 6"
      type="pos6_receiving_log_butchery"
      reporter="pos6"
      documentNo="FSMS/BR/F01A"
    />
  );
}
