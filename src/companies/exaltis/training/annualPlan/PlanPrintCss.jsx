// src/companies/exaltis/training/annualPlan/PlanPrintCss.jsx
// Annual training plan — Print style sheet.
// (Extracted from TrainingAnnualPlan.jsx — the code is unchanged.)

export function PlanPrintCss() {
  return (
    <style>{`
      @media print {
        body { background: white !important; }
        .no-print { display: none !important; }
        .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important; }
        .plan-table { font-size: 10px !important; }
        .plan-table td, .plan-table th { padding: 4px !important; }
        @page { size: A3 landscape; margin: 8mm; }
      }
      .row-hover:hover .row-bar { opacity: 1 !important; }
      .cell-btn:hover {
        outline: 2px solid rgba(56,189,248,0.55);
        outline-offset: -3px;
        filter: brightness(1.02);
      }
      .plan-table th,
      .plan-table td {
        box-sizing: border-box;
      }
      #root .training-annual-plan,
      #root .training-annual-plan * {
        font-size: 14px !important;
      }
      #root .training-annual-plan .annual-plan-title {
        font-size: 16px !important;
      }
      #root .training-annual-plan .annual-plan-panel-title {
        font-size: 14px !important;
      }
      #root .training-annual-plan .annual-plan-icon {
        font-size: 18px !important;
      }
      #root .training-annual-plan .annual-plan-branch-icon {
        font-size: 14px !important;
      }
      #root .training-annual-plan .annual-plan-stat-value {
        font-size: 14px !important;
      }
      #root .training-annual-plan .plan-table {
        font-size: 12px !important;
      }
      #root .training-annual-plan .plan-table th,
      #root .training-annual-plan .plan-table td,
      #root .training-annual-plan .plan-table span,
      #root .training-annual-plan .plan-table button {
        font-size: 12px !important;
      }
    `}</style>
  );
}
