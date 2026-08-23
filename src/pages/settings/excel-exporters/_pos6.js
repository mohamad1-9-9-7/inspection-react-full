// src/pages/settings/excel-exporters/_pos6.js
//
// The five POS 6 sheets share a doc header, a row-number column and one
// verdict palette, so those live here and each exporter is just its columns.
// Column order deliberately matches POS6ReportsView — a backup is meant to be
// the same sheet the branch reads on screen, not a re-arrangement of it.

import { buildPos19Sheet } from "./_pos19_base";

const POS6_DOC = {
  branchLabel: "POS 6",
  company: "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
};

/** Row-number column; pair it with `numbered()` in getRows. */
export const S_NO = { key: "sNo", label: "S.No", width: 7 };

/** Stamp a 1-based number on each row so S_NO has something to read. */
export const numbered = (rows = []) => rows.map((r, i) => ({ ...r, sNo: i + 1 }));

/** Pass / fail colouring for the C-NC, Yes-No and √-✗ columns. */
export const verdictWarn = ({ value }) => {
  const v = String(value ?? "").trim();
  if (v === "C" || v === "Yes" || v === "√") return "green";
  if (v === "NC" || v === "No" || v === "✗") return "red";
  return undefined;
};

export function buildPos6Sheet(wb, record, ctx, opts) {
  return buildPos19Sheet(wb, record, ctx, { ...POS6_DOC, ...opts });
}
