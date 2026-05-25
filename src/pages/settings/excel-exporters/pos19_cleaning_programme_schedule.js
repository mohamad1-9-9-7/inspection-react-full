import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "area",          label: "Area / Equipment", width: 22 },
  { key: "frequency",     label: "Frequency",        width: 14 },
  { key: "method",        label: "Method",           width: 18 },
  { key: "chemicalUsed",  label: "Chemical Used",    width: 18 },
  { key: "concentration", label: "Concentration",    width: 14 },
  { key: "responsible",   label: "Responsible",      width: 16 },
  { key: "verifiedBy",    label: "Verified by",      width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Cleaning Programme Schedule",
    formRef: "FS-HACCP/POS19/CPS/15",
    columns,
  });
}
