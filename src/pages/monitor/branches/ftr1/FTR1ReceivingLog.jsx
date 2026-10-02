// src/pages/monitor/branches/ftr1/FTR1ReceivingLog.jsx
// FTR 1 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";

/* Food trucks also record the Dubai Municipality approval of the vehicle. */
const DM_FIELD = [{ key: "dmApprovalNo", label: "DM approval no. (vehicle)", labelAr: "رقم موافقة البلدية للمركبة" }];

export default function FTR1ReceivingLog() {
  return (
    <ReceivingLogForm
      branch="FTR 1"
      type="ftr1_receiving_log_butchery"
      reporter="ftr1"
      documentNo="TELT/QC/RECLOG/01"
      photos
      extraFields={DM_FIELD}
    />
  );
}
