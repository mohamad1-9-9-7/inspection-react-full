// Production defrosting record — same column shape as POS 19.

import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "rawMaterial",  label: "Item",        width: 18 },
  { key: "quantity",     label: "Qty",         width: 10 },
  { key: "brand",        label: "Brand",       width: 14 },
  { key: "rmProdDate",   label: "RM Prod.",    width: 13 },
  { key: "rmExpDate",    label: "RM Exp.",     width: 13 },
  { key: "defStartDate", label: "Start Date",  width: 13 },
  { key: "defStartTime", label: "Start Time",  width: 11 },
  { key: "startTemp",    label: "Start °C",    width: 10 },
  { key: "defEndDate",   label: "End Date",    width: 13 },
  { key: "defEndTime",   label: "End Time",    width: 11 },
  { key: "endTemp",      label: "End °C",      width: 10 },
  { key: "defrostTemp",  label: "Chiller °C",  width: 11 },
  { key: "remarks",      label: "Remarks",     width: 22 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Production — Defrosting Record",
    formRef: "FS-QM/REC/PRD-DEF",
    columns,
  });
}
