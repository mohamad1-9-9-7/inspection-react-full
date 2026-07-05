// src/pages/settings/excel-exporters/continual_improvement.js
// Continual Improvement Register (ISO 22000:2018 §10.3) — one sheet, all initiatives.
// Mirrors ContinualImprovementView fields (Idea → Evaluation → Implementation → Effectiveness).

import { makeRegisterExporter } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "Continual Improvement Register",
  sort: (a, b) => new Date(b.suggestionDate || 0) - new Date(a.suggestionDate || 0),
  cols: [
    { label: "Initiative",       width: 28, align: "left", get: (it) => it.initiativeTitle || "" },
    { label: "Suggested",        width: 13, get: (it) => formatDMY(it.suggestionDate) },
    { label: "Proposed By",      width: 16, get: (it) => it.proposedBy || "" },
    { label: "Source",           width: 12, get: (it) => prettifyKey(it.source || "") },
    { label: "Category",         width: 14, get: (it) => prettifyKey(it.category || "") },
    { label: "Description",      width: 32, align: "left", get: (it) => it.description || "" },
    { label: "Expected Benefit", width: 26, align: "left", get: (it) => it.expectedBenefit || "" },
    { label: "Expected Cost",    width: 12, get: (it) => it.expectedCost || "" },
    { label: "Risk",             width: 10, get: (it) => prettifyKey(it.riskAssessment || "") },
    { label: "Priority",         width: 10, get: (it) => prettifyKey(it.priority || "") },
    { label: "Decision",         width: 11, get: (it) => prettifyKey(it.decision || "") },
    { label: "Decision Date",    width: 13, get: (it) => formatDMY(it.decisionDate) },
    { label: "Decision By",      width: 14, get: (it) => it.decisionBy || "" },
    { label: "Rejection Reason", width: 20, align: "left", get: (it) => it.rejectionReason || "" },
    { label: "Owner",            width: 16, get: (it) => it.owner || "" },
    { label: "Start",            width: 12, get: (it) => formatDMY(it.startDate) },
    { label: "Due",              width: 12, get: (it) => formatDMY(it.dueDate) },
    { label: "Actual End",       width: 12, get: (it) => formatDMY(it.actualEndDate) },
    { label: "Status",           width: 12, get: (it) => prettifyKey(it.status || "") },
    { label: "Progress",         width: 9,  get: (it) => (it.progress != null && it.progress !== "" ? `${it.progress}%` : "") },
    { label: "Implementation Notes", width: 28, align: "left", get: (it) => it.implementationNotes || "" },
    { label: "Resources Used",   width: 20, align: "left", get: (it) => it.resourcesUsed || "" },
    { label: "Evaluation Date",  width: 13, get: (it) => formatDMY(it.evaluationDate) },
    { label: "Actual Result",    width: 26, align: "left", get: (it) => it.actualResult || "" },
    { label: "Effective",        width: 11, get: (it) => prettifyKey(it.effective || "") },
    { label: "Evaluated By",     width: 14, get: (it) => it.evaluatedBy || "" },
    { label: "Lessons Learned",  width: 28, align: "left", get: (it) => it.lessonsLearned || "" },
  ],
});
