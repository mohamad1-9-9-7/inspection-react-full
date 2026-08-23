// POS 6 cleaning checklist — the sheet keeps its area headings, so a section
// row is flattened into the "General cleanliness" column rather than dropped.
import { buildPos6Sheet, verdictWarn } from "./_pos6";

const columns = [
  { key: "letter",   label: "No.",                  width: 8 },
  { key: "general",  label: "General Cleanliness",  width: 34, align: "left" },
  { key: "chemical", label: "Chemical Used",        width: 32, align: "left" },
  { key: "cnc",      label: "C / NC",               width: 10 },
  { key: "doneBy",   label: "Done by",              width: 18, align: "left" },
  { key: "remarks",  label: "Remarks",              width: 26, align: "left" },
];

const flatten = (p) =>
  (p.entries || []).map((r) =>
    r.isSection
      ? { letter: r.sectionNo, general: r.section, chemical: "", cnc: "", doneBy: "", remarks: "" }
      : r
  );

export default async function build(wb, record, ctx) {
  return buildPos6Sheet(wb, record, ctx, {
    title: "Cleaning Checklist",
    formRef: "FF-QM/REC/CC",
    columns,
    getRows: flatten,
    cellWarn: verdictWarn,
  });
}
