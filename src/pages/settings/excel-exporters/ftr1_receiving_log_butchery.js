import { makeFtrReceivingBuilder, FTR_RECEIVING_COLS } from "./_ftr_receiving";

// FTR 1 records the vehicle plate beside its DM approval (mirrors the View).
const cols = FTR_RECEIVING_COLS.flatMap((c) =>
  c.key === "dmApprovalNo"
    ? [c, { key: "vehicleNo", label: "Vehicle no.", width: 12 }]
    : [c]);

export default makeFtrReceivingBuilder("FTR 1", { cols });
