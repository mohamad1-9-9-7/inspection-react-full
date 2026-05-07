// src/pages/monitor/branches/qcs/EmployeeReturnToWorkInput.jsx
import React, { useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants ===== */
const TYPE = "qcs_employee_return_to_work";

const DOC_META = {
  docTitle: "Employee Return to Work Form",
  docNo: "FSM-QM/REC/ER",
  issueDate: "2023-05-01",
  issueNo: "04",
  page: "1-2 of 2",
  issuedBy: "MOHAMAD ABDULLAH",
  approvedBy: "Hussam O. Sarhan",
};

const QUESTIONNAIRE = [
  { code: "q1", text: "Welcome employee back to work", strong: false },
  { code: "q2", text: "Explain our attendance policy — conduct a return to work interview with every employee absent from work", strong: false },
  { code: "q3", text: "Discuss any issues around notification of the absence (if appropriate)", strong: false },
  { code: "q4", text: "Inform the employee of their attendance rate", strong: false },
  { code: "q5", text: "WHERE APPROPRIATE: Explain that when employee has three occasions of absence or absence of 5% within 6 months rolling period, Disciplinary hearing may follow", strong: true },
  { code: "q6", text: "WHERE APPROPRIATE: Explain that if the attendance rate does not improve or deteriorates after a warning for attendance in a 6 month rolling period, further disciplinary action may be taken", strong: true },
  { code: "q7", text: "Ask the employee if they have visited the doctor / taken any medication? (If appropriate)", strong: false },
];

const SYMPTOMS = ["Fever", "Sneezing", "Coughing", "Diarrhea", "Stomach Pain", "Vomiting"];

const DISEASES = [
  "Typhoid, paratyphoid or enteric fever",
  "Dysentery or Salmonella infection",
  "Frequent Diarrhea (lasting more than 24 hrs.)",
  "Vomiting or discharging ears",
  "Frequent boils or Septic cuts",
  "Skin Conditions such as Dermatitis, eczema or psoriasis",
  "Frequent Sore throats",
  "Infections of the mouth, nose or eyes",
  "Bronchitis or a persistent cough",
  "Yellow Jaundice",
];

/* ===== UI helpers ===== */
const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};
const input = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  boxSizing: "border-box",
  background: "#fff",
  fontSize: 13,
};
const textarea = { ...input, minHeight: 90, resize: "vertical" };
const label = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  marginBottom: 6,
};
const sectionTitle = {
  fontWeight: 900,
  background: "#0f3d2e",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  marginBottom: 10,
  marginTop: 16,
  fontSize: 13,
  letterSpacing: ".02em",
};

const ynBtn = (active, kind) => {
  const palette = kind === "yes"
    ? { bg: "#16a34a", border: "#15803d" }
    : { bg: "#dc2626", border: "#b91c1c" };
  return {
    padding: "6px 14px",
    minWidth: 60,
    borderRadius: 999,
    border: `2px solid ${active ? palette.border : "#cbd5e1"}`,
    background: active ? palette.bg : "#fff",
    color: active ? "#fff" : "#334155",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    transition: "all .15s ease",
  };
};

const submitBtn = (disabled) => ({
  width: "100%",
  background: disabled ? "#94a3b8" : "linear-gradient(135deg,#0f3d2e,#0b5236)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 16,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: "0 6px 16px rgba(11,82,54,.25)",
  marginTop: 16,
});

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <button type="button" style={ynBtn(value === "Yes", "yes")} onClick={() => onChange("Yes")}>Yes</button>
      <button type="button" style={ynBtn(value === "No", "no")} onClick={() => onChange("No")}>No</button>
    </div>
  );
}

function YesNoCompact({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      <button type="button" style={{ ...ynBtn(value === "Yes", "yes"), padding: "4px 12px", minWidth: 50 }} onClick={() => onChange("Yes")}>Yes</button>
      <button type="button" style={{ ...ynBtn(value === "No", "no"), padding: "4px 12px", minWidth: 50 }} onClick={() => onChange("No")}>No</button>
    </div>
  );
}

/* ===== Component ===== */
export default function EmployeeReturnToWorkInput() {
  const initialAnswers = useMemo(() => {
    const obj = {};
    QUESTIONNAIRE.forEach((q) => { obj[q.code] = false; });
    return obj;
  }, []);
  const initialSymptoms = useMemo(() => {
    const obj = {};
    SYMPTOMS.forEach((s) => { obj[s] = ""; });
    return obj;
  }, []);
  const initialDiseases = useMemo(() => {
    const obj = {};
    DISEASES.forEach((d) => { obj[d] = ""; });
    return obj;
  }, []);

  const [meta, setMeta] = useState({
    restaurantName: "",
    leaveStartDate: "",
    employeeNo: "EMP-",
    returnFromLeaveDate: "",
    name: "",
    datesOfVacation: "",
    countryVisited: "",
  });

  const [absence, setAbsence] = useState({
    absenceHistoryPercent: "",
    absenceHistoryOccasions: "",
    reason: "",
    medicalCertificate: "",
    previousCounselling: "",
    previousDisciplinary: "",
    liveWarningDetails: "",
  });

  const [questionnaire, setQuestionnaire] = useState(initialAnswers);
  const [currentSymptoms, setCurrentSymptoms] = useState(initialSymptoms);
  const [contactSymptoms, setContactSymptoms] = useState(initialSymptoms);
  const [diseases, setDiseases] = useState(initialDiseases);
  const [sickOnVacation, setSickOnVacation] = useState("");
  const [sickDetails, setSickDetails] = useState("");

  const [counselling, setCounselling] = useState("");
  const [disciplinaryHearing, setDisciplinaryHearing] = useState("");
  const [summary, setSummary] = useState("");

  const [employee, setEmployee] = useState({ signature: "", date: "" });
  const [manager, setManager] = useState({ name: "", date: "", signature: "", authorize: "" });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function setMetaVal(k, v) { setMeta((p) => ({ ...p, [k]: v })); }
  function setAbsenceVal(k, v) { setAbsence((p) => ({ ...p, [k]: v })); }

  function resetForm() {
    setMeta({ restaurantName: "", leaveStartDate: "", employeeNo: "EMP-", returnFromLeaveDate: "", name: "", datesOfVacation: "", countryVisited: "" });
    setAbsence({ absenceHistoryPercent: "", absenceHistoryOccasions: "", reason: "", medicalCertificate: "", previousCounselling: "", previousDisciplinary: "", liveWarningDetails: "" });
    setQuestionnaire(initialAnswers);
    setCurrentSymptoms(initialSymptoms);
    setContactSymptoms(initialSymptoms);
    setDiseases(initialDiseases);
    setSickOnVacation("");
    setSickDetails("");
    setCounselling("");
    setDisciplinaryHearing("");
    setSummary("");
    setEmployee({ signature: "", date: "" });
    setManager({ name: "", date: "", signature: "", authorize: "" });
  }

  async function handleSave() {
    if (!meta.name.trim())              return alert("Please enter the employee name.");
    if (!meta.returnFromLeaveDate)      return alert("Please enter the return from leave date.");

    const payload = {
      headerTop: {
        documentTitle: DOC_META.docTitle,
        documentNo:    DOC_META.docNo,
        issueDate:     DOC_META.issueDate,
        issueNo:       DOC_META.issueNo,
        page:          DOC_META.page,
        issuedBy:      DOC_META.issuedBy,
        approvedBy:    DOC_META.approvedBy,
      },
      employeeInfo: {
        restaurantName:       meta.restaurantName.trim(),
        leaveStartDate:       meta.leaveStartDate,
        employeeNo:           meta.employeeNo.trim(),
        returnFromLeaveDate:  meta.returnFromLeaveDate,
        name:                 meta.name.trim(),
        datesOfVacation:      meta.datesOfVacation.trim(),
        countryVisited:       meta.countryVisited.trim(),
      },
      absenceDetails: {
        absenceHistory: {
          percent:   absence.absenceHistoryPercent,
          occasions: absence.absenceHistoryOccasions,
        },
        reason:                absence.reason.trim(),
        medicalCertificate:    absence.medicalCertificate,
        previousCounselling:   absence.previousCounselling,
        previousDisciplinary:  absence.previousDisciplinary,
        liveWarningDetails:    absence.liveWarningDetails.trim(),
      },
      questionnaire: QUESTIONNAIRE.map((q) => ({
        code: q.code, text: q.text, checked: !!questionnaire[q.code],
      })),
      currentSymptoms: SYMPTOMS.map((s) => ({ symptom: s, answer: currentSymptoms[s] || "" })),
      contactSymptoms: SYMPTOMS.map((s) => ({ symptom: s, answer: contactSymptoms[s] || "" })),
      communicableDiseases: DISEASES.map((d) => ({ condition: d, answer: diseases[d] || "" })),
      vacation: {
        sick:    sickOnVacation,
        details: sickDetails.trim(),
      },
      additionalAction: {
        counselling,
        disciplinaryHearing,
      },
      summary: summary.trim(),
      employeeSignature: {
        signature: employee.signature.trim(),
        date:      employee.date,
      },
      manager: {
        name:      manager.name.trim(),
        date:      manager.date,
        signature: manager.signature.trim(),
        authorize: manager.authorize, // "authorizing" | "not authorizing"
      },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setMsg("Saving…");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "qcs", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("✅ Saved successfully");
      resetForm();
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  // any symptom/disease "Yes"
  const anyYes =
    Object.values(currentSymptoms).includes("Yes") ||
    Object.values(contactSymptoms).includes("Yes") ||
    Object.values(diseases).includes("Yes") ||
    sickOnVacation === "Yes";

  return (
    <div style={card}>
      {/* ===== Header band ===== */}
      <div
        style={{
          background: "linear-gradient(135deg,#0f3d2e,#0b5236)",
          color: "#fff",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: ".5px" }}>
            AL MAWASHI <span style={{ opacity: 0.85, fontWeight: 700 }}>المواشي</span>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, opacity: 0.95, lineHeight: 1.7 }}>
          <div>Doc No: <b>{DOC_META.docNo}</b></div>
          <div>Issue Date: <b>1.5.2023</b> — Issue No: <b>{DOC_META.issueNo}</b></div>
          <div>Page <b>{DOC_META.page}</b></div>
        </div>
      </div>

      {/* ===== Title ===== */}
      <div style={{ textAlign: "center", marginBottom: 14, padding: "10px 0", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
        <div style={{ fontStyle: "italic", color: "#0b5236", fontWeight: 900, fontSize: 17, letterSpacing: ".05em" }}>
          EMPLOYEE RETURN TO WORK FORM
        </div>
      </div>

      {/* ===== Top fields ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div>
          <span style={label}>Restaurant Name</span>
          <input style={input} placeholder="Restaurant / Branch name" value={meta.restaurantName} onChange={(e) => setMetaVal("restaurantName", e.target.value)} />
        </div>
        <div>
          <span style={label}>Leave Start Date</span>
          <input style={input} type="date" value={meta.leaveStartDate} onChange={(e) => setMetaVal("leaveStartDate", e.target.value)} />
        </div>
        <div>
          <span style={label}>Employee No.</span>
          <input style={input} placeholder="EMP-" value={meta.employeeNo} onChange={(e) => setMetaVal("employeeNo", e.target.value)} />
        </div>
        <div>
          <span style={label}>Return From Leave Date</span>
          <input style={input} type="date" value={meta.returnFromLeaveDate} onChange={(e) => setMetaVal("returnFromLeaveDate", e.target.value)} />
        </div>
        <div>
          <span style={label}>Name</span>
          <input style={input} placeholder="Full name" value={meta.name} onChange={(e) => setMetaVal("name", e.target.value)} />
        </div>
        <div>
          <span style={label}>Dates of Vacation</span>
          <input style={input} placeholder="e.g. 01/05 – 15/05" value={meta.datesOfVacation} onChange={(e) => setMetaVal("datesOfVacation", e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={label}>Country Visited</span>
        <input style={input} placeholder="Country / countries visited" value={meta.countryVisited} onChange={(e) => setMetaVal("countryVisited", e.target.value)} />
      </div>

      {/* ===== Absence Details ===== */}
      <div style={sectionTitle}>ABSENCE DETAILS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
        <div>
          <span style={label}>Absence History</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...input, flex: 1 }} placeholder="" value={absence.absenceHistoryPercent} onChange={(e) => setAbsenceVal("absenceHistoryPercent", e.target.value)} />
            <span style={{ fontWeight: 800, color: "#475569" }}>%</span>
            <input style={{ ...input, flex: 1 }} placeholder="occasions" value={absence.absenceHistoryOccasions} onChange={(e) => setAbsenceVal("absenceHistoryOccasions", e.target.value)} />
            <span style={{ fontWeight: 800, color: "#475569", whiteSpace: "nowrap" }}>Occasions</span>
          </div>
        </div>
        <div>
          <span style={label}>Reason for Absence</span>
          <input style={input} placeholder="Reason…" value={absence.reason} onChange={(e) => setAbsenceVal("reason", e.target.value)} />
        </div>
        <div>
          <span style={label}>Has a Medical Certificate Been Provided?</span>
          <YesNo value={absence.medicalCertificate} onChange={(v) => setAbsenceVal("medicalCertificate", v)} />
        </div>
        <div>
          <span style={label}>Previous Counselling</span>
          <input style={input} type="date" value={absence.previousCounselling} onChange={(e) => setAbsenceVal("previousCounselling", e.target.value)} />
        </div>
        <div>
          <span style={label}>Previous Disciplinary Warning</span>
          <input style={input} type="date" value={absence.previousDisciplinary} onChange={(e) => setAbsenceVal("previousDisciplinary", e.target.value)} />
        </div>
        <div>
          <span style={label}>Live Warning on File (Give details)</span>
          <input style={input} placeholder="Details…" value={absence.liveWarningDetails} onChange={(e) => setAbsenceVal("liveWarningDetails", e.target.value)} />
        </div>
      </div>

      {/* ===== Questionnaire ===== */}
      <div style={sectionTitle}>QUESTIONNAIRE — TICK EACH BOX AS POINTS ARE COVERED</div>
      <div style={{ display: "grid", gap: 6 }}>
        {QUESTIONNAIRE.map((q) => (
          <label key={q.code} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10,
            background: "#fafafa", cursor: "pointer", fontSize: 13,
          }}>
            <input
              type="checkbox"
              checked={!!questionnaire[q.code]}
              onChange={(e) => setQuestionnaire((p) => ({ ...p, [q.code]: e.target.checked }))}
              style={{ marginTop: 2, accentColor: "#0f3d2e", width: 16, height: 16 }}
            />
            <span style={{ color: "#0f172a", lineHeight: 1.5 }}>
              {q.strong && <b>WHERE APPROPRIATE: </b>}
              {q.strong ? q.text.replace(/^WHERE APPROPRIATE:\s*/, "") : q.text}
            </span>
          </label>
        ))}
      </div>

      {/* ===== Current Symptoms ===== */}
      <div style={sectionTitle}>DO YOU CURRENTLY SUFFER FROM ANY OF THE FOLLOWING SYMPTOMS?</div>
      <SymptomsTable items={SYMPTOMS} values={currentSymptoms} onChange={(s, v) => setCurrentSymptoms((p) => ({ ...p, [s]: v }))} />

      {/* ===== Contact Symptoms ===== */}
      <div style={sectionTitle}>HAVE YOU BEEN IN CONTACT WITH ANYONE SUFFERING FROM THE FOLLOWING IN THE LAST 48 HOURS?</div>
      <SymptomsTable items={SYMPTOMS} values={contactSymptoms} onChange={(s, v) => setContactSymptoms((p) => ({ ...p, [s]: v }))} />

      {/* ===== Communicable Diseases ===== */}
      <div style={sectionTitle}>DO YOU SUFFER FROM ANY OF THE FOLLOWING COMMUNICABLE DISEASES?</div>
      <SymptomsTable items={DISEASES} values={diseases} onChange={(s, v) => setDiseases((p) => ({ ...p, [s]: v }))} headerLabel="Condition" />

      {/* ===== Sick on vacation ===== */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10,
        background: "#fafafa", marginTop: 10, gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ fontWeight: 800, color: "#0f172a" }}>Were you sick whilst on vacation?</div>
        <YesNo value={sickOnVacation} onChange={setSickOnVacation} />
      </div>

      {sickOnVacation === "Yes" && (
        <div style={{ marginTop: 10 }}>
          <span style={label}>If Yes — Indicate When and Symptoms</span>
          <textarea style={textarea} placeholder="Date and symptoms…" value={sickDetails} onChange={(e) => setSickDetails(e.target.value)} />
        </div>
      )}

      {anyYes && (
        <div style={{
          marginTop: 12, padding: 12, border: "1px solid #fde68a",
          background: "#fffbeb", borderRadius: 10, color: "#854d0e", fontWeight: 700, fontSize: 13,
        }}>
          ⚠️ If any of the above is marked as 'YES' then you must get a Doctors Clearance Certificate before resuming work.
        </div>
      )}

      {/* ===== Additional Action ===== */}
      <div style={sectionTitle}>ADDITIONAL ACTION</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
        <div>
          <span style={label}>Counselling YES / NO</span>
          <YesNo value={counselling} onChange={setCounselling} />
        </div>
        <div>
          <span style={label}>Disciplinary Hearing YES / NO</span>
          <YesNo value={disciplinaryHearing} onChange={setDisciplinaryHearing} />
        </div>
      </div>

      {/* ===== Summary ===== */}
      <div style={{ marginTop: 12 }}>
        <span style={label}>Summary</span>
        <textarea style={textarea} placeholder="Summary of the return to work discussion…" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div style={{ fontStyle: "italic", color: "#64748b", fontSize: 12, marginTop: 6 }}>
          To the best of my knowledge the above statements are correct.
        </div>
      </div>

      {/* ===== Employee signature ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
        <div>
          <span style={label}>Employee Signature</span>
          <input style={input} placeholder="Sign here (type full name)" value={employee.signature} onChange={(e) => setEmployee((p) => ({ ...p, signature: e.target.value }))} />
        </div>
        <div>
          <span style={label}>Date</span>
          <input style={input} type="date" value={employee.date} onChange={(e) => setEmployee((p) => ({ ...p, date: e.target.value }))} />
        </div>
      </div>

      {/* ===== Manager declaration ===== */}
      <div style={{
        marginTop: 14, padding: 14, border: "1px solid #cbd5e1", borderRadius: 12,
        background: "#f8fafc", fontStyle: "italic", color: "#334155", fontSize: 13, lineHeight: 1.6,
      }}>
        I declare that based on the information above being correct, I am{" "}
        <select
          style={{
            display: "inline-block", width: "auto", padding: "4px 8px",
            border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", fontWeight: 800, color: "#0f172a",
          }}
          value={manager.authorize}
          onChange={(e) => setManager((p) => ({ ...p, authorize: e.target.value }))}
        >
          <option value="">— select —</option>
          <option value="authorizing">authorizing</option>
          <option value="not authorizing">not authorizing</option>
        </select>{" "}
        the employee to return to work.
      </div>

      <div style={sectionTitle}>COUNTER SIGNED BY MANAGER</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
        <div>
          <span style={label}>Manager Name</span>
          <input style={input} placeholder="Full name" value={manager.name} onChange={(e) => setManager((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <span style={label}>Date</span>
          <input style={input} type="date" value={manager.date} onChange={(e) => setManager((p) => ({ ...p, date: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={label}>Manager Signature</span>
          <input style={input} placeholder="Sign here (type full name)" value={manager.signature} onChange={(e) => setManager((p) => ({ ...p, signature: e.target.value }))} />
        </div>
      </div>

      <div style={{ fontSize: 11, fontStyle: "italic", color: "#64748b", marginTop: 10, padding: 10, background: "#f1f5f9", borderRadius: 8, lineHeight: 1.5 }}>
        If Manager is unclear as to whether to allow employees to return to work after vacation then he/she must get assistance from their Manager or the QA department.
      </div>

      {/* ===== Submit ===== */}
      <button onClick={handleSave} disabled={saving} style={submitBtn(saving)}>
        {saving ? "Saving…" : "📝 Submit Return to Work Form"}
      </button>
      {msg && (
        <div style={{ textAlign: "center", marginTop: 10, fontWeight: 800, color: msg.startsWith("✅") ? "#16a34a" : msg.startsWith("❌") ? "#dc2626" : "#334155" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

/* ===== Helpers ===== */
function SymptomsTable({ items, values, onChange, headerLabel = "Symptom" }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#475569", fontWeight: 800, borderBottom: "1px solid #e2e8f0" }}>{headerLabel}</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "#16a34a", fontWeight: 800, width: 100, borderBottom: "1px solid #e2e8f0" }}>Yes</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "#dc2626", fontWeight: 800, width: 100, borderBottom: "1px solid #e2e8f0" }}>No</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={s} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ padding: "8px 12px", fontSize: 13, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>{s}</td>
              <td colSpan={2} style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                <YesNoCompact value={values[s]} onChange={(v) => onChange(s, v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
