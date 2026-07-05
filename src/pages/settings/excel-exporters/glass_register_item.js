// src/pages/settings/excel-exporters/glass_register_item.js
// Glass & Brittle Plastic Register — one sheet, all items.
// Mirrors GlassRegisterView columns.

import { makeRegisterExporter, txtEN } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "Glass & Brittle Plastic Register",
  cols: [
    { label: "Item Type",       width: 16, get: (it) => prettifyKey(it.itemType || "") },
    { label: "Item Name",       width: 26, align: "left", get: (it) => txtEN(it.itemName) },
    { label: "Code",            width: 14, get: (it) => it.itemCode || "" },
    { label: "Location",        width: 22, align: "left", get: (it) => txtEN(it.location) },
    { label: "Zone",            width: 16, align: "left", get: (it) => txtEN(it.zone) },
    { label: "Branch",          width: 16, get: (it) => it.branch || "" },
    { label: "Responsible",     width: 18, align: "left", get: (it) => it.responsible || "" },
    { label: "Risk",            width: 10, get: (it) => prettifyKey(it.riskAssessment || "") },
    { label: "Protection",      width: 14, get: (it) => prettifyKey(it.protection || "") },
    { label: "Condition",       width: 14, get: (it) => prettifyKey(it.condition || "") },
    { label: "Next Inspection", width: 14, get: (it) => formatDMY(it.nextInspection) },
  ],
});
