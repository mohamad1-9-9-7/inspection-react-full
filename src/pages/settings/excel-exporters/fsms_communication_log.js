// src/pages/settings/excel-exporters/fsms_communication_log.js
// FSMS Communication Matrix / Log (ISO 22000:2018 §7.4) — one sheet, all entries.
// Mirrors CommunicationLogView CSV columns.

import { makeRegisterExporter } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "FSMS Communication Matrix / Log",
  sort: (a, b) => new Date(b.communicationDate || 0) - new Date(a.communicationDate || 0),
  cols: [
    { label: "Comm. No.",        width: 12, get: (it) => it.communicationNo || "" },
    { label: "Date",             width: 13, get: (it) => formatDMY(it.communicationDate) },
    { label: "Direction",        width: 11, get: (it) => prettifyKey(it.direction || "") },
    { label: "Party Category",   width: 16, get: (it) => prettifyKey(it.partyCategory || "") },
    { label: "Party",            width: 18, align: "left", get: (it) => it.partyName || "" },
    { label: "Contact Person",   width: 16, align: "left", get: (it) => it.contactPerson || "" },
    { label: "Channel",          width: 12, get: (it) => prettifyKey(it.channel || "") },
    { label: "Topic",            width: 16, align: "left", get: (it) => prettifyKey(it.topic || "") },
    { label: "Subject",          width: 24, align: "left", get: (it) => it.subject || "" },
    { label: "Message Summary",  width: 32, align: "left", get: (it) => it.messageSummary || "" },
    { label: "Communicated By",  width: 16, get: (it) => it.communicator || "" },
    { label: "Response Req.",    width: 11, get: (it) => it.responseRequired || "" },
    { label: "Due Date",         width: 13, get: (it) => formatDMY(it.dueDate) },
    { label: "Response Summary", width: 28, align: "left", get: (it) => it.responseSummary || "" },
    { label: "Status",           width: 12, get: (it) => prettifyKey(it.status || "") },
    { label: "Closed Date",      width: 13, get: (it) => formatDMY(it.closedDate) },
    { label: "Verified By",      width: 16, get: (it) => it.verifiedBy || "" },
    { label: "Linked Module",    width: 16, get: (it) => it.linkedModule || "" },
    { label: "Linked Reference", width: 16, get: (it) => it.linkedReference || "" },
    { label: "Food Safety Concern", width: 14, get: (it) => it.foodSafetyConcern || "" },
    { label: "FSMS Impact",      width: 16, align: "left", get: (it) => it.fsmsImpact || "" },
    { label: "Escalation",       width: 14, align: "left", get: (it) => it.escalation || "" },
    { label: "Notes",            width: 24, align: "left", get: (it) => it.notes || "" },
  ],
});
