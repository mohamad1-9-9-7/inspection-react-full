// src/pages/monitor/branches/ftr1/FTR1ReceivingLog.jsx
// FTR 1 receiving log — the shared form every branch uses (POS 6 design:
// header, guidance, delivery blocks with supplier / invoice / receiver /
// vehicle °C above each table). See _shared/ReceivingLogForm.jsx.
import React from "react";
import ReceivingLogForm from "../_shared/ReceivingLogForm";
import { useStaffDirectory } from "../_shared/staffRegistry";
import { useFtrSignatures, FtrSignatureBlock } from "./ftr1Signatures";

/* Food trucks also record the vehicle plate and its Dubai Municipality approval. */
const DM_FIELD = [
  { key: "vehicleNo",    label: "Vehicle no.",               labelAr: "رقم السيارة" },
  { key: "dmApprovalNo", label: "DM approval no. (vehicle)", labelAr: "رقم موافقة البلدية للمركبة" },
];

export default function FTR1ReceivingLog() {
  // FTR 1 signature pattern: Created by / Checked By by employee number,
  // Verified by (QA) pre-filled.
  const sig = useFtrSignatures(useStaffDirectory(), { verifiedKey: "verifiedBy" });
  return (
    <ReceivingLogForm
      branch="FTR 1"
      type="ftr1_receiving_log_butchery"
      reporter="ftr1"
      documentNo="TELT/QC/RECLOG/01"
      photos
      extraFields={DM_FIELD}
      rowPhotos
      productWidth={420}
      signatures={{ ...sig, render: () => <FtrSignatureBlock sig={sig} /> }}
    />
  );
}
