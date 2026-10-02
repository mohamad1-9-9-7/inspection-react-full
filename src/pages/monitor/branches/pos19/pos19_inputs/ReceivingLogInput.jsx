// src/pages/monitor/branches/pos19/pos19_inputs/ReceivingLogInput.jsx
// POS 19 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../../_shared/ReceivingLogForm";

export default function ReceivingLogInput() {
  return (
    <ReceivingLogForm
      branch="POS 19"
      type="pos19_receiving_log_butchery"
      reporter="pos19"
      documentNo="FS-HACCP/Al Warqa Kitchen/RCV/06"
    />
  );
}
