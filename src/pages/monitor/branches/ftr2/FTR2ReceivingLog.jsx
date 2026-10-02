// src/pages/monitor/branches/ftr2/FTR2ReceivingLog.jsx
// FTR 2 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";

/* Food trucks also record the Dubai Municipality approval of the vehicle. */
const DM_FIELD = [{ key: "dmApprovalNo", label: "DM approval no. (vehicle)", labelAr: "رقم موافقة البلدية للمركبة" }];

export default function FTR2ReceivingLog() {
  return (
    <ReceivingLogForm
      branch="FTR 2"
      type="ftr2_receiving_log_butchery"
      reporter="ftr2"
      documentNo="TELT/QC/RECLOG/01"
      photos
      extraFields={DM_FIELD}
    />
  );
}
