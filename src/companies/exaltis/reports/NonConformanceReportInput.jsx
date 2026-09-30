// src/companies/exaltis/reports/NonConformanceReportInput.jsx
//
// Non-Conformance Report (NCR) — entry form.
//
// The sheet used to be a stack of black-bordered tables that copied the paper
// form cell for cell. It is now a set of numbered cards in the app's own light
// palette; the official document-control block is kept (an auditor still asks
// for Document No / Revision No) but folded away at the top instead of eating
// the first screen.
//
// Three rules the old form got wrong and this one gets right:
//
//  1. Location is a BRANCH, not free text. It is picked from the one master
//     branch list (inspectionBranches.js) and stored as a canonical code in
//     `payload.location` and `payload.branch`, so the reports view and every
//     branch filter in the app can group NCRs without guessing at spelling.
//  2. NC No. is allocated by the SERVER (`payload.refNo`, "NCR-000042"),
//     never typed. Two people writing an NCR at the same moment can no longer
//     hand themselves the same number. Legacy records that carry a hand-typed
//     headRow.ncNo keep showing it.
//  3. An NCR is OPENED open. Only `status = Closed` requires the corrective
//     action and the final QA closure — before that the record saves freely,
//     which is the whole point of raising one.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SWEETS_AREAS, canonicalSweetsArea, isKnownSweetsArea } from "./sweetsAreas";
import { Bi, bi } from "./bilingual";
import API_BASE from "../../../config/api";
import { IS_SAME_ORIGIN, LOGO_FALLBACK, DEFAULT_TYPE, DEFAULT_REPORTER, DEFAULT_HEADER_LINE, MAX_EVIDENCE_IMAGES, STATUSES, uploadViaServer, deleteImage, fetchExistingNCByDate, fetchExistingNCById, todayDubaiISO, isISODate } from "./ncr/ncrModel";
import { NCR_CSS } from "./ncr/ncrStyles";
import { Card, Field } from "./ncr/ncrUi";
import { NcrClosureCard } from "./ncr/NcrClosureCard";
import { NcrQaVerificationCard } from "./ncr/NcrQaVerificationCard";
import { NcrEvidenceCard } from "./ncr/NcrEvidenceCard";
import { NcrCorrectiveActionCard } from "./ncr/NcrCorrectiveActionCard";
import { NcrIdentificationCard } from "./ncr/NcrIdentificationCard";

/* =========================
   Component
========================= */
export default function NonConformanceReportInput(props) {
  const {
    logoUrl,
    type: typeProp,
    reporter: reporterProp,
    headerLine,
    defaultBranch,
    bilingual = false,
  } = props || {};
  const TYPE = typeProp || DEFAULT_TYPE;
  const REPORTER = reporterProp || DEFAULT_REPORTER;
  const HEADER_LINE = headerLine || DEFAULT_HEADER_LINE;

  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get("date");
  const queryReportId = searchParams.get("reportId");

  const evidenceInputRef = useRef(null);
  /* Which evidence URLs are actually attached to a record already saved on
     the server (set by applyPayload/on save) — vs. ones the user has only
     uploaded locally this session. Only the latter are safe to delete from
     the image server on "New NCR" / "Clear all": deleting an already-saved
     record's images out from under it (without touching that record) would
     leave it pointing at broken URLs. */
  const loadedEvidenceImagesRef = useRef([]);

  const [header] = useState({
    documentTitle: "",
    documentNo: "",
    issueDate: "",
    revisionNo: "",
    area: "",
    issuedBy: "",
    controllingOfficer: "",
    approvedBy: "",
  });

  const [dateISO, setDateISO] = useState(() =>
    isISODate(queryDate) ? queryDate : todayDubaiISO()
  );

  const [location, setLocation] = useState(defaultBranch || "");
  const [refNo, setRefNo] = useState("");       // server-allocated, read-only
  const [legacyNcNo, setLegacyNcNo] = useState(""); // hand-typed number on old records
  const [issuedTo, setIssuedTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  const [sources, setSources] = useState({
    inhouseQC: false,
    customerComplaint: false,
    internalAudit: false,
    externalAudit: false,
  });

  const [details, setDetails] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [department, setDepartment] = useState("");

  const [implementationOwner, setImplementationOwner] = useState("");
  const [targetCompletionDateISO, setTargetCompletionDateISO] = useState("");
  const [status, setStatus] = useState("Open");

  const [evidenceImages, setEvidenceImages] = useState([]);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceMsg, setEvidenceMsg] = useState("");

  const [verification, setVerification] = useState("Satisfactory");
  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [verifiedByQADateISO, setVerifiedByQADateISO] = useState("");
  const [qaVerificationResult, setQaVerificationResult] = useState("Satisfactory");
  const [followupActionsRequired, setFollowupActionsRequired] = useState("");
  const [followupResponsible, setFollowupResponsible] = useState("");
  const [followupTargetDateISO, setFollowupTargetDateISO] = useState("");
  const [closureDateISO, setClosureDateISO] = useState("");

  const [finalQaName, setFinalQaName] = useState("");
  const [finalQaDateISO, setFinalQaDateISO] = useState("");
  const [finalQaApproved, setFinalQaApproved] = useState(false);

  const [signature, setSignature] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsibleSignature, setResponsibleSignature] = useState("");

  const [opMsg, setOpMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false); // show red outlines only after a failed save
  const [editingReportId, setEditingReportId] = useState(queryReportId || "");

  /* A deliberate blank sheet. Several NCRs can share one day (one per branch,
     or two on the same branch), but the by-date lookup below can only return
     the newest — so "New report" has to switch that lookup off, otherwise the
     effect would immediately pull the old record back over the blank form. */
  const [draftNew, setDraftNew] = useState(false);

  /* ---- Closing an NCR is the only state with extra requirements ---- */
  const closing = status === "Closed";
  const missing = useMemo(() => {
    const m = {};
    if (!dateISO) m.date = true;
    if (!location.trim()) m.location = true;
    if (!details.trim()) m.details = true;
    if (closing) {
      if (!correctiveAction.trim()) m.correctiveAction = true;
      if (!finalQaName.trim()) m.finalQaName = true;
      if (!finalQaDateISO) m.finalQaDate = true;
      if (!finalQaApproved) m.finalQaApproved = true;
    }
    return m;
  }, [dateISO, location, details, closing, correctiveAction, finalQaName, finalQaDateISO, finalQaApproved]);

  /* Branch options: Sweets' own location list, plus whatever a legacy record
     already carries so an old free-text location never silently disappears. */
  const branchOptions = useMemo(() => {
    const list = SWEETS_AREAS.map((b) => ({
      code: b.code,
      label: `${b.icon}  ${b.labelEn}`,
    }));
    if (location && !isKnownSweetsArea(location)) {
      list.unshift({ code: location, label: `⚠️  ${location} (legacy)` });
    }
    return list;
  }, [location]);

  useEffect(() => {
    if (isISODate(queryDate)) setDateISO(queryDate);
  }, [queryDate]);

  useEffect(() => {
    setEditingReportId(queryReportId || "");
  }, [queryReportId]);

  /* ---- Load the record for the chosen date / id ---- */
  useEffect(() => {
    let cancelled = false;

    function applyPayload(payload = {}) {
      const head = payload.headRow || {};
      const reference = payload.reference || {};
      const extras = payload.correctiveActionExtras || {};
      const evidence = extras.evidence || {};
      const qa = payload.qaVerification || {};
      const finalQa = payload.finalQaClosure || {};
      const sig = payload.signature || {};

      const rawLoc = payload.branch || payload.location || "";
      const code = canonicalSweetsArea(rawLoc);
      setLocation(code || defaultBranch || "");
      setRefNo(payload.refNo || "");
      setLegacyNcNo(payload.refNo ? "" : head.ncNo || "");
      setIssuedTo(head.issuedTo || "");
      setIssuedBy(head.issuedBy || "");
      setSources({
        inhouseQC: !!reference.inhouseQC,
        customerComplaint: !!reference.customerComplaint,
        internalAudit: !!reference.internalAudit,
        externalAudit: !!reference.externalAudit,
      });
      setDetails(payload.detailsBlock || "");
      setCorrectiveAction(payload.correctiveAction || "");
      setImplementationOwner(extras.implementationOwner || "");
      setTargetCompletionDateISO(extras.targetCompletionDateISO || "");
      setStatus(extras.status || "Open");
      {
        const loadedImages = Array.isArray(evidence.images) ? evidence.images.slice(0, MAX_EVIDENCE_IMAGES) : [];
        setEvidenceImages(loadedImages);
        loadedEvidenceImagesRef.current = loadedImages;
      }
      setPerformedBy(payload.performedBy || "");
      setDepartment(payload.department || "");
      setVerification(payload.verificationOfCorrectiveAction || "Satisfactory");
      setVerifiedByQA(qa.verifiedByQA || "");
      setVerifiedByQADateISO(qa.dateISO || "");
      setQaVerificationResult(qa.result || "Satisfactory");
      setFollowupActionsRequired(qa.followupActionsRequired || "");
      setFollowupResponsible(qa.followupResponsible || "");
      setFollowupTargetDateISO(qa.followupTargetDateISO || "");
      setClosureDateISO(qa.closureDateISO || "");
      setFinalQaName(finalQa.name || "");
      setFinalQaDateISO(finalQa.dateISO || "");
      setFinalQaApproved(!!finalQa.approved);
      setSignature(sig.signature || "");
      setSignatureDate(sig.date || "");
      setResponsiblePerson(sig.responsiblePerson || "");
      setResponsibleSignature(sig.responsibleSignature || "");
      setTouched(false);
    }

    (async () => {
      if (!dateISO || draftNew) return;
      if (editingReportId && dateISO !== queryDate) return;
      const existing = editingReportId
        ? await fetchExistingNCById(editingReportId)
        : await fetchExistingNCByDate(dateISO, TYPE);
      if (cancelled) return;
      applyPayload(existing?.payload || {});
      if (existing?.id) {
        setEditingReportId(existing.id);
        setOpMsg(`Loaded the report saved on ${dateISO}. · تم تحميل التقرير المحفوظ.`);
        setTimeout(() => setOpMsg(""), 2500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateISO, TYPE, editingReportId, queryDate, draftNew, defaultBranch]);

  const monthText = useMemo(() => {
    const m = String(dateISO || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [dateISO]);

  /* ---- Evidence ---- */
  async function addEvidenceImagesFromFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    const remaining = MAX_EVIDENCE_IMAGES - evidenceImages.length;
    if (remaining <= 0) return alert(`Maximum ${MAX_EVIDENCE_IMAGES} images. · الحد الأقصى ${MAX_EVIDENCE_IMAGES} صور.`);

    const toUpload = files.slice(0, remaining);

    try {
      setEvidenceBusy(true);
      setEvidenceMsg("Uploading…");

      const urls = [];
      for (const f of toUpload) {
        if (!String(f.type || "").startsWith("image/")) continue;
        try {
          const url = await uploadViaServer(f);
          if (url) urls.push(url);
        } catch (e) {
          console.error(e);
        }
      }

      if (urls.length) {
        setEvidenceImages((prev) => [...prev, ...urls].slice(0, MAX_EVIDENCE_IMAGES));
        setEvidenceMsg(`Uploaded ${urls.length} image(s).`);
      } else {
        setEvidenceMsg("No images uploaded.");
      }
    } finally {
      setEvidenceBusy(false);
      setTimeout(() => setEvidenceMsg(""), 2500);
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
    }
  }

  async function removeEvidenceImageAt(index) {
    const url = evidenceImages[index];
    if (!url) return;
    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
    try {
      await deleteImage(url);
      setEvidenceMsg("Image removed.");
    } catch (e) {
      console.error(e);
      setEvidenceMsg("Removed locally (server delete failed).");
    } finally {
      setTimeout(() => setEvidenceMsg(""), 2200);
    }
  }

  /* ---- Status ---- */
  function chooseStatus(next) {
    setStatus(next);
    // Closing without a closure date is the commonest omission — prefill it.
    if (next === "Closed" && !closureDateISO) setClosureDateISO(todayDubaiISO());
  }

  function startNewReport() {
    if (
      (details.trim() || evidenceImages.length > 0) &&
      !window.confirm("Start a blank NCR? Anything not saved on this one is lost. · بدء تقرير فارغ؟ سيضيع أي شيء غير محفوظ.")
    ) {
      return;
    }
    // Only delete images that were uploaded this session and never made it
    // into a saved record — an image already attached to a saved NCR (loaded
    // via the same-day lookup or the Edit button) must be left alone here;
    // this screen is only leaving it behind, not deleting it.
    const savedImages = new Set(loadedEvidenceImagesRef.current);
    evidenceImages.forEach((url) => {
      if (savedImages.has(url)) return;
      deleteImage(url).catch((e) => console.error("startNewReport: failed to delete orphaned evidence image", url, e));
    });

    setDraftNew(true);
    setEditingReportId("");
    setRefNo("");
    setLegacyNcNo("");
    setLocation(defaultBranch || "");
    setIssuedTo("");
    setIssuedBy("");
    setSources({ inhouseQC: false, customerComplaint: false, internalAudit: false, externalAudit: false });
    setDetails("");
    setCorrectiveAction("");
    setImplementationOwner("");
    setTargetCompletionDateISO("");
    setStatus("Open");
    setEvidenceImages([]);
    loadedEvidenceImagesRef.current = [];
    setPerformedBy("");
    setDepartment("");
    setVerification("Satisfactory");
    setVerifiedByQA("");
    setVerifiedByQADateISO("");
    setQaVerificationResult("Satisfactory");
    setFollowupActionsRequired("");
    setFollowupResponsible("");
    setFollowupTargetDateISO("");
    setClosureDateISO("");
    setFinalQaName("");
    setFinalQaDateISO("");
    setFinalQaApproved(false);
    setSignature("");
    setSignatureDate("");
    setResponsiblePerson("");
    setResponsibleSignature("");
    setTouched(false);
    setOpMsg("New blank NCR — it gets its number when you save. · تقرير جديد — يأخذ رقمه عند الحفظ.");
    setTimeout(() => setOpMsg(""), 3000);
  }

  /* ---- Save ---- */
  async function saveNCToServer() {
    const keys = Object.keys(missing);
    if (keys.length) {
      setTouched(true);
      const first = {
        date: "Pick the report date. · اختر تاريخ التقرير.",
        location: "Pick the branch. · اختر الفرع.",
        details: "Describe the non-conformance. · اشرح عدم المطابقة.",
        correctiveAction: "Closing an NCR needs the corrective action written down. · الإغلاق يتطلب كتابة الإجراء التصحيحي.",
        finalQaName: "Closing an NCR needs the QA name. · الإغلاق يتطلب اسم الجودة.",
        finalQaDate: "Closing an NCR needs the closure date. · الإغلاق يتطلب تاريخ الإغلاق.",
        finalQaApproved: "Closing an NCR needs the QA approval ticked. · الإغلاق يتطلب اعتماد الجودة.",
      }[keys[0]];
      alert(first);
      return;
    }

    const payload = {
      headerTop: header,
      title: "NON-CONFORMANCE REPORT",
      // Canonical branch code, written to both keys: `location` is what the
      // NCR view and the Excel export already read, `branch` is what every
      // branch filter in the app reads.
      location,
      branch: location,
      headRow: {
        reportDate: dateISO,
        ncNo: refNo || legacyNcNo,  // display copy; the server owns payload.refNo
        issuedTo,
        issuedBy,
      },
      reference: { ...sources },
      detailsBlock: details,
      correctiveAction,
      correctiveActionExtras: {
        implementationOwner,
        targetCompletionDateISO,
        status,
        evidence: { images: evidenceImages },
      },
      performedBy,
      department,
      verificationOfCorrectiveAction: verification,
      qaVerification: {
        verifiedByQA,
        dateISO: verifiedByQADateISO,
        result: qaVerificationResult,
        followupActionsRequired,
        followupResponsible,
        followupTargetDateISO,
        closureDateISO,
      },
      finalQaClosure: {
        note: "electronically approved; no signature required",
        name: finalQaName,
        dateISO: finalQaDateISO,
        approved: finalQaApproved,
      },
      signature: {
        signature,
        date: signatureDate,
        responsiblePerson,
        responsibleSignature,
      },
      month: monthText,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setOpMsg("Saving… · جارٍ الحفظ…");

      // A blank sheet always creates; anything else updates the row it loaded.
      const existing = draftNew
        ? null
        : editingReportId
        ? { id: editingReportId }
        : await fetchExistingNCByDate(dateISO, TYPE);

      const body = { reporter: REPORTER, type: TYPE, payload };

      const res = await fetch(
        existing?.id
          ? `${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`
          : `${API_BASE}/api/reports`,
        {
          method: existing?.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        throw new Error((await res.text().catch(() => "")) || "Failed to save NC report");
      }

      /* The server answers { ok, report } — `report.payload.refNo` is the
         number it just allocated (or kept, on an update). Read it back so the
         NC No. on screen stops saying "assigned on save". */
      const saved = await res.json().catch(() => null);
      const row = saved?.report || saved?.data || saved;
      const savedId = row?.id || row?._id;
      const savedRef = row?.payload?.refNo;
      if (savedId) setEditingReportId(String(savedId));
      if (savedRef) setRefNo(String(savedRef));
      setDraftNew(false);
      // These images are now attached to the saved record — no longer
      // "unsaved" for the orphan-cleanup on New NCR / Clear all.
      loadedEvidenceImagesRef.current = evidenceImages;

      setOpMsg(savedRef ? `Saved — ${savedRef} · تم الحفظ` : `Saved for ${dateISO}. · تم الحفظ`);
    } catch (e) {
      console.error(e);
      setOpMsg(`Failed · فشل: ${e.message || e}`);
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 3500);
    }
  }

  const show = (k) => touched && !!missing[k];
  const statusMeta = STATUSES.find((s) => s.key === status) || STATUSES[0];

  return (
    <div className="ncr">
      <style>{NCR_CSS}</style>

      {/* ─── action bar ─── */}
      <div className="ncr-bar">
        <div className="ncr-bar-title">
          🚫 Non-Conformance Report
          <small>تقرير عدم المطابقة</small>
        </div>

        <div className={`ncr-ref${refNo ? "" : " is-pending"}`} title="NC No. — allocated by the server · رقم التقرير يُخصَّص من الخادم">
          {refNo || legacyNcNo || bi("No. assigned on save", "يُخصَّص الرقم عند الحفظ")}
        </div>

        <div className="ncr-steps">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="ncr-step"
              data-on={status === s.key ? "1" : "0"}
              style={{ "--step-color": s.color }}
              onClick={() => chooseStatus(s.key)}
            >
              {s.en}
              <small>{s.ar}</small>
            </button>
          ))}
        </div>

        <div className="ncr-spacer" />

        <button type="button" className="ncr-btn ghost small" onClick={startNewReport}>
          ➕ <Bi en="New NCR" ar="تقرير جديد" />
        </button>
        <button type="button" className="ncr-btn" onClick={saveNCToServer} disabled={saving}>
          {saving ? <Bi en="Saving…" /> : <>💾 <Bi en="Save" /></>}
        </button>

        {opMsg ? <div className="ncr-msg" style={{ width: "100%" }}>{opMsg}</div> : null}
      </div>

      {/* ─── document control (folded) ─── */}
      <details className="ncr-doc">
        <summary>
          <img
            className="ncr-doc-logo"
            src={logoUrl || LOGO_FALLBACK}
            alt=""
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <span>
            {HEADER_LINE} · {header.documentNo} · Rev {header.revisionNo}
          </span>
          <span style={{ marginInlineStart: "auto", color: "#64748b" }}><Bi en="Document control" ar="ضبط الوثيقة" /> ▾</span>
        </summary>
        <div className="ncr-doc-kv">
          <div><span><Bi en="Document Title" /></span><span>{header.documentTitle}</span></div>
          <div><span><Bi en="Document No" /></span><span>{header.documentNo}</span></div>
          <div><span><Bi en="Issue Date" /></span><span>{header.issueDate}</span></div>
          <div><span><Bi en="Revision No" /></span><span>{header.revisionNo}</span></div>
          <div><span><Bi en="Area" /></span><span>{header.area}</span></div>
          <div><span><Bi en="Issued By" /></span><span>{header.issuedBy}</span></div>
          <div><span><Bi en="Controlling Officer" /></span><span>{header.controllingOfficer}</span></div>
          <div><span><Bi en="Approved By" /></span><span>{header.approvedBy}</span></div>
        </div>
      </details>

      {bilingual ? (
        <div className="ncr-guide">
          <b>Operational guidance / ملاحظات تشغيلية</b>
          <div>Describe the nonconformance clearly: what happened, where, date/time, affected product/area, and immediate containment.</div>
          <div className="ar">اشرح عدم المطابقة بوضوح: ماذا حدث، أين، التاريخ/الوقت، المنتج أو المنطقة المتأثرة، وإجراء الاحتواء الفوري.</div>
          <div>Corrective action must remove the cause, assign an owner, set a target date, and verify effectiveness before closure.</div>
          <div className="ar">الإجراء التصحيحي يجب أن يزيل السبب، يحدد المسؤول، يضع تاريخًا مستهدفًا، ويتم التحقق من فعاليته قبل الإغلاق.</div>
        </div>
      ) : null}

      {/* ─── ① identification ─── */}
      <NcrIdentificationCard show={show} location={location} setLocation={setLocation} branchOptions={branchOptions} dateISO={dateISO} setDraftNew={setDraftNew} setDateISO={setDateISO} refNo={refNo} legacyNcNo={legacyNcNo} issuedTo={issuedTo} setIssuedTo={setIssuedTo} issuedBy={issuedBy} setIssuedBy={setIssuedBy} sources={sources} setSources={setSources} />

      {/* ─── ② description ─── */}
      <Card n="2" en="What went wrong" ar="وصف عدم المطابقة" badge={bi("Required", "مطلوب")} >
        <div className="ncr-grid wide">
          <Field
            en="Nonconformance / Report Details"
            ar="تفاصيل عدم المطابقة"
            required
            missing={show("details")}
            hint={bi("What happened, where, when, which product or area, and what was done immediately to contain it.", "ماذا حدث، أين، متى، أي منتج أو منطقة، وما الإجراء الفوري للاحتواء.")}
          >
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Write details here… · اكتب التفاصيل هنا…"
            />
          </Field>
        </div>
      </Card>

      {/* ─── ③ corrective action ─── */}
      <NcrCorrectiveActionCard closing={closing} show={show} correctiveAction={correctiveAction} setCorrectiveAction={setCorrectiveAction} implementationOwner={implementationOwner} setImplementationOwner={setImplementationOwner} targetCompletionDateISO={targetCompletionDateISO} setTargetCompletionDateISO={setTargetCompletionDateISO} performedBy={performedBy} setPerformedBy={setPerformedBy} department={department} setDepartment={setDepartment} />

      {/* ─── ④ evidence ─── */}
      <NcrEvidenceCard evidenceImages={evidenceImages} evidenceInputRef={evidenceInputRef} evidenceBusy={evidenceBusy} setEvidenceImages={setEvidenceImages} addEvidenceImagesFromFiles={addEvidenceImagesFromFiles} evidenceMsg={evidenceMsg} removeEvidenceImageAt={removeEvidenceImageAt} />

      {/* ─── ⑤ QA verification ─── */}
      <NcrQaVerificationCard verifiedByQA={verifiedByQA} setVerifiedByQA={setVerifiedByQA} verifiedByQADateISO={verifiedByQADateISO} setVerifiedByQADateISO={setVerifiedByQADateISO} verification={verification} setVerification={setVerification} qaVerificationResult={qaVerificationResult} setQaVerificationResult={setQaVerificationResult} followupActionsRequired={followupActionsRequired} setFollowupActionsRequired={setFollowupActionsRequired} followupResponsible={followupResponsible} setFollowupResponsible={setFollowupResponsible} followupTargetDateISO={followupTargetDateISO} setFollowupTargetDateISO={setFollowupTargetDateISO} />

      {/* ─── ⑥ closure ─── */}
      <NcrClosureCard closing={closing} statusMeta={statusMeta} closureDateISO={closureDateISO} setClosureDateISO={setClosureDateISO} show={show} finalQaName={finalQaName} setFinalQaName={setFinalQaName} finalQaDateISO={finalQaDateISO} setFinalQaDateISO={setFinalQaDateISO} finalQaApproved={finalQaApproved} setFinalQaApproved={setFinalQaApproved} signature={signature} setSignature={setSignature} signatureDate={signatureDate} setSignatureDate={setSignatureDate} responsiblePerson={responsiblePerson} setResponsiblePerson={setResponsiblePerson} responsibleSignature={responsibleSignature} setResponsibleSignature={setResponsibleSignature} />

      <div className="ncr-foot">
        معتمد إلكترونياً؛ لا حاجة للتوقيع — Electronically approved; no signature required.
      </div>
    </div>
  );
}
