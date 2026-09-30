// src/companies/exaltis/training/sessions/RenewalAlerts.jsx
// Training sessions — renewal alerts.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)

export function RenewalAlerts({ setRenewalOpen, renewalAlerts, renewalOpen }) {
  return (
    <div style={{
      background:'#fff', border:'1.5px solid #fde68a',
      borderRadius:14, marginBottom:14,
      boxShadow:'0 2px 10px rgba(245,158,11,.08)',
    }}>
      <button
        onClick={() => setRenewalOpen(o => !o)}
        style={{
          width:'100%', background:'none', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 16px', borderRadius:14,
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🔔</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>
              Renewals Due / تجديدات مستحقة
            </div>
            <div style={{ fontSize:11, color:'#b45309', marginTop:1 }}>
              {renewalAlerts.filter(a => a.daysLeft < 0).length > 0 && (
                <span style={{ color:'#dc2626', fontWeight:700 }}>
                  {renewalAlerts.filter(a => a.daysLeft < 0).length} expired •{' '}
                </span>
              )}
              {renewalAlerts.filter(a => a.daysLeft >= 0).length} expiring within 90 days
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            fontSize:10, fontWeight:700, color:'#92400e',
            background:'#fef3c7', borderRadius:999, padding:'2px 8px',
            border:'1px solid #fde68a',
          }}>{renewalAlerts.length} employees</span>
          <span style={{ color:'#d97706', fontSize:12, display:'inline-block',
            transform: renewalOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▼</span>
        </div>
      </button>

      {renewalOpen && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid #fef3c7' }}>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
            gap:8, marginTop:10,
          }}>
            {renewalAlerts.map((a, i) => {
              const expired = a.daysLeft < 0;
              const urgent  = !expired && a.daysLeft < 30;
              const col = expired ? '#dc2626' : urgent ? '#d97706' : '#16a34a';
              const bg  = expired ? '#fef2f2' : urgent ? '#fffbeb' : '#f0fdf4';
              const bd  = expired ? '#fecaca' : urgent ? '#fde68a' : '#bbf7d0';
              return (
                <div key={i} style={{
                  background: bg, border:`1px solid ${bd}`,
                  borderRadius:10, padding:'10px 13px',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12, color:'#0f172a' }}>{a.name || '—'}</div>
                      <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>
                        {a.empId && <span style={{ marginRight:6 }}>ID: {a.empId}</span>}
                        {a.desig && <span>{a.desig}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize:10, fontWeight:800, color: col,
                      background:'#fff', border:`1px solid ${bd}`,
                      borderRadius:999, padding:'2px 7px', whiteSpace:'nowrap',
                    }}>
                      {expired ? `Expired ${Math.abs(a.daysLeft)}d ago` : `${a.daysLeft}d left`}
                    </span>
                  </div>
                  <div style={{ marginTop:7, fontSize:10, color:'#475569', display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span>📚 {a.module || '—'}</span>
                    <span>🏢 {a.branch || '—'}</span>
                  </div>
                  <div style={{ marginTop:4, fontSize:9.5, color:'#94a3b8' }}>
                    Trained: {a.trainedDate} → Expires: <strong style={{color: col}}>{a.expiryDate}</strong>
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
