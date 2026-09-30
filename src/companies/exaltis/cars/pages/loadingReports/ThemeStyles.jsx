// src/companies/exaltis/cars/pages/loadingReports/ThemeStyles.jsx
// Loading reports — the screen's style sheet.
// (Split out of LoadingReports.jsx — the code is unchanged.)

/* ===================== Theme Styles ===================== */
export function ThemeStyles() {
  return (
    <style>{`
      .lr-app {
        --primary: #2563eb;
        --accent: #7c3aed;
        --text: #0f172a;
        --panel-bg: rgba(255,255,255,0.72);
        --panel-border: rgba(255,255,255,0.55);
        --panel-shadow: 0 10px 30px rgba(2,6,23,0.08), 0 2px 10px rgba(2,6,23,0.06);
        --ch: 16px;
        --clip-chamfer: polygon(
          var(--ch) 0,
          calc(100% - var(--ch)) 0,
          100% var(--ch),
          100% calc(100% - var(--ch)),
          calc(100% - var(--ch)) 100%,
          var(--ch) 100%,
          0 calc(100% - var(--ch)),
          0 var(--ch)
        );
        color: var(--text);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .lr-app::before {
        content: "";
        position: fixed;
        inset: -20vmax;
        z-index: 0;
        pointer-events: none;
        background:
          radial-gradient(40vmax 40vmax at 12% 18%, rgba(124,58,237,.20), transparent 60%),
          radial-gradient(45vmax 35vmax at 85% 12%, rgba(37,99,235,.20), transparent 60%),
          radial-gradient(40vmax 35vmax at 20% 90%, rgba(16,185,129,.20), transparent 60%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        filter: saturate(1.05) blur(0.2px);
        animation: auroraShift 14s ease-in-out infinite alternate;
      }
      @keyframes auroraShift {
        0%   { transform: translate3d(0,0,0) scale(1); }
        100% { transform: translate3d(2%, -2%, 0) scale(1.03); }
      }
      .panel {
        position: relative;
        clip-path: var(--clip-chamfer);
        background: var(--panel-bg);
        border: 1px solid var(--panel-border);
        box-shadow: var(--panel-shadow);
        overflow: clip;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: box-shadow .18s ease;
      }
      .panel:hover {
        transform: none;
        box-shadow: var(--panel-shadow);
      }
      .panel::before {
        content: "";
        position: absolute; inset: 0;
        clip-path: var(--clip-chamfer);
        padding: 1px;
        background: linear-gradient(135deg, rgba(37,99,235,.55), rgba(124,58,237,.55), rgba(16,185,129,.55));
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
        opacity: .55;
      }
      .panel-body { padding: 12px; }

      .lr-app table { width: 100%; border-collapse: separate; border-spacing: 0; }
      .lr-app thead th {
        background: linear-gradient(180deg, #eff6ff, #e7f0ff);
        color: #0b1324;
        border-bottom: 1px solid rgba(203,213,225,.9);
        font-weight: 800;
        padding: 10px 12px;
        position: sticky; top: 0; z-index: 1;
      }
      .lr-app tbody td {
        background: rgba(255,255,255,0.8);
        color: #0b1324;
        border-top: 1px solid rgba(226,232,240,.7);
        padding: 9px 8px;
        text-align: center;
      }
      .lr-app tbody tr:first-child td { border-top: none; }
      .lr-app table.detail-table th, .lr-app table.detail-table td {
        border: 1px solid #e2e8f0;
        padding: 8px 10px;
        text-align: left;
      }
      .lr-app table.detail-table thead th {
        background: #f1f5f9;
        font-weight: 700;
        color: #1f2937;
        padding: 10px 12px;
      }
      .lr-app table.detail-table tbody tr:hover td {
        background: #f8fafc;
      }

      .lr-app *::-webkit-scrollbar { height: 10px; width: 10px; }
      .lr-app *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .lr-app *::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

      .toast-wrap {
        position: fixed; right: 16px; top: 16px;
        display: grid; gap: 8px; z-index: 9999;
      }
      .toast {
        background: #0f172a; color: white; padding: 10px 12px; border-radius: 10px;
        box-shadow: 0 10px 20px rgba(2,6,23,.2);
        font-weight: 700; letter-spacing: .2px;
      }
      .toast.ok { background: #16a34a; }
      .toast.err { background: #dc2626; }
      .toast.info { background: #2563eb; }
    `}</style>
  );
}
