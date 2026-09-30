// src/companies/exaltis/training/sessions/BranchCompliance.jsx
// Training sessions — branch compliance.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { TOTAL_MODULES } from "./participants";

export function BranchCompliance({ setComplianceOpen, branchCompliance, complianceOpen }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
      marginBottom:14, overflow:'hidden',
      boxShadow:'0 1px 4px rgba(15,23,42,.06)',
    }}>
      <button
        onClick={() => setComplianceOpen(p => !p)}
        style={{
          width:'100%', background:'transparent', border:'none', cursor:'pointer',
          padding:'12px 18px', display:'flex', alignItems:'center', gap:10,
          justifyContent:'space-between',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>🏆</span>
          <span style={{ fontWeight:800, color:'#0f172a', fontSize:13 }}>Branch Compliance — امتثال الفروع</span>
          <span style={{
            fontSize:10, fontWeight:700, color:'#64748b',
            background:'#f1f5f9', borderRadius:999, padding:'2px 8px',
          }}>{branchCompliance.length} branches</span>
        </div>
        <span style={{ color:'#94a3b8', fontSize:12, transition:'transform .2s',
          display:'inline-block', transform: complianceOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {complianceOpen && (
        <div style={{ padding:'4px 14px 16px', borderTop:'1px solid #f1f5f9' }}>
          <div style={{ fontSize:10, color:'#64748b', marginBottom:10, padding:'0 4px' }}>
            Score = (Modules Covered / {TOTAL_MODULES} total × 50%) + (Pass Rate × 50%)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10 }}>
            {branchCompliance.length === 0 ? (
              <div style={{ color:'#94a3b8', padding:12, fontSize:13 }}>No data yet.</div>
            ) : branchCompliance.map(bc => {
              const col  = bc.score >= 80 ? '#16a34a' : bc.score >= 60 ? '#d97706' : '#dc2626';
              const bg   = bc.score >= 80 ? '#f0fdf4' : bc.score >= 60 ? '#fffbeb' : '#fef2f2';
              const bd   = bc.score >= 80 ? '#bbf7d0' : bc.score >= 60 ? '#fde68a' : '#fecaca';
              const label= bc.score >= 80 ? 'Good'    : bc.score >= 60 ? 'Fair'    : 'Needs Work';
              return (
                <div key={bc.branch} style={{
                  background: bg, border:`1.5px solid ${bd}`, borderRadius:12,
                  padding:'12px 14px',
                }}>
                  {/* Branch name + badge */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontWeight:800, fontSize:12, color:'#0f172a', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      🏢 {bc.branch}
                    </div>
                    <div style={{
                      flexShrink:0, marginLeft:6,
                      background: col, color:'#fff',
                      fontSize:9, fontWeight:800,
                      padding:'2px 7px', borderRadius:999,
                    }}>{label}</div>
                  </div>

                  {/* Big score */}
                  <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginBottom:10 }}>
                    <div style={{ fontSize:36, fontWeight:900, color: col, lineHeight:1 }}>{bc.score}</div>
                    <div style={{ fontSize:14, fontWeight:700, color: col, marginBottom:4 }}>%</div>
                    <div style={{ fontSize:10, color:'#64748b', marginBottom:5 }}>compliance</div>
                  </div>

                  {/* Coverage bar */}
                  <div style={{ marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, fontWeight:700, color:'#475569', marginBottom:3 }}>
                      <span>📚 Coverage ({bc.modules}/{TOTAL_MODULES} modules)</span>
                      <span style={{ color: col }}>{bc.coverage}%</span>
                    </div>
                    <div style={{ height:5, background:'#e2e8f0', borderRadius:99 }}>
                      <div style={{ height:5, width:`${bc.coverage}%`, background: col, borderRadius:99, transition:'width .4s' }}/>
                    </div>
                  </div>

                  {/* Pass rate bar */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, fontWeight:700, color:'#475569', marginBottom:3 }}>
                      <span>✅ Pass Rate</span>
                      <span style={{ color: col }}>{bc.passRate}%</span>
                    </div>
                    <div style={{ height:5, background:'#e2e8f0', borderRadius:99 }}>
                      <div style={{ height:5, width:`${bc.passRate}%`, background:'#3b82f6', borderRadius:99, transition:'width .4s' }}/>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a3b8' }}>
                    <span>{bc.sessions} sessions</span>
                    <span>Last: {bc.lastDate || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
