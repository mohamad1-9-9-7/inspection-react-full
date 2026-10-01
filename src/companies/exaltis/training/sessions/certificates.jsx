// src/companies/exaltis/training/sessions/certificates.jsx
// Training sessions — certificate card, modal and PDF export.
// (Split out of TrainingSessionsList.jsx — the code is unchanged.)
import { MODULE_DETAILS_BI, parseRefSections, LETTER_PALETTE } from "../TrainingReferenceModal";
import { companyName, CompanyMark, companyLine } from "../brand";
import { QRCodeCanvas } from "qrcode.react";
import { getModuleName } from "../TrainingSessionsList.helpers";
import { useState } from "react";
import { getPublicOrigin } from "../../../../config/publicOrigin";

// Default QA signatory (same as the training record's "Approved By" in TrainingSessionCreate)
export const DEFAULT_QA_MANAGER = "Hussam O.Sarhan";

// The other company's document number is not ours; blank until this company sets one.
export const TRAINING_DOC_NO = "";

export const TRAINING_DOC_REV = "0";

export const TRAINING_DOC_ISSUE = "05/02/2020";

/* Attendance-sheet styles.
   English only: the PDF is rasterised by html2canvas, which does not shape
   Arabic script — every Arabic label came out reversed and broken.
   Kept local instead of extending PDF_UI so the HSE documents are untouched. */
export const ATT = {
  title: { fontSize: 17, fontWeight: 900, letterSpacing: 1.2, color: "#0c4a6e", margin: 0, textTransform: "uppercase" },
  subtitle: { fontSize: 10.5, color: "#64748b", marginTop: 3, letterSpacing: 0.4 },
  docBox: { borderCollapse: "collapse", fontSize: 8.5, color: "#334155" },
  docKey: { border: "1px solid #cbd5e1", background: "#f1f5f9", padding: "2px 7px", fontWeight: 800, letterSpacing: 0.3, whiteSpace: "nowrap" },
  docVal: { border: "1px solid #cbd5e1", padding: "2px 7px", whiteSpace: "nowrap" },
  rule: { height: 3, background: "linear-gradient(90deg,#0c4a6e 0%,#0284c7 55%,#bae6fd 100%)", borderRadius: 2, marginTop: 10 },

  meta: { width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginTop: 14 },
  metaKey: {
    border: "1px solid #cbd5e1", background: "#f1f5f9", padding: "6px 9px",
    fontWeight: 800, fontSize: 8.5, letterSpacing: 0.6, textTransform: "uppercase",
    color: "#475569", width: 110, whiteSpace: "nowrap",
  },
  metaVal: { border: "1px solid #cbd5e1", padding: "6px 9px", fontSize: 10, fontWeight: 600, color: "#0f172a" },

  panel: { marginTop: 14, border: "1px solid #e2e8f0", borderLeft: "4px solid #0284c7", background: "#f8fafc", padding: "10px 14px" },
  panelTitle: { fontSize: 8.5, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#0c4a6e", marginBottom: 6 },
  panelLine: { fontSize: 9.5, lineHeight: 1.75, color: "#334155" },
  panelLabel: { fontWeight: 800, color: "#0f172a" },

  declaration: {
    marginTop: 14, padding: "8px 12px", border: "1px dashed #94a3b8", background: "#fffbeb",
    fontSize: 9.5, fontStyle: "italic", color: "#78350f",
  },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 9.5, marginTop: 10 },
  th: {
    border: "1px solid #0c4a6e", background: "#0c4a6e", color: "#fff",
    padding: "7px 6px", fontSize: 8.5, fontWeight: 800, letterSpacing: 0.7,
    textTransform: "uppercase", textAlign: "center",
  },
  td: { border: "1px solid #cbd5e1", padding: "8px", fontSize: 9.5, color: "#0f172a", verticalAlign: "middle" },

  footer: {
    marginTop: 16, paddingTop: 8, borderTop: "1px solid #cbd5e1",
    display: "flex", justifyContent: "space-between",
    fontSize: 8.5, color: "#64748b", letterSpacing: 0.3,
  },
};

/* ===================== Certificate card (shared by the modal and the PDF export) ===================== */
export function CertificateCard({ participant, session, moduleName, branch, date, conductedBy, verifiedBy, withPrintIds = false }) {
  if (!participant) return null;

  const name     = String(participant.name        || '').trim();
  const empId    = String(participant.employeeId  || '').trim();
  const desig    = String(participant.designation || '').trim();
  const scoreNum = parseInt(String(participant.score || '0').replace('%',''), 10) || 0;
  // No company mark: "AM-" belongs to the other company.
  const certNo   = `TR-${(date||'').replace(/-/g,'')}-${String(participant.slNo||'01').padStart(3,'0')}`;
  const qaName   = String(verifiedBy || session?.payload?.verifiedBy || DEFAULT_QA_MANAGER || '').trim();

  // ── Key training points (A–L) — from the session's own details, else the module reference
  const detailsText =
    String(session?.payload?.details || '').trim() ||
    MODULE_DETAILS_BI[moduleName] ||
    MODULE_DETAILS_BI.__DEFAULT__ ||
    '';
  const headline = (s) => {
    const t = String(s || '').split(/—|–|:/)[0].replace(/\.\s*$/, '').trim();
    return t.length > 52 ? `${t.slice(0, 50)}…` : t;
  };
  const topics = parseRefSections(detailsText)
    .slice(0, 8)
    .map(s => ({ letter: s.letter, en: headline(s.en) }))
    .filter(s => !!s.en);

  // ── Assessment summary (from the saved quiz attempt, when there is one)
  const answers  = participant?.quizAttempt?.answers || [];
  const qTotal   = answers.length;
  const qCorrect = answers.filter(a => a && a.chosen === a.correct).length;

  // Expiry = training date + 1 year
  const expiryDate = (() => {
    if (!date) return '';
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();
  const daysLeft = expiryDate
    ? Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
    : null;
  const expiryColor = daysLeft === null ? '#94a3b8'
    : daysLeft < 0 ? '#ef4444' : daysLeft < 30 ? '#f59e0b' : '#22c55e';

  // QR verify URL — works with both BrowserRouter (web) and HashRouter (Electron)
  const verifyUrl = (() => {
    const origin = getPublicOrigin();
    const isHash = origin === window.location.origin && window.location.hash.startsWith('#/');
    const base   = isHash ? `${origin}/#/sweets-training/verify` : `${origin}/sweets-training/verify`;
    const qs = [
      `cert=${encodeURIComponent(certNo)}`,
      `n=${encodeURIComponent(name)}`,
      `id=${encodeURIComponent(empId)}`,
      `mod=${encodeURIComponent(moduleName||'')}`,
      `date=${encodeURIComponent(date||'')}`,
      `score=${scoreNum}`,
      `by=${encodeURIComponent(conductedBy||'')}`,
      `qa=${encodeURIComponent(qaName||'')}`,
      `branch=${encodeURIComponent(branch||'')}`,
      `exp=${encodeURIComponent(expiryDate)}`,
      `co=${encodeURIComponent(companyName())}`,
    ].join('&');
    return `${base}?${qs}`;
  })();

  return (
    /* ── Certificate Card — exact A4 landscape ratio (297×210mm → 1123×794px @96dpi) ── */
    <div id={withPrintIds ? 'cert-print' : undefined} style={{
      width:'100%', maxWidth:1123,
      display:'flex', minHeight:794,
      borderRadius:18,
      boxShadow: withPrintIds ? '0 50px 140px rgba(0,0,0,.8)' : 'none',
      overflow:'hidden',
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
    }}>

        {/* ── LEFT PANEL (dark gradient) ── */}
        <div id={withPrintIds ? 'cert-left-panel' : undefined} style={{
          width:376, flexShrink:0,
          background:'linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#312e81 100%)',
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'space-between', padding:'36px 26px 22px', position:'relative',
          overflow:'hidden',
        }}>
          {/* Decorative arcs */}
          <div style={{
            position:'absolute', width:360, height:360, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,.06)',
            top:-80, left:-80, pointerEvents:'none',
          }}/>
          <div style={{
            position:'absolute', width:260, height:260, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,.04)',
            bottom:100, right:-80, pointerEvents:'none',
          }}/>

          {/* ── TOP GROUP ── */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            {/* Logo */}
            <div style={{
              background:'#fff', borderRadius:22, padding:9,
              boxShadow:'0 10px 40px rgba(0,0,0,.5)', marginBottom:26,
            }}>
              <CompanyMark size={90} />
            </div>

            {/* Company */}
            <div style={{ textAlign:'center', marginBottom:30 }}>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, letterSpacing:2.5, textTransform:'uppercase', marginBottom:6 }}>
                Quality Department
              </div>
              <div style={{ color:'rgba(255,255,255,.9)', fontSize:15, fontWeight:700, letterSpacing:.5 }}>
                {companyName()}
              </div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:5 }}>
                Quality Department
              </div>
            </div>

            {/* Score ring — 148×148, r=63 */}
            <div style={{ position:'relative', width:148, height:148, marginBottom:20 }}>
              <svg viewBox="0 0 148 148" style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
                <circle cx={74} cy={74} r={63} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={10}/>
                <circle cx={74} cy={74} r={63} fill="none"
                  stroke={scoreNum >= 90 ? '#34d399' : '#22c55e'}
                  strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*63 * scoreNum/100} ${2*Math.PI*63}`}
                />
              </svg>
              <div style={{
                position:'absolute', inset:0,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              }}>
                <div style={{ fontSize:36, fontWeight:900, color:'#fff', lineHeight:1 }}>{scoreNum}%</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.55)', letterSpacing:1.5, marginTop:5 }}>SCORE</div>
              </div>
            </div>

            {/* PASS badge */}
            <div style={{
              background:'linear-gradient(135deg,#16a34a,#22c55e)',
              color:'#fff', padding:'11px 34px', borderRadius:999,
              fontSize:15, fontWeight:800, letterSpacing:2,
              boxShadow:'0 5px 20px rgba(22,163,74,.5)',
              marginBottom:9,
            }}>PASSED ✓</div>
            <div style={{ color:'rgba(255,255,255,.55)', fontSize:13, letterSpacing:.5 }}>Assessment successfully completed</div>
          </div>

          {/* ── BOTTOM GROUP: QR + cert number ── */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{
              background:'#fff', borderRadius:10, padding:6,
              boxShadow:'0 4px 16px rgba(0,0,0,.4)',
            }}>
              {/* Canvas (not SVG) so it survives html2canvas; oversized then scaled down for crisp print */}
              <QRCodeCanvas value={verifyUrl} size={336} level="M" style={{ width:112, height:112, display:'block' }} />
            </div>
            <div style={{ color:'rgba(255,255,255,.3)', fontSize:9, letterSpacing:1.8, textTransform:'uppercase', marginTop:2 }}>
              Scan to Verify
            </div>
            <div style={{ color:'rgba(255,255,255,.2)', fontSize:8.5, letterSpacing:.8 }}>{certNo}</div>
          </div>
        </div>

        {/* ── RIGHT PANEL (white) ── */}
        <div style={{
          flex:1, background:'#ffffff',
          display:'flex', flexDirection:'column',
          padding:'34px 48px 26px',
        }}>
          {/* Header label */}
          <div style={{ marginBottom:18 }}>
            <div style={{
              fontSize:13.5, fontWeight:800, letterSpacing:6,
              color:'#6366f1', textTransform:'uppercase', marginBottom:8,
            }}>Certificate of Achievement</div>
            <div style={{
              fontFamily:"Georgia,'Times New Roman',serif",
              fontSize:28, fontWeight:700, color:'#0f172a', letterSpacing:'-0.01em', lineHeight:1.15,
            }}>Food Safety &amp; Quality Training</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:11 }}>
              <div style={{ height:4, width:84, background:'linear-gradient(90deg,#4338ca,#6366f1)', borderRadius:99 }}/>
              <div style={{ height:4, width:16, background:'#c7d2fe', borderRadius:99 }}/>
            </div>
          </div>

          {/* Intro */}
          <div style={{ fontSize:15.5, color:'#94a3b8', marginBottom:8, fontStyle:'italic' }}>
            This is to certify that
          </div>

          {/* Name — main focal point of the certificate */}
          <div style={{
            fontFamily:"Georgia,'Times New Roman',serif",
            fontSize:26, fontWeight:700, color:'#0f172a',
            letterSpacing:2, lineHeight:1.2, marginBottom:10,
            textTransform:'uppercase', wordBreak:'break-word',
          }}>{name || '— —'}</div>

          {/* ID + Designation chips */}
          <div style={{ display:'flex', gap:11, marginBottom:12, flexWrap:'wrap' }}>
            {empId && (
              <span style={{
                fontSize:14.5, fontWeight:700, color:'#4338ca',
                background:'#eef2ff', border:'1px solid #c7d2fe',
                padding:'7px 20px', borderRadius:999,
              }}>ID: {empId}</span>
            )}
            {desig && (
              <span style={{
                fontSize:14.5, fontWeight:600, color:'#475569',
                background:'#f8fafc', border:'1px solid #e2e8f0',
                padding:'7px 20px', borderRadius:999,
              }}>{desig}</span>
            )}
          </div>

          {/* Hairline rule under the identity block */}
          <div style={{ height:1, background:'#e2e8f0', marginBottom:14 }}/>

          {/* Statement */}
          <div style={{ fontSize:15.5, color:'#475569', marginBottom:10, lineHeight:1.6 }}>
            has successfully completed and <span style={{ fontWeight:700, color:'#15803d' }}>PASSED</span> the training module:
          </div>

          {/* Module name */}
          <div style={{
            background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',
            border:'2px solid #c7d2fe',
            borderLeft:'6px solid #4338ca',
            borderRadius:13, padding:'15px 24px',
            fontSize:22, fontWeight:800, color:'#1e3a8a',
            marginBottom:16, letterSpacing:'-0.01em',
          }}>{getModuleName(moduleName, 'en')}</div>

          {/* ── Key training points covered ── */}
          {topics.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:11 }}>
                <div style={{
                  fontSize:12, fontWeight:800, letterSpacing:2.8,
                  color:'#4338ca', textTransform:'uppercase', whiteSpace:'nowrap',
                }}>Key Training Points Covered</div>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px 24px' }}>
                {topics.map((t, i) => (
                  <div key={t.letter || i} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <span style={{
                      width:22, height:22, borderRadius:7, flexShrink:0, marginTop:1,
                      background: LETTER_PALETTE[i % LETTER_PALETTE.length],
                      color:'#fff', fontSize:11.5, fontWeight:800,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>{t.letter}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#1e293b', lineHeight:1.45 }}>{t.en}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta strip — record details */}
          <div style={{
            marginTop:'auto', marginBottom:14,
            border:'1px solid #e2e8f0', borderRadius:12,
            background:'#f8fafc',
            display:'grid', gridTemplateColumns:`repeat(${qTotal > 0 ? 5 : 4}, 1fr)`,
            overflow:'hidden',
          }}>
            {[
              ['Date of Training', date || '—', '#0f172a'],
              ['Branch / Location', branch || '—', '#0f172a'],
              ['Pass Mark', '80%', '#15803d'],
              ...(qTotal > 0 ? [['Assessment', `${qCorrect} / ${qTotal} correct`, '#0f172a']] : []),
              ['Valid Until', expiryDate || '—', expiryColor],
            ].map(([label, value, color], i) => (
              <div key={label} style={{
                padding:'10px 15px',
                borderLeft: i === 0 ? 'none' : '1px solid #e2e8f0',
              }}>
                <div style={{
                  fontSize:9.5, fontWeight:700, letterSpacing:1.2,
                  color:'#94a3b8', textTransform:'uppercase', marginBottom:5,
                }}>{label}</div>
                <div style={{ fontSize:14, fontWeight:800, color }}>{value}</div>
                {label === 'Valid Until' && daysLeft !== null && daysLeft < 60 && (
                  <div style={{ fontSize:10.5, color:expiryColor, marginTop:2, fontWeight:600 }}>
                    {daysLeft < 0 ? 'EXPIRED' : `${daysLeft} days left`}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Signature row */}
          <div style={{ display:'flex', gap:56, justifyContent:'space-between' }}>
            {/* Trainer */}
            <div style={{ flex:1 }}>
              <div style={{
                height:44, borderBottom:'1.5px solid #334155',
                marginBottom:7, display:'flex', alignItems:'flex-end',
                paddingBottom:6,
              }}>
                {conductedBy && (
                  <span style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>{conductedBy}</span>
                )}
              </div>
              <div style={{
                fontSize:10.5, color:'#64748b', fontWeight:700,
                letterSpacing:1.4, textTransform:'uppercase',
              }}>Trainer</div>
              <div style={{ fontSize:10, color:'#cbd5e1', marginTop:3 }}>Conducted the training session</div>
            </div>

            {/* QA Manager */}
            <div style={{ flex:1 }}>
              <div style={{
                height:44, borderBottom:'1.5px solid #334155', marginBottom:7,
                display:'flex', alignItems:'flex-end', paddingBottom:6,
              }}>
                {qaName && (
                  <span style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>{qaName}</span>
                )}
              </div>
              <div style={{
                fontSize:10.5, color:'#64748b', fontWeight:700,
                letterSpacing:1.4, textTransform:'uppercase',
              }}>Quality Manager</div>
              <div style={{ fontSize:10, color:'#cbd5e1', marginTop:3 }}>{companyLine("Quality Department")}</div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            marginTop:14, paddingTop:11, borderTop:'1px solid #f1f5f9',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ fontSize:11, color:'#cbd5e1', letterSpacing:.5 }}>{companyLine("Quality Department")}</span>
            <span style={{ fontSize:11, color:'#cbd5e1' }}>{[TRAINING_DOC_NO, "ISO 22000:2018"].filter(Boolean).join(" • ")}</span>
          </div>
        </div>
      </div>
  );
}

/* ===================== Certificate → PDF (single + bulk) ===================== */
export const certFileName = (n) =>
  String(n || 'Participant').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_') || 'Participant';

export async function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    imgs.map(im => (im.complete ? Promise.resolve() : new Promise(res => { im.onload = im.onerror = res; })))
  );
}

/** Snapshot a certificate node onto a full A4-landscape PDF page (fit + centered). */
export async function addCertPage(pdf, node, html2canvas, isFirst) {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1123,
  });
  if (!isFirst) pdf.addPage('a4', 'landscape');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
}

/**
 * Render one certificate per participant off-screen and export them as a single
 * multi-page A4-landscape PDF (one page per participant).
 */
export async function exportCertificatesPdf(items, common, fileName) {
  if (!items.length) return;
  const [{ default: html2canvas }, { default: jsPDF }, { createRoot }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
    import('react-dom/client'),
  ]);

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-20000px;top:0;width:1123px;background:#fff;z-index:-1;';
  document.body.appendChild(holder);
  const root = createRoot(holder);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  try {
    for (let i = 0; i < items.length; i++) {
      await new Promise(res => {
        root.render(
          <div style={{ width: 1123, background: '#fff' }}>
            <CertificateCard {...common} participant={items[i]} />
          </div>
        );
        setTimeout(res, 260);
      });
      await waitForImages(holder);
      await addCertPage(pdf, holder.firstElementChild, html2canvas, i === 0);
    }
    pdf.save(fileName);
  } finally {
    root.unmount();
    holder.remove();
  }
}

/* ===================== Certificate Modal ===================== */
export function CertificateModal({ open, onClose, participant, session, moduleName, branch, date, conductedBy, verifiedBy, lang = "en" }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  if (!open || !participant) return null;

  const name = String(participant.name || '').trim();
  const cardProps = { session, moduleName, branch, date, conductedBy, verifiedBy };

  const doPrint = () => {
    // Set filename: browser uses document.title as the PDF filename
    const prevTitle = document.title;
    document.title = `Training_Certificate_${certFileName(name)}`;

    const s = document.createElement('style');
    s.id = '_cert_ps_';
    s.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 0; }
        body > * { display: none !important; }
        body > #root { display: block !important; }
        #cert-overlay {
          display: flex !important;
          position: fixed !important; inset: 0 !important;
          background: #fff !important;
          backdrop-filter: none !important;
          align-items: flex-start !important;
          justify-content: center !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .cert-noprint { display: none !important; }
        #cert-print {
          display: flex !important;
          width: 297mm !important;
          height: 210mm !important;
          max-width: none !important;
          min-height: 0 !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #cert-print * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #cert-left-panel {
          background: linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#312e81 100%) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(s);
    window.print();
    setTimeout(() => {
      document.getElementById('_cert_ps_')?.remove();
      document.title = prevTitle;
    }, 1500);
  };

  const doPdf = async () => {
    setPdfBusy(true);
    try {
      await exportCertificatesPdf(
        [participant],
        cardProps,
        `Training_Certificate_${certFileName(name)}.pdf`
      );
    } catch (e) {
      alert(`Could not build the PDF: ${e?.message || e}`);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div
      id="cert-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:10000,
        background:'rgba(6,9,22,0.92)', backdropFilter:'blur(14px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px 16px', overflowY:'auto',
      }}
    >
      {/* Floating action bar */}
      <div className="cert-noprint" style={{
        position:'fixed', top:20, right:20,
        display:'flex', gap:10, zIndex:1,
      }}>
        <button onClick={doPdf} disabled={pdfBusy} style={{
          background:'linear-gradient(135deg,#047857,#10b981)',
          color:'#fff', border:'none', borderRadius:12,
          padding:'11px 22px', fontWeight:700, fontSize:13,
          cursor: pdfBusy ? 'wait' : 'pointer', opacity: pdfBusy ? .7 : 1,
          boxShadow:'0 4px 18px rgba(16,185,129,.45)',
          display:'flex', alignItems:'center', gap:7,
        }}>{pdfBusy ? '⏳ Building PDF…' : '⬇️ Download PDF'}</button>
        <button onClick={doPrint} style={{
          background:'linear-gradient(135deg,#4338ca,#6366f1)',
          color:'#fff', border:'none', borderRadius:12,
          padding:'11px 22px', fontWeight:700, fontSize:13, cursor:'pointer',
          boxShadow:'0 4px 18px rgba(99,102,241,.5)',
          display:'flex', alignItems:'center', gap:7,
        }}>🖨️ Print</button>
        <button onClick={onClose} style={{
          background:'rgba(255,255,255,.08)', color:'#fff',
          border:'1px solid rgba(255,255,255,.18)',
          borderRadius:12, padding:'11px 15px', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>✕</button>
      </div>

      <CertificateCard {...cardProps} participant={participant} withPrintIds />
    </div>
  );
}
