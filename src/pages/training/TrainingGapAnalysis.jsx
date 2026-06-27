// src/pages/training/TrainingGapAnalysis.jsx
// Shows per-employee training gap: which modules are done vs missing.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  REPORTS_URL, TYPE, fetchJson,
  safeDate, safeBranch, safeModule, normalizeToArray,
  useGlobalLang, getModuleNameShort, getModuleName,
} from './TrainingSessionsList.helpers';
import { MODULE_DETAILS_BI } from './TrainingReferenceModal';

/* ─── All 16 required modules (order determines column order) ─── */
const ALL_MODULES = Object.keys(MODULE_DETAILS_BI).filter(k => k !== '__DEFAULT__');

/* short label for chips / headers (uses helper for AR + EN) */
const shortLabel = (m, lang = 'en') => {
  if (lang === 'ar') return getModuleNameShort(m, 'ar');
  const map = {
    'Personnel Hygiene':              'Hygiene',
    'GHP / Cleaning & Sanitation':    'GHP',
    'Time & Temperature / CCP':       'Temp/CCP',
    'HACCP Basics':                   'HACCP',
    'Allergen Control':               'Allergen',
    'Cross Contamination Control':    'Cross-Cont.',
    'Chemical Safety (Food + OHS)':   'Chemical',
    'Pest Control Awareness':         'Pest Ctrl',
    'Waste Management':               'Waste',
    'OHS: PPE & Safe Work':           'PPE',
    'OHS: Knife Safety':              'Knife',
    'OHS: Manual Handling':           'Manual',
    'OHS: Fire Safety & Emergency':   'Fire',
    'OHS: First Aid & Incident Reporting': 'First Aid',
    'TESTO OIL — Oil Quality Test':   'TESTO Oil',
    'Quality System Usage':           'QMS',
  };
  return map[m] || m.split(' ')[0];
};

function scoreColor(score) {
  if (!score && score !== 0) return '#94a3b8';
  if (score >= 90) return '#16a34a';
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

/* ─── Build employee map from all rows ─── */
function buildEmployeeMap(rows) {
  const map = new Map();

  for (const r of rows) {
    const mod    = safeModule(r);
    const branch = safeBranch(r);
    const date   = safeDate(r);
    if (!mod) continue;

    const parts = Array.isArray(r?.payload?.participants) ? r.payload.participants : [];
    for (const p of parts) {
      if (String(p.result || '').toUpperCase() !== 'PASS') continue;

      const empId = String(p.employeeId || '').trim();
      const name  = String(p.name       || '').trim();
      if (!name && !empId) continue;

      const key = empId ? `eid:${empId}` : `name:${name.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          name, empId,
          designation: String(p.designation || '').trim(),
          branches: new Set(),
          modules: {},   // moduleName → { date, score, branch }
        });
      }
      const emp = map.get(key);
      // keep most complete name/designation
      if (!emp.name && name) emp.name = name;
      if (!emp.empId && empId) emp.empId = empId;
      if (!emp.designation && p.designation) emp.designation = String(p.designation).trim();
      if (branch) emp.branches.add(branch);

      const score = parseInt(String(p.score || '0').replace('%', ''), 10) || 0;
      const prev  = emp.modules[mod];
      // keep most recent
      if (!prev || date > prev.date) {
        emp.modules[mod] = { date, score, branch };
      }
    }
  }

  return Array.from(map.values()).map(e => ({
    ...e,
    branches: [...e.branches],
    done:  ALL_MODULES.filter(m => e.modules[m]).length,
    missing: ALL_MODULES.filter(m => !e.modules[m]),
  })).sort((a, b) => b.done - a.done || (a.name || '').localeCompare(b.name || ''));
}

/* ─── Theme ─── */
const THEME = {
  headerBg: 'linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)',
};

/* ===================================================================
   Main Component
   =================================================================== */
export default function TrainingGapAnalysis() {
  const nav = useNavigate();
  const [globalLang] = useGlobalLang();

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [fBranch, setFBranch] = useState('');
  const [search, setSearch]   = useState('');
  const [view, setView]       = useState('summary'); // 'summary' | 'matrix'
  const [expandedKey, setExpanded] = useState(null);

  /* fetch all training sessions — must use normalizeToArray like the main list page */
  useEffect(() => {
    setLoading(true);
    fetchJson(`${REPORTS_URL}?type=${encodeURIComponent(TYPE)}`)
      .then(data => setRows(normalizeToArray(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* build employee list */
  const employees = useMemo(() => buildEmployeeMap(rows), [rows]);

  /* branches for filter */
  const branches = useMemo(() => {
    const s = new Set();
    employees.forEach(e => e.branches.forEach(b => s.add(b)));
    return [...s].sort();
  }, [employees]);

  /* filtered employees */
  const filtered = useMemo(() => {
    let list = employees;
    if (fBranch) list = list.filter(e => e.branches.includes(fBranch));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.empId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, fBranch, search]);

  /* summary stats */
  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const full    = filtered.filter(e => e.done === ALL_MODULES.length).length;
    const avgDone = Math.round(filtered.reduce((s, e) => s + e.done, 0) / filtered.length);
    const coverage = Math.round(full / filtered.length * 100);
    return { total: filtered.length, full, avgDone, coverage };
  }, [filtered]);

  /* ── Render ── */
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)', fontFamily:"Cairo,Arial,sans-serif" }}>

      {/* ─── Header ─── */}
      <div style={{ background: THEME.headerBg, padding:'20px 24px 22px', boxShadow:'0 22px 50px rgba(15,23,42,.16)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <button
            onClick={() => nav('/training/sessions')}
            style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
              color:'#fff', borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer' }}
          >← Back</button>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:11, letterSpacing:2, textTransform:'uppercase' }}>
            Training System
          </div>
        </div>
        <div style={{ color:'#fff', fontSize:22, fontWeight:900, letterSpacing:'-0.02em' }}>
          📊 Training Gap Analysis
        </div>
        <div style={{ color:'rgba(255,255,255,.55)', fontSize:12, marginTop:3 }}>
          تحليل الفجوات التدريبية — per employee, all modules
        </div>
      </div>

      <div style={{ padding:'18px 18px', maxWidth:1400, margin:'0 auto' }}>

        {/* ─── Controls bar ─── */}
        <div style={{
          background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
          padding:'12px 16px', marginBottom:14,
          display:'flex', gap:10, flexWrap:'wrap', alignItems:'center',
        }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search name or ID..."
            style={{
              flex:1, minWidth:180, border:'1px solid #e2e8f0', borderRadius:9,
              padding:'8px 12px', fontSize:13, outline:'none',
            }}
          />
          {/* Branch filter */}
          <select
            value={fBranch}
            onChange={e => setFBranch(e.target.value)}
            style={{
              border:'1px solid #e2e8f0', borderRadius:9,
              padding:'8px 12px', fontSize:13, outline:'none', minWidth:160,
            }}
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid #e2e8f0', borderRadius:9, overflow:'hidden' }}>
            {['summary','matrix'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? '#4338ca' : '#fff',
                color: view === v ? '#fff' : '#64748b',
                border:'none', padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer',
              }}>
                {v === 'summary' ? '📋 Summary' : '🔲 Matrix'}
              </button>
            ))}
          </div>
          {(search || fBranch) && (
            <button onClick={() => { setSearch(''); setFBranch(''); }}
              style={{ fontSize:11, color:'#94a3b8', border:'1px solid #e2e8f0',
                borderRadius:9, padding:'8px 12px', background:'none', cursor:'pointer' }}>
              Clear ✕
            </button>
          )}
        </div>

        {/* ─── Stats cards ─── */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:10, marginBottom:14 }}>
            {[
              { label:'Total Employees', value: stats.total, icon:'👤', color:'#4338ca', bg:'#eef2ff' },
              { label:'Fully Covered',   value: stats.full,  icon:'🏆', color:'#16a34a', bg:'#f0fdf4' },
              { label:'Coverage Rate',   value: `${stats.coverage}%`, icon:'📈', color:'#0369a1', bg:'#f0f9ff' },
              { label:'Avg Modules',     value: `${stats.avgDone}/${ALL_MODULES.length}`, icon:'📚', color:'#7c3aed', bg:'#faf5ff' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, border:`1px solid ${s.color}22`,
                borderRadius:12, padding:'12px 15px',
              }}>
                <div style={{ fontSize:18, marginBottom:5 }}>{s.icon}</div>
                <div style={{ fontSize:21, fontWeight:900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading sessions…</div>
        )}

        {/* ─── SUMMARY VIEW ─── */}
        {!loading && view === 'summary' && (
          <div style={{
            background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'32px 1fr 90px 90px 140px 1fr',
              gap:0, background:'#f8fafc',
              borderBottom:'1px solid #e2e8f0',
              padding:'9px 14px', fontSize:10, fontWeight:700, color:'#64748b', letterSpacing:.5,
            }}>
              <div>#</div>
              <div>EMPLOYEE</div>
              <div>DONE</div>
              <div>BRANCH</div>
              <div>PROGRESS</div>
              <div>MISSING MODULES</div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>
                {rows.length === 0 ? 'No sessions loaded.' : 'No employees match filter.'}
              </div>
            ) : filtered.map((emp, idx) => {
              const fullCover = emp.done === ALL_MODULES.length;
              const pct = Math.round(emp.done / ALL_MODULES.length * 100);
              const barColor = pct === 100 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
              const key = emp.empId || emp.name;
              const isExpanded = expandedKey === key;

              return (
                <div key={key} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {/* Main row */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : key)}
                    style={{
                      display:'grid',
                      gridTemplateColumns:'32px 1fr 90px 90px 140px 1fr',
                      gap:0, padding:'10px 14px',
                      alignItems:'center', cursor:'pointer',
                      background: isExpanded ? '#fafbff' : '#fff',
                      transition:'background .15s',
                    }}
                  >
                    {/* # */}
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{idx + 1}</div>

                    {/* Name + ID */}
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{emp.name || '—'}</div>
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>
                        {emp.empId && <span style={{ marginRight:6 }}>ID: {emp.empId}</span>}
                        {emp.designation && <span>{emp.designation}</span>}
                      </div>
                    </div>

                    {/* Done count */}
                    <div style={{
                      fontWeight:800, fontSize:14,
                      color: pct === 100 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626',
                    }}>
                      {emp.done}<span style={{ fontSize:10, fontWeight:400, color:'#94a3b8' }}>/{ALL_MODULES.length}</span>
                    </div>

                    {/* Branch(es) */}
                    <div style={{ fontSize:10, color:'#475569' }}>
                      {emp.branches.slice(0,2).join(', ')}{emp.branches.length > 2 ? ' +' + (emp.branches.length-2) : ''}
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#64748b', marginBottom:3 }}>
                        <span>{pct}%</span>
                        {fullCover && <span style={{ color:'#16a34a', fontWeight:700 }}>✓ Complete</span>}
                      </div>
                      <div style={{ height:6, background:'#e2e8f0', borderRadius:99 }}>
                        <div style={{ height:6, width:`${pct}%`, background: barColor, borderRadius:99, transition:'width .3s' }}/>
                      </div>
                    </div>

                    {/* Missing modules (chips) */}
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                      {emp.missing.length === 0 ? (
                        <span style={{ fontSize:10, color:'#16a34a', fontWeight:700 }}>🏆 All modules covered</span>
                      ) : emp.missing.slice(0, 4).map(m => (
                        <span key={m} style={{
                          fontSize:9, background:'#fef2f2', border:'1px solid #fecaca',
                          color:'#dc2626', borderRadius:6, padding:'2px 6px', fontWeight:600,
                        }}>{shortLabel(m, globalLang)}</span>
                      ))}
                      {emp.missing.length > 4 && (
                        <span style={{ fontSize:9, color:'#94a3b8' }}>+{emp.missing.length - 4}</span>
                      )}
                      <span style={{ marginLeft:'auto', color:'#94a3b8', fontSize:11 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded module detail */}
                  {isExpanded && (
                    <div style={{ padding:'10px 14px 14px', background:'#fafbff', borderTop:'1px solid #f1f5f9' }}>
                      <div style={{ fontSize:10, color:'#64748b', fontWeight:700, marginBottom:8, letterSpacing:.5 }}>
                        ALL MODULES — {emp.name}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(175px,1fr))', gap:7 }}>
                        {ALL_MODULES.map(m => {
                          const info = emp.modules[m];
                          return (
                            <div key={m} style={{
                              background: info ? '#f0fdf4' : '#fff',
                              border: `1px solid ${info ? '#bbf7d0' : '#e2e8f0'}`,
                              borderRadius:8, padding:'8px 10px',
                            }}>
                              <div style={{ fontSize:10, fontWeight:700, color: info ? '#15803d' : '#94a3b8', marginBottom:2 }}>
                                {info ? '✅' : '⬜'} {shortLabel(m, globalLang)}
                              </div>
                              <div style={{ fontSize:9, color:'#64748b' }}>
                                {info
                                  ? <><strong style={{ color: scoreColor(info.score) }}>{info.score}%</strong> · {info.date}</>
                                  : <span style={{ color:'#fca5a5' }}>Not trained</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MATRIX VIEW ─── */}
        {!loading && view === 'matrix' && (
          <div style={{
            background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
            overflow:'auto',
          }}>
            <table style={{ borderCollapse:'collapse', minWidth:'100%', fontSize:11 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'#475569',
                    borderBottom:'1px solid #e2e8f0', borderRight:'1px solid #f1f5f9',
                    position:'sticky', left:0, background:'#f8fafc', zIndex:2, minWidth:160 }}>
                    Employee
                  </th>
                  {ALL_MODULES.map(m => (
                    <th key={m} style={{
                      padding:'6px 8px', textAlign:'center', fontSize:9,
                      fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0',
                      borderRight:'1px solid #f8fafc', writingMode:'vertical-lr',
                      transform:'rotate(180deg)', height:100, verticalAlign:'bottom',
                      minWidth:36,
                    }}>
                      {shortLabel(m, globalLang)}
                    </th>
                  ))}
                  <th style={{ padding:'6px 10px', textAlign:'center', fontSize:9,
                    fontWeight:700, color:'#475569', borderBottom:'1px solid #e2e8f0', minWidth:60 }}>
                    DONE
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const pct = Math.round(emp.done / ALL_MODULES.length * 100);
                  return (
                    <tr key={emp.empId || emp.name}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{
                        padding:'8px 12px', borderRight:'1px solid #f1f5f9',
                        borderBottom:'1px solid #f8fafc',
                        position:'sticky', left:0,
                        background: idx % 2 === 0 ? '#fff' : '#fafafa', zIndex:1,
                      }}>
                        <div style={{ fontWeight:700, color:'#0f172a' }}>{emp.name || '—'}</div>
                        {emp.empId && <div style={{ fontSize:9, color:'#94a3b8' }}>ID: {emp.empId}</div>}
                      </td>
                      {ALL_MODULES.map(m => {
                        const info = emp.modules[m];
                        return (
                          <td key={m} style={{
                            textAlign:'center', padding:'4px',
                            borderRight:'1px solid #f8fafc',
                            borderBottom:'1px solid #f8fafc',
                            background: info ? '#dcfce7' : '#fff',
                          }}
                          title={info ? `${m}: ${info.score}% — ${info.date}` : `${m}: Not trained`}
                          >
                            {info ? (
                              <span style={{ color: scoreColor(info.score), fontWeight:700, fontSize:10 }}>
                                {info.score}
                              </span>
                            ) : (
                              <span style={{ color:'#e2e8f0', fontSize:12 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{
                        textAlign:'center', padding:'6px 10px', fontWeight:800, fontSize:13,
                        color: pct === 100 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626',
                        borderBottom:'1px solid #f8fafc',
                      }}>
                        {emp.done}/{ALL_MODULES.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom legend */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop:10, display:'flex', gap:16, flexWrap:'wrap', fontSize:10, color:'#94a3b8' }}>
            <span>🟢 ≥80% pass</span>
            <span>🟡 60-79%</span>
            <span>🔴 &lt;60%</span>
            <span>⬜ Not trained</span>
            <span style={{ marginLeft:'auto' }}>Total: {filtered.length} employees · {ALL_MODULES.length} required modules</span>
          </div>
        )}
      </div>
    </div>
  );
}
