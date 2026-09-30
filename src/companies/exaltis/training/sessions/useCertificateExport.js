// src/companies/exaltis/training/sessions/useCertificateExport.js
// Training sessions — certificate selection and PDF export, attendance sheet.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { safeDate, todayISO, safeBranch, safeModule } from "../TrainingSessionsList.helpers";
import { certFileName, exportCertificatesPdf, DEFAULT_QA_MANAGER } from "./certificates";
import { exportNodeToPdf, safeFileName } from "../../../../utils/nodeToPdf";

export function useCertificateExport({ participants, certSel, setCertSel, setBulkCertBusy, selected, moduleName, setSheetBusy, attendanceRef }) {
  const certEligible = participants
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => String(p.result || "").toUpperCase() === "PASS" && String(p.name || "").trim());
  const certChosen = certEligible.filter(({ i }) => certSel[i]);
  const certTargets = (certChosen.length ? certChosen : certEligible).map(({ p }) => p);
  const allCertsSelected = certEligible.length > 0 && certChosen.length === certEligible.length;

  const toggleCertRow = (i) =>
    setCertSel((prev) => {
      const next = { ...prev };
      if (next[i]) delete next[i];
      else next[i] = true;
      return next;
    });

  const toggleAllCerts = () => {
    if (allCertsSelected) return setCertSel({});
    const next = {};
    certEligible.forEach(({ i }) => { next[i] = true; });
    setCertSel(next);
  };

  const runCertExport = async (list) => {
    if (!list.length) {
      alert("No passed participants to build certificates for.");
      return;
    }
    setBulkCertBusy(true);
    try {
      const stamp = safeDate(selected) || todayISO();
      const fileName =
        list.length === 1
          ? `Training_Certificate_${certFileName(list[0].name)}.pdf`
          : `Training_Certificates_${certFileName(moduleName || "Module")}_${stamp}.pdf`;
      await exportCertificatesPdf(
        list,
        {
          session: selected,
          moduleName,
          branch: safeBranch(selected),
          date: stamp,
          conductedBy: selected?.payload?.conductedBy || "",
          verifiedBy: selected?.payload?.verifiedBy || DEFAULT_QA_MANAGER,
        },
        fileName
      );
    } catch (e) {
      alert(`Could not build the certificates PDF: ${e?.message || e}`);
    } finally {
      setBulkCertBusy(false);
    }
  };

  const downloadCertificates = () => runCertExport(certTargets);

  /* كشف حضور موقّع — الدليل الذي يطلبه المدقق على أن التدريب نُفّذ فعلاً */
  const downloadAttendanceSheet = async () => {
    if (!selected) return;
    setSheetBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      await exportNodeToPdf(
        attendanceRef.current,
        safeFileName("Attendance_" + safeModule(selected) + "_" + (safeDate(selected) || "")),
        { orientation: "p" }
      );
    } catch (e) {
      alert("Attendance sheet error: " + (e?.message || e));
    } finally {
      setSheetBusy(false);
    }
  };
  return { certEligible, certChosen, allCertsSelected, toggleCertRow, toggleAllCerts, runCertExport, downloadCertificates, downloadAttendanceSheet };
}
