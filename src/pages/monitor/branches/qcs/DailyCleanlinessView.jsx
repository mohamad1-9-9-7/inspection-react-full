// src/pages/monitor/branches/qcs/DailyCleanlinessView.jsx
import React from "react";

/* ===== ثوابت/مساعدات محلية ===== */
const LOGO_URL = "/brand/al-mawashi.jpg";
const thB = (center=false)=>({ border:"1px solid #000", padding:"4px", fontWeight:800, textAlign:center?"center":"left", whiteSpace:"nowrap" });
const tdB = (center=false)=>({ border:"1px solid #000", padding:"4px", textAlign:center?"center":"left" });

function Row({label, value}) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #000" }}>
      <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700 }}>{label}</div>
      <div style={{ padding:"6px 8px", flex:1 }}>{value}</div>
    </div>
  );
}
function CCPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
        </div>
        <div style={{ borderInlineEnd:"1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision No:" value={header.revisionNo} />
          <Row label="Issued By:" value={header.issuedBy} />
          <Row label="Approved By:" value={header.approvedBy} />
        </div>
      </div>
      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          CLEANING CHECKLIST - WAREHOUSE
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
          <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}

/* ===== المكوّن ===== */
export default function DailyCleanlinessView({
  ccHeader,
  selectedCleanDate,
  cleanlinessRows,
  ccFooter,
}) {
  return (
    <>
      <CCPrintHeader header={ccHeader} selectedDate={selectedCleanDate} />

      <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left", border:"1px solid #000", tableLayout:"fixed", wordBreak:"break-word" }}>
        <thead>
          <tr style={{ background:"#d9d9d9" }}>
            <th style={thB(true)}>SI-No</th>
            <th style={thB(false)}>General Cleaning</th>
            <th style={thB(true)}>Observation (C / N / C)</th>
            <th style={thB(false)}>Informed to</th>
            <th style={thB(false)}>Remarks & CA</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(cleanlinessRows) && cleanlinessRows.length>0 ? (
            cleanlinessRows.map((r,i)=>{
              const isSection = !!r?.isSection;
              const letter = r?.letter || (typeof r?.slNo!=="undefined" ? r.slNo : i+1);
              const general = r?.general || r?.itemEn || r?.itemAr || r?.groupEn || r?.groupAr || "";
              const observation = r?.observation || r?.result || "";
              const informedTo = r?.informedTo || r?.informed || "";
              const remarks = r?.remarks || "";
              if (isSection){
                return (
                  <tr key={`sec-${i}`} style={{ background:"#f2f2f2", fontWeight:800 }}>
                    <td style={tdB(true)}>—</td>
                    <td style={tdB(false)}>{r.section || general}</td>
                    <td style={tdB(true)} />
                    <td style={tdB(false)} />
                    <td style={tdB(false)} />
                  </tr>
                );
              }
              return (
                <tr key={`row-${i}`}>
                  <td style={tdB(true)}>{letter}</td>
                  <td style={{ ...tdB(false), whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{general}</td>
                  <td style={tdB(true)}>{observation}</td>
                  <td style={tdB(false)}>{informedTo}</td>
                  <td style={{ ...tdB(false), whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{remarks}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} style={{ ...tdB(true), color:"#6b7280" }}>No rows.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop:6, fontStyle:"italic" }}>
        *(C – Conform &nbsp;&nbsp;&nbsp; N / C – Non Conform)
      </div>

      <div style={{ border:"1px solid #000", marginTop:8 }}>
        <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
          REMARKS/CORRECTIVE ACTIONS:
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #000" }}>
          <div style={{ display:"flex", minHeight:42 }}>
            <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:180, fontWeight:900, textDecoration:"underline" }}>
              CHECKED BY: <span style={{ fontWeight:400 }}>(QC-ASSIST)</span>
            </div>
            <div style={{ padding:"6px 8px", flex:1 }}>
              {(ccFooter?.checkedBy ?? "") || "\u00A0"}
            </div>
          </div>
          <div style={{ display:"flex", borderInlineStart:"1px solid #000", minHeight:42 }}>
            <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:180, fontWeight:900, textDecoration:"underline" }}>
              VERIFIED BY:
            </div>
            <div style={{ padding:"6px 8px", flex:1 }}>
              {(ccFooter?.verifiedBy ?? "") || "\u00A0"}
            </div>
          </div>
        </div>
        <div style={{ padding:"8px 10px", lineHeight:1.6 }}>
          <div>Remark: Frequency — Daily</div>
          <div>* (C = Conform &nbsp;&nbsp;&nbsp;&nbsp; N / C = Non Conform)</div>
        </div>
      </div>
    </>
  );
}
