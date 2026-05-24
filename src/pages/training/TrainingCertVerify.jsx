// src/pages/training/TrainingCertVerify.jsx
// Public page — scanned from QR code on certificate.
// Reads all cert data from URL params (no backend call needed).
// Uses useLocation so it works with both BrowserRouter (web) and HashRouter (Electron).
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useGlobalLang, getModuleName } from './TrainingSessionsList.helpers';

export default function TrainingCertVerify() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [globalLang, setGlobalLang] = useGlobalLang();
  const isAr = globalLang === 'ar';
  const tL = (en, ar) => (isAr ? ar : en);

  const certNo  = params.get('cert')   || '';
  const name    = params.get('n')      || '';
  const empId   = params.get('id')     || '';
  const module  = params.get('mod')    || '';
  const date    = params.get('date')   || '';
  const score   = parseInt(params.get('score') || '0', 10);
  const by      = params.get('by')     || '';
  const branch  = params.get('branch') || '';
  const expDate = params.get('exp')    || '';

  const daysLeft = expDate
    ? Math.ceil((new Date(expDate) - new Date()) / 86400000)
    : null;
  const expired = daysLeft !== null && daysLeft < 0;

  const expiryColor = expired ? '#dc2626' : daysLeft !== null && daysLeft < 30 ? '#d97706' : '#16a34a';
  const statusColor = expired ? '#dc2626' : '#16a34a';
  const statusBg    = expired ? '#fef2f2' : '#f0fdf4';
  const statusBd    = expired ? '#fecaca' : '#bbf7d0';
  const statusText  = expired ? '⚠️ Certificate Expired' : '✅ Certificate Verified';
  const statusAr    = expired ? 'الشهادة منتهية الصلاحية' : 'الشهادة صالحة وموثّقة';

  if (!certNo && !name) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#f8fafc', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>
        <div style={{ textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔗</div>
          <div style={{ fontSize:16 }}>Invalid or missing certificate link.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 40%,#312e81 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px 16px',
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
    }}>
      <div style={{
        background:'#fff', borderRadius:20, maxWidth:640, width:'100%',
        boxShadow:'0 40px 100px rgba(0,0,0,.5)', overflow:'hidden',
      }}>

        {/* Header stripe */}
        <div style={{
          background:'linear-gradient(90deg,#1e3a8a,#4338ca)',
          padding:'18px 28px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ background:'#fff', borderRadius:12, padding:5 }}>
              <img src="/mawashi-logo.jpg" alt="" style={{ height:44, width:44, objectFit:'contain', display:'block', borderRadius:9 }} />
            </div>
            <div>
              <div style={{ color:'rgba(255,255,255,.6)', fontSize:9, letterSpacing:2, textTransform:'uppercase' }}>Al Mawashi Company</div>
              <div style={{ color:'#fff', fontSize:13, fontWeight:700 }}>قسم الجودة — Certificate Verification</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button
              onClick={() => setGlobalLang(isAr ? 'en' : 'ar')}
              style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.25)', borderRadius:8, padding:'6px 10px', fontWeight:800, fontSize:11, cursor:'pointer' }}
              title={isAr ? 'English' : 'عربي'}
            >🌐 {isAr ? 'EN' : 'ع'}</button>
            <div style={{ color:'rgba(255,255,255,.3)', fontSize:10, letterSpacing:1 }}>AM-VERIFY</div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          margin:'22px 28px 0',
          background: statusBg, border:`1.5px solid ${statusBd}`,
          borderRadius:12, padding:'14px 18px',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <div style={{ fontSize:28 }}>{expired ? '❌' : '✅'}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color: statusColor }}>{statusText}</div>
            <div style={{ fontSize:12, color: statusColor, opacity:.8, marginTop:2 }}>{statusAr}</div>
          </div>
        </div>

        {/* Certificate details */}
        <div style={{ padding:'20px 28px 28px' }}>
          {/* Cert number */}
          <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:1.5, marginBottom:14, textTransform:'uppercase' }}>
            Certificate No: <strong style={{ color:'#4338ca' }}>{certNo}</strong>
          </div>

          {/* Name */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, marginBottom:3 }}>{tL('Participant', 'المتدرّب')}</div>
            <div style={{ fontSize:24, fontWeight:900, color:'#0f172a', letterSpacing:'-0.02em' }}>{name || '—'}</div>
            <div style={{ display:'flex', gap:7, marginTop:6, flexWrap:'wrap' }}>
              {empId && (
                <span style={{ fontSize:11, fontWeight:700, color:'#4338ca',
                  background:'#eef2ff', border:'1px solid #c7d2fe',
                  padding:'3px 10px', borderRadius:999 }}>ID: {empId}</span>
              )}
            </div>
          </div>

          {/* Module */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, marginBottom:5 }}>{tL('Training Module', 'وحدة التدريب')}</div>
            <div style={{
              background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',
              border:'1.5px solid #c7d2fe', borderLeft:'4px solid #4338ca',
              borderRadius:10, padding:'10px 14px',
              fontSize:14, fontWeight:800, color:'#1e3a8a',
              direction: isAr ? 'rtl' : 'ltr',
            }}>{module ? getModuleName(module, globalLang) : '—'}</div>
          </div>

          {/* Score + expiry grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:9.5, color:'#94a3b8', fontWeight:600, marginBottom:4 }}>SCORE</div>
              <div style={{ fontSize:26, fontWeight:900, color: score >= 80 ? '#16a34a' : '#dc2626' }}>{score}%</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>Pass mark: 80%</div>
            </div>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:9.5, color:'#94a3b8', fontWeight:600, marginBottom:4 }}>VALIDITY</div>
              <div style={{ fontSize:13, fontWeight:700, color: expiryColor }}>
                {expired ? 'EXPIRED' : daysLeft !== null ? `${daysLeft} days left` : '—'}
              </div>
              {expDate && (
                <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>Until: {expDate}</div>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div style={{
            display:'flex', gap:16, flexWrap:'wrap', fontSize:11, color:'#64748b',
            padding:'10px 0', borderTop:'1px solid #f1f5f9',
          }}>
            {date   && <span>📅 Trained: <strong style={{color:'#0f172a'}}>{date}</strong></span>}
            {branch && <span>🏢 <strong style={{color:'#0f172a'}}>{branch}</strong></span>}
            {by     && <span>👤 Trainer: <strong style={{color:'#0f172a'}}>{by}</strong></span>}
          </div>

          {/* Footer */}
          <div style={{
            marginTop:16, paddingTop:12, borderTop:'1px solid #f1f5f9',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ fontSize:9, color:'#cbd5e1' }}>Al Mawashi Company — Quality Department</span>
            <span style={{ fontSize:9, color:'#cbd5e1' }}>ISO 22000:2018</span>
          </div>
        </div>
      </div>
    </div>
  );
}
