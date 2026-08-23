// POS 6 personal hygiene — mirrors the columns of the POS 6 viewer.
import { buildPos6Sheet, numbered, verdictWarn, S_NO } from "./_pos6";

const columns = [
  S_NO,
  { key: "name",  label: "Employee Name", width: 24, align: "left" },
  { key: "Nails", label: "Nails", width: 11 },
  { key: "Hair",  label: "Hair",  width: 11 },
  { key: "Not wearing Jewelry", label: "Not wearing jewellery", width: 15 },
  { key: "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
    label: "Clean cloth / hair net / gloves / mask / shoes", width: 30 },
  { key: "Communicable Disease", label: "Communicable disease", width: 16 },
  { key: "Open wounds/sores & cut", label: "Open wounds / sores / cuts", width: 18 },
  { key: "remarks", label: "Remarks & Corrective Actions", width: 28, align: "left" },
];

export default async function build(wb, record, ctx) {
  return buildPos6Sheet(wb, record, ctx, {
    title: "Personal Hygiene Checklist",
    formRef: "FS-QM/REC/PH",
    columns,
    getRows: (p) => numbered(p.entries || []),
    cellWarn: verdictWarn,
  });
}
