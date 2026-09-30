// src/companies/exaltis/training/sessions/DataQualityPanel.jsx
// Training sessions — data-quality warnings.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { getId, safeTitle, safeDate, safeBranch, getModuleName, safeModule } from "../TrainingSessionsList.helpers";
import { issueTone } from "./participants";

export function DataQualityPanel({ setQualityOpen, dataQuality, qualityOpen, openSession, globalLang }) {
  return (
    <div style={{
      background:'#fff', border:'1.5px solid #fde68a', borderRadius:6,
      marginBottom:14, overflow:'hidden',
      boxShadow:'0 8px 20px rgba(146,64,14,.08)',
    }}>
      <button
        onClick={() => setQualityOpen(p => !p)}
        style={{
          width:'100%', background:'transparent', border:'none', cursor:'pointer',
          padding:'12px 18px', display:'flex', alignItems:'center', gap:10,
          justifyContent:'space-between',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:16, fontWeight:1000, color:'#92400e' }}>!</span>
          <span style={{ fontWeight:900, color:'#111827', fontSize:13 }}>Smart Data Quality Checks</span>
          <span style={{
            fontSize:10, fontWeight:800, color:'#92400e',
            background:'#fffbeb', borderRadius:999, padding:'2px 8px',
            border:'1px solid #fde68a',
          }}>{dataQuality.sessions.length} session(s)</span>
        </div>
        <span style={{ color:'#92400e', fontSize:12, transition:'transform .2s',
          display:'inline-block', transform: qualityOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {qualityOpen && (
        <div style={{ padding:'4px 14px 16px', borderTop:'1px solid #fef3c7' }}>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',
            gap:10,
          }}>
            {dataQuality.sessions.slice(0, 12).map(({ row, issues }) => (
              <button
                key={getId(row) || `${safeTitle(row)}-${safeDate(row)}`}
                onClick={() => openSession(row)}
                style={{
                  textAlign:'left',
                  background:'#fffdf7',
                  border:'1px solid #fde68a',
                  borderRadius:6,
                  padding:'10px 12px',
                  cursor:'pointer',
                  color:'#111827',
                }}
              >
                <div style={{ fontWeight:900, fontSize:12, marginBottom:6 }}>
                  {safeTitle(row) || "Training Session"}
                </div>
                <div style={{ color:'#64748b', fontSize:11, fontWeight:800, marginBottom:8 }}>
                  {safeDate(row) || "-"} · {safeBranch(row) || "-"} · {getModuleName(safeModule(row), globalLang) || "-"}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {issues.map((issue) => {
                    const tone = issueTone(issue);
                    return (
                      <span key={issue.key} title={issue.detail} style={{
                        fontSize:10,
                        fontWeight:900,
                        color:tone.fg,
                        background:tone.bg,
                        border:`1px solid ${tone.bd}`,
                        borderRadius:999,
                        padding:'3px 8px',
                      }}>
                        {issue.label}
                      </span>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
          {dataQuality.sessions.length > 12 && (
            <div style={{ marginTop:10, color:'#92400e', fontSize:11, fontWeight:800 }}>
              Showing first 12 of {dataQuality.sessions.length} flagged sessions. Use filters to narrow the list.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
