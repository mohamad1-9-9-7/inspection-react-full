// src/companies/exaltis/training/TrainingSessionsList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "./nav";
import TrainingReferenceModal, { MODULE_DETAILS_BI } from "./TrainingReferenceModal";

import { REPORTS_URL, TYPE, QUIZ_BANK, fetchJson, updateReportOnServer, deleteReportOnServer, normalizeToArray, getId, safeDate, safeBranch, safeModule, safeTitle, sortByNewest, makeBlankParticipant, renumberParticipants, useGlobalLang } from "./TrainingSessionsList.helpers";
import { hasQuiz, lookupBank, pickLevelQuestions } from "./sessions/quiz";
import { MAX_PARTICIPANT_IMAGES, dedupeParticipants, parseTrainingDetails, rowStats, missingEmployeeIdParticipants, dataQualityIssuesForSession, TOTAL_MODULES } from "./sessions/participants";
import { DEFAULT_QA_MANAGER, CertificateModal } from "./sessions/certificates";
import { KPICardLocal } from "./sessions/KPICardLocal";
import { AttendanceStage } from "./sessions/AttendanceStage";
import { PhotoViewer } from "./sessions/PhotoViewer";
import { ViewAnswersModal } from "./sessions/ViewAnswersModal";
import { QuizModal } from "./sessions/QuizModal";
import { SessionDetail } from "./sessions/SessionDetail";
import { SessionsLibrary } from "./sessions/SessionsLibrary";
import { SessionsToolbar } from "./sessions/SessionsToolbar";
import { RenewalAlerts } from "./sessions/RenewalAlerts";
import { BranchCompliance } from "./sessions/BranchCompliance";
import { DataQualityPanel } from "./sessions/DataQualityPanel";
import { THEME, pageStyle, glass, surface, btn, inputStyle, selectStyle, fieldLabel, rightPanelHeight } from "./sessions/sessionsStyles";
import { useSessionQuiz } from "./sessions/useSessionQuiz";
import { useCertificateExport } from "./sessions/useCertificateExport";
import { useSessionLink } from "./sessions/useSessionLink";
import { useSessionPhotos } from "./sessions/useSessionPhotos";

/* ===================== Component ===================== */
export default function TrainingSessionsList() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  // ✅ Live question bank fetched from DB (training_questions records from admin)
  const [liveQuizBank, setLiveQuizBank] = useState({});

  // ✅ Smart filter / sort tools
  const [sortBy, setSortBy] = useState("newest");
  const [fBranch, setFBranch] = useState("");
  const [fModule, setFModule] = useState("");
  const [fQuiz, setFQuiz] = useState("all"); // all | with | without
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const attendanceRef = useRef(null);

  const [refOpen, setRefOpen] = useState(false);
  const [certData, setCertData] = useState(null);
  // ✅ Certificate PDF export — row selection (by participant index) + busy flag
  const [certSel, setCertSel] = useState({});
  const [bulkCertBusy, setBulkCertBusy] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(-1);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSaving, setQuizSaving] = useState(false);
  // ✅ Unified language (qcs_training_lang) shared across all training pages
  const [globalLang, setGlobalLang] = useGlobalLang(); // "en" | "ar"
  const quizLang = globalLang === "ar" ? "AR" : "EN";
  const setQuizLang = (v) => setGlobalLang(v === "AR" || v === "ar" ? "ar" : "en");

  // ✅ View Answers modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState(-1);
  const viewLang = globalLang === "ar" ? "AR" : "EN";
  const setViewLang = setQuizLang;

  const [rightTab, setRightTab] = useState("SESSIONS");

  const [openYears, setOpenYears] = useState(() => ({}));
  const [openMonths, setOpenMonths] = useState(() => ({}));
  const [openDays, setOpenDays] = useState(() => ({}));

  // ✅ delete training session
  const [deletingSession, setDeletingSession] = useState(false);

  // ✅ Session Link
  const [linkBusy, setLinkBusy] = useState(false);

  // ✅ NEW: collapsible details state (A–L)
  const [detailOpen, setDetailOpen] = useState(() => ({}));

  const moduleName = selected ? safeModule(selected) : "";
  // ✅ Level (difficulty) this session targets — "" means all levels
  const sessionLevel = selected ? String(selected?.payload?.level || "").trim() : "";

  const questions = useMemo(() => {
    if (!moduleName) return [];
    // ✅ DB questions (from admin) take priority; hardcoded bank is the fallback.
    // IMPORTANT: lookupBank returns [] (truthy) when empty, so `a || b` never
    // fell through to the fallback — check .length explicitly so HACCP & others
    // correctly use the built-in QUIZ_BANK.
    const live = lookupBank(liveQuizBank, moduleName);
    const all = live.length ? live : lookupBank(QUIZ_BANK, moduleName);
    // ✅ If the session targets a level, return that level's 5 questions
    return pickLevelQuestions(all, sessionLevel, 5);
  }, [moduleName, liveQuizBank, sessionLevel]);

  const sessionStats = useMemo(() => {
    if (!selected) return null;
    const list = Array.isArray(participants) ? participants : [];
    const valid = list.filter((p) => String(p?.name || "").trim());
    const total = valid.length;

    const pass = valid.filter(
      (p) => String(p?.result || "").toUpperCase() === "PASS"
    ).length;
    const fail = valid.filter(
      (p) => String(p?.result || "").toUpperCase() === "FAIL"
    ).length;

    const scores = valid
      .map((p) => Number(String(p?.score || "").replace("%", "")))
      .filter((n) => Number.isFinite(n));

    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const rate = total ? Math.round((pass / total) * 100) : 0;

    return { total, pass, fail, avg, rate };
  }, [selected, participants]);

  const selectedQualityIssues = useMemo(
    () => dataQualityIssuesForSession(selected, liveQuizBank, participants),
    [selected, liveQuizBank, participants]
  );

  const load = async () => {
    setLoading(true);
    setInfo("");
    try {
      // ✅ Fetch sessions AND the admin's question bank in parallel
      const [data, qData] = await Promise.all([
        fetchJson(`${REPORTS_URL}?type=${encodeURIComponent(TYPE)}`),
        fetchJson(`${REPORTS_URL}?type=training_questions`).catch(() => []),
      ]);

      // Build live question bank map: { [moduleName]: questions[] }
      const qArr = normalizeToArray(qData);
      const bankMap = {};
      // Rows arrive newest-first. If duplicate records exist for a module,
      // keep the NEWEST one (skip once set) so freshly added questions win.
      qArr.forEach((rec) => {
        const mod = rec?.payload?.module;
        const qs = rec?.payload?.questions;
        if (mod && Array.isArray(qs) && qs.length > 0 && !bankMap[mod]) {
          bankMap[mod] = qs;
        }
      });
      setLiveQuizBank(bankMap);

      const arr = normalizeToArray(data).slice().sort(sortByNewest);
      setRows(arr);

      // A user-facing count, not the raw API shape (that was a debug line).
      setInfo(`${arr.length} session(s)`);

      if (selected) {
        const sid = getId(selected);
        const fresh = arr.find((r) => getId(r) === sid);
        if (fresh) {
          setSelected(fresh);
          const raw = fresh?.payload?.participants || [];
          const cleaned = dedupeParticipants(raw);
          setParticipants(renumberParticipants(cleaned));

          const rawImgs = Array.isArray(fresh?.payload?.images) ? fresh.payload.images : [];
          setSessionImages(
            rawImgs
              .map((im) =>
                typeof im === "string"
                  ? { url: im, name: "" }
                  : { url: String(im?.url || ""), name: String(im?.name || "") }
              )
              .filter((im) => im.url)
              .slice(0, MAX_PARTICIPANT_IMAGES)
          );
        }
      }
    } catch (e) {
      console.error(e);
      setInfo(`ERROR: ${String(e?.message || e)}`);
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branchOptions = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const b = safeBranch(r);
      if (b) s.add(b);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const moduleOptions = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const m = safeModule(r);
      if (m) s.add(m);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s) {
        const blob = `${safeTitle(r)} ${safeBranch(r)} ${safeModule(r)} ${safeDate(r)}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      if (fBranch && safeBranch(r) !== fBranch) return false;
      if (fModule && safeModule(r) !== fModule) return false;
      const quiz = hasQuiz(r?.payload);
      if (fQuiz === "with" && !quiz) return false;
      if (fQuiz === "without" && quiz) return false;
      const d = safeDate(r);
      if (dateFrom && (!d || d < dateFrom)) return false;
      if (dateTo && (!d || d > dateTo)) return false;
      return true;
    });
  }, [rows, q, fBranch, fModule, fQuiz, dateFrom, dateTo]);

  const visible = useMemo(() => {
    const arr = filtered.slice();
    const byStr = (fn) => (a, b) =>
      String(fn(a) || "").localeCompare(String(fn(b) || ""));
    switch (sortBy) {
      case "oldest":
        arr.sort((a, b) => sortByNewest(a, b) * -1);
        break;
      case "title":
        arr.sort(byStr(safeTitle));
        break;
      case "branch":
        arr.sort(byStr(safeBranch));
        break;
      case "module":
        arr.sort(byStr(safeModule));
        break;
      case "participants":
        arr.sort((a, b) => rowStats(b).total - rowStats(a).total);
        break;
      case "passrate":
        arr.sort((a, b) => rowStats(b).rate - rowStats(a).rate);
        break;
      case "newest":
      default:
        arr.sort(sortByNewest);
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const dataQuality = useMemo(() => {
    const sessions = rows
      .map((r) => ({
        row: r,
        issues: dataQualityIssuesForSession(r, liveQuizBank),
        missingIds: missingEmployeeIdParticipants(r).length,
      }))
      .filter((x) => x.issues.length);

    return {
      sessions,
      noQuestions: sessions.filter((x) => x.issues.some((i) => i.key === "no_questions")).length,
      noParticipants: sessions.filter((x) => x.issues.some((i) => i.key === "no_participants")).length,
      missingEmployeeId: sessions.reduce((sum, x) => sum + x.missingIds, 0),
    };
  }, [rows, liveQuizBank]);

  const activeFilterCount =
    (q.trim() ? 1 : 0) +
    (fBranch ? 1 : 0) +
    (fModule ? 1 : 0) +
    (fQuiz !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setQ("");
    setFBranch("");
    setFModule("");
    setFQuiz("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  };

  const dateTree = useMemo(() => {
    const tree = {};
    for (const r of filtered) {
      const d = safeDate(r) || "Unknown";
      const y = d !== "Unknown" ? d.slice(0, 4) : "Unknown";
      const m = d !== "Unknown" ? d.slice(0, 7) : "Unknown";
      const day = d;

      tree[y] = tree[y] || {};
      tree[y][m] = tree[y][m] || {};
      tree[y][m][day] = tree[y][m][day] || [];
      tree[y][m][day].push(r);
    }
    return tree;
  }, [filtered]);

  const openSession = (r) => {
    setSelected(r);
    const raw = r?.payload?.participants || [];
    const cleaned = dedupeParticipants(raw);
    setParticipants(renumberParticipants(cleaned));

    const rawImgs = Array.isArray(r?.payload?.images) ? r.payload.images : [];
    setSessionImages(
      rawImgs
        .map((im) =>
          typeof im === "string"
            ? { url: im, name: "" }
            : { url: String(im?.url || ""), name: String(im?.name || "") }
        )
        .filter((im) => im.url)
        .slice(0, MAX_PARTICIPANT_IMAGES)
    );

    const det = parseTrainingDetails(String(r?.payload?.details || ""));
    const nextOpen = {};
    det.forEach((s) => (nextOpen[s.key] = false));
    setDetailOpen(nextOpen);

    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
    setViewOpen(false);
    setViewIndex(-1);
    setCertSel({});
  };

  const closeSession = () => {
    setSelected(null);
    setParticipants([]);
    setSessionImages([]);
    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
    setViewOpen(false);
    setViewIndex(-1);
    setDetailOpen({});
    setCertSel({});
  };

  const addRow = () => {
    setParticipants((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      base.push(makeBlankParticipant());
      return renumberParticipants(base);
    });
  };

  const add5Rows = () => {
    setParticipants((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      for (let i = 0; i < 5; i++) base.push(makeBlankParticipant());
      return renumberParticipants(base);
    });
  };

  const removeRow = (idx) =>
    setParticipants((prev) =>
      renumberParticipants((prev || []).filter((_, i) => i !== idx))
    );

  const updateCell = (idx, key, value) => {
    setParticipants((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      copy[idx] = { ...(copy[idx] || {}), [key]: value };
      return renumberParticipants(copy);
    });
  };

  /* ===== Session images (Cloudinary, max 2 per session) ===== */
  const { sessionImages, setSessionImages, uploadingSessionPhoto, savingSessionPhotos, photoViewer, setPhotoViewer, handleSessionImageUpload, removeSessionImage, openSessionPhotoViewer } = useSessionPhotos({ selected, setSelected });

  /* ===================== ✅ ONE SESSION LINK (token-based) ===================== */
  const { getSessionToken, buildSessionLink, copySessionLink, openSessionLink } = useSessionLink({ selected, setLinkBusy, liveQuizBank, moduleName, questions, sessionLevel, load });

  /* ── Certificates → PDF (one page per participant) ── */
  const { certEligible, certChosen, allCertsSelected, toggleCertRow, toggleAllCerts, runCertExport, downloadCertificates, downloadAttendanceSheet } = useCertificateExport({ participants, certSel, setCertSel, setBulkCertBusy, selected, moduleName, setSheetBusy, attendanceRef });

  const saveParticipants = async () => {
    if (!selected) return;

    const clean = renumberParticipants(dedupeParticipants(participants)).map(
      (p) => ({
        slNo: String(p.slNo || "").trim(),
        name: String(p.name || "").trim(),
        designation: String(p.designation || "").trim(),
        employeeId: String(p.employeeId || "").trim(),
        result: String(p.result || "").trim(),
        score: String(p.score || "").trim(),
        lastQuizAt: String(p.lastQuizAt || "").trim(),
        quizAttempt: p?.quizAttempt || null,
      })
    );

    const hasAny = clean.some(
      (p) => p.name || p.designation || p.employeeId || p.result || p.score
    );
    if (!hasAny) {
      alert("Please add at least one participant before saving.");
      return;
    }

    for (const p of clean) {
      const rowHasData =
        p.name || p.designation || p.employeeId || p.result || p.score;
      if (rowHasData && !p.name) {
        alert(
          "A row contains data but participant name is empty. Please fill the name."
        );
        return;
      }
    }

    setSavingParticipants(true);
    try {
      const id = getId(selected);
      if (!id) throw new Error("Missing report id");

      const updated = {
        ...selected,
        payload: {
          ...(selected.payload || {}),
          participants: clean,
        },
      };

      await updateReportOnServer(id, updated);
      alert("Participants saved successfully ✅");
      await load();
    } catch (e) {
      console.error(e);
      alert(`Save failed: ${String(e?.message || e)}`);
    } finally {
      setSavingParticipants(false);
    }
  };

  const { startQuiz, closeQuiz, openAnswers, closeAnswers, submitQuiz } = useSessionQuiz({ selected, participants, moduleName, questions, setQuizIndex, setQuizAnswers, setQuizLang, setQuizOpen, setViewIndex, setViewLang, setViewOpen, quizIndex, quizAnswers, setQuizSaving, setParticipants, load });

  const deleteTrainingSession = async () => {
    if (!selected) return;
    const id = getId(selected);
    if (!id) {
      alert("Missing report id");
      return;
    }

    const ok = window.confirm(
      `⚠️ Delete this training session permanently?\n\nTitle: ${
        safeTitle(selected) || "-"
      }\nDate: ${safeDate(selected) || "-"}\nBranch: ${
        safeBranch(selected) || "-"
      }\nModule: ${safeModule(selected) || "-"}`
    );
    if (!ok) return;

    setDeletingSession(true);
    try {
      await deleteReportOnServer(id);
      alert("Training session deleted ✅");
      closeSession();
      await load();
    } catch (e) {
      console.error(e);
      alert(`Delete failed: ${String(e?.message || e)}`);
    } finally {
      setDeletingSession(false);
    }
  };

  const activeParticipant = quizIndex >= 0 ? participants[quizIndex] : null;
  const viewParticipant = viewIndex >= 0 ? participants[viewIndex] : null;

  /* ===================== ✅ THEME (Mock Recall View Style) ===================== */
  

  const token = selected ? getSessionToken() : "";
  const sessionLink = token ? buildSessionLink(token) : "";

  const detailsText = selected ? String(selected?.payload?.details || "") : "";
  const objectivesText = selected ? String(selected?.payload?.objectives || "") : "";

  const detailsSections = useMemo(
    () => parseTrainingDetails(detailsText),
    [detailsText]
  );

  const toggleDetail = (k) => setDetailOpen((p) => ({ ...p, [k]: !p[k] }));

  const expandAllDetails = () => {
    const next = {};
    detailsSections.forEach((s) => (next[s.key] = true));
    setDetailOpen(next);
  };

  const collapseAllDetails = () => {
    const next = {};
    detailsSections.forEach((s) => (next[s.key] = false));
    setDetailOpen(next);
  };

  /* ====== KPI calculations (matches Mock Recall View style) ====== */
  const kpis = (() => {
    const total = filtered.length;
    const branches = new Set();
    const modules = new Set();
    let withQuiz = 0;
    let lastDate = null;
    for (const r of filtered) {
      const b = safeBranch(r); if (b) branches.add(b);
      const m = safeModule(r); if (m) modules.add(m);
      if (hasQuiz(r?.payload)) withQuiz += 1;
      const d = safeDate(r);
      if (d && (!lastDate || d > lastDate)) lastDate = d;
    }
    const days = (() => {
      if (!lastDate) return null;
      const dt = new Date(lastDate);
      if (isNaN(dt.getTime())) return null;
      return Math.floor((Date.now() - dt.getTime()) / 86400000);
    })();
    return {
      total,
      branches: branches.size,
      modules: modules.size,
      withQuiz,
      lastDate,
      daysSinceLast: days,
    };
  })();

  /* ── Branch Compliance (all-time, uses full rows not filtered) ── */
  const branchCompliance = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const br = safeBranch(r);
      const mo = safeModule(r);
      if (!br) continue;
      if (!map[br]) map[br] = { modules: new Set(), pass: 0, total: 0, sessions: 0, lastDate: null };
      const b = map[br];
      b.sessions++;
      if (mo) b.modules.add(mo);
      const st = rowStats(r);
      b.pass  += st.pass;
      b.total += st.total;
      const d = safeDate(r);
      if (d && (!b.lastDate || d > b.lastDate)) b.lastDate = d;
    }
    return Object.entries(map).map(([branch, data]) => {
      const coverage = Math.round((data.modules.size / TOTAL_MODULES) * 100);
      const passRate  = data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0;
      const score     = Math.round((coverage + passRate) / 2);
      return { branch, coverage, passRate, score, modules: data.modules.size, sessions: data.sessions, lastDate: data.lastDate };
    }).sort((a, b) => b.score - a.score);
  }, [rows]);

  /* ── Renewal Alerts: PASS participants expiring within 90 days ── */
  const renewalAlerts = useMemo(() => {
    const today = new Date();
    const alerts = [];
    for (const r of rows) {
      const d = safeDate(r);
      if (!d) continue;
      const expiry = new Date(d);
      expiry.setFullYear(expiry.getFullYear() + 1);
      const daysLeft = Math.ceil((expiry - today) / 86400000);
      if (daysLeft > 90) continue; // only show within 90 days
      const parts = normalizeToArray(r.payload?.participants || r.participants || []);
      for (const p of parts) {
        if (String(p.result || '').toLowerCase() !== 'pass') continue;
        alerts.push({
          name: String(p.name || '').trim(),
          empId: String(p.employeeId || '').trim(),
          desig: String(p.designation || '').trim(),
          module: safeModule(r),
          branch: safeBranch(r),
          trainedDate: d,
          expiryDate: expiry.toISOString().split('T')[0],
          daysLeft,
        });
      }
    }
    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [rows]);
  const [renewalOpen, setRenewalOpen] = useState(false);

  return (
    <div style={pageStyle}>
      {/* ========= TOP HEADER (navy gradient, like Mock Recall) ========= */}
      <div
        style={{
          background: THEME.headerBg,
          color: THEME.headerText,
          border: `1px solid ${THEME.headerLine}`,
          padding: "22px 26px",
          borderRadius: 18,
          boxShadow: "0 6px 22px rgba(59,130,246,0.10)",
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            🎓 Training Sessions
          </h1>
          <div style={{ color: THEME.headerSub, marginTop: 6, fontSize: "0.9rem", fontWeight: 600 }}>
            {loading ? "Loading…" : (info || `Browse, view participants, run quizzes, and track KPIs.`)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={load} disabled={loading} style={btn("light")}>
            {loading ? "Refreshing…" : "🔄 Refresh"}
          </button>
          <button onClick={() => nav("/training/create")} style={btn("dark")}>
            ➕ New Training
          </button>
          <button onClick={() => nav("/training/gap-analysis")} style={btn("light")}>
            📊 Gap Analysis
          </button>
          <button onClick={() => nav("/training")} style={btn("light")}>
            ↩ Back
          </button>
        </div>
      </div>

      {/* ========= KPI ROW ========= */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <KPICardLocal icon="📋" label="Total Sessions" value={kpis.total} sub={activeFilterCount ? `Filtered from ${rows.length}` : "All sessions"} accent="#1e40af" />
        <KPICardLocal icon="🏢" label="Branches Covered" value={kpis.branches} sub="distinct branches" accent="#0891b2" />
        <KPICardLocal icon="📚" label="Modules Covered" value={kpis.modules} sub="distinct modules" accent="#7c3aed" />
        <KPICardLocal icon="📝" label="With Quiz" value={`${kpis.withQuiz}/${kpis.total || 0}`} sub={kpis.total ? `${Math.round((kpis.withQuiz / kpis.total) * 100)}% have quiz` : "—"} accent="#15803d" />
        <KPICardLocal
          icon="!"
          label="Data Quality"
          value={dataQuality.sessions.length}
          sub={`${dataQuality.noQuestions} no questions · ${dataQuality.noParticipants} no participants · ${dataQuality.missingEmployeeId} missing IDs`}
          accent="#0f766e"
          bad={dataQuality.sessions.length > 0}
        />
        <KPICardLocal
          icon={kpis.daysSinceLast !== null && kpis.daysSinceLast > 60 ? "⏳" : "📅"}
          label="Since Last Training"
          value={kpis.daysSinceLast !== null ? `${kpis.daysSinceLast} days` : "—"}
          sub={kpis.lastDate || "—"}
          accent="#a16207"
          bad={kpis.daysSinceLast !== null && kpis.daysSinceLast > 90}
        />
      </div>

      {dataQuality.sessions.length > 0 && (
        <DataQualityPanel setQualityOpen={setQualityOpen} dataQuality={dataQuality} qualityOpen={qualityOpen} openSession={openSession} globalLang={globalLang} />
      )}

      {/* ========= BRANCH COMPLIANCE ========= */}
      <BranchCompliance setComplianceOpen={setComplianceOpen} branchCompliance={branchCompliance} complianceOpen={complianceOpen} />

      {/* ========= RENEWAL ALERTS ========= */}
      {renewalAlerts.length > 0 && (
        <RenewalAlerts setRenewalOpen={setRenewalOpen} renewalAlerts={renewalAlerts} renewalOpen={renewalOpen} />
      )}

      {/* ========= SMART FILTER / SORT TOOLBAR ========= */}
      <SessionsToolbar THEME={THEME} q={q} setQ={setQ} inputStyle={inputStyle} visible={visible} rows={rows} clearAllFilters={clearAllFilters} activeFilterCount={activeFilterCount} sortBy={sortBy} btn={btn} fieldLabel={fieldLabel} setSortBy={setSortBy} selectStyle={selectStyle} fBranch={fBranch} setFBranch={setFBranch} branchOptions={branchOptions} fModule={fModule} setFModule={setFModule} moduleOptions={moduleOptions} setFQuiz={setFQuiz} fQuiz={fQuiz} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          flexDirection: "row-reverse",
        }}
      >
        {/* RIGHT: Library */}
        <SessionsLibrary rightPanelHeight={rightPanelHeight} glass={glass} THEME={THEME} setRightTab={setRightTab} rightTab={rightTab} loading={loading} visible={visible} activeFilterCount={activeFilterCount} selected={selected} openSession={openSession} globalLang={globalLang} liveQuizBank={liveQuizBank} dateTree={dateTree} openYears={openYears} setOpenYears={setOpenYears} openMonths={openMonths} setOpenMonths={setOpenMonths} openDays={openDays} setOpenDays={setOpenDays} />

        {/* LEFT: Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div style={{ ...glass, padding: 18, minHeight: "calc(100vh - 220px)" }}>
              <div style={{ fontWeight: 1100, color: THEME.textStrong, fontSize: 16 }}>
                📌 Session Details
              </div>
              <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
                Select a training session from the right panel to view details here.
              </div>
            </div>
          ) : (
            <SessionDetail glass={glass} THEME={THEME} selected={selected} globalLang={globalLang} setRefOpen={setRefOpen} deletingSession={deletingSession} btn={btn} deleteTrainingSession={deleteTrainingSession} loading={loading} closeSession={closeSession} moduleName={moduleName} sessionLevel={sessionLevel} copySessionLink={copySessionLink} linkBusy={linkBusy} openSessionLink={openSessionLink} sessionLink={sessionLink} objectivesText={objectivesText} sessionStats={sessionStats} selectedQualityIssues={selectedQualityIssues} sessionImages={sessionImages} openSessionPhotoViewer={openSessionPhotoViewer} handleSessionImageUpload={handleSessionImageUpload} uploadingSessionPhoto={uploadingSessionPhoto} savingSessionPhotos={savingSessionPhotos} removeSessionImage={removeSessionImage} questions={questions} downloadCertificates={downloadCertificates} bulkCertBusy={bulkCertBusy} certEligible={certEligible} certChosen={certChosen} addRow={addRow} add5Rows={add5Rows} downloadAttendanceSheet={downloadAttendanceSheet} sheetBusy={sheetBusy} participants={participants} saveParticipants={saveParticipants} savingParticipants={savingParticipants} allCertsSelected={allCertsSelected} toggleAllCerts={toggleAllCerts} certSel={certSel} toggleCertRow={toggleCertRow} updateCell={updateCell} inputStyle={inputStyle} setCertData={setCertData} runCertExport={runCertExport} startQuiz={startQuiz} openAnswers={openAnswers} removeRow={removeRow} />
          )}
        </div>
      </div>

      {/* ===================== QUIZ MODAL (Admin manual) ===================== */}
      <QuizModal quizOpen={quizOpen} activeParticipant={activeParticipant} moduleName={moduleName} quizSaving={quizSaving} closeQuiz={closeQuiz} btn={btn} submitQuiz={submitQuiz} questions={questions} setQuizLang={setQuizLang} quizLang={quizLang} surface={surface} THEME={THEME} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} />

      {/* ===================== VIEW ANSWERS MODAL ===================== */}
      <ViewAnswersModal viewOpen={viewOpen} viewParticipant={viewParticipant} moduleName={moduleName} closeAnswers={closeAnswers} btn={btn} setViewLang={setViewLang} viewLang={viewLang} surface={surface} THEME={THEME} />

      <div style={{ marginTop: 14, textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "0.85rem" }}>
        Built by Eng. Mohammed Abdullah
      </div>

      {/* ── Certificate Modal ── */}
      {certData && selected && (
        <CertificateModal
          open={!!certData}
          onClose={() => setCertData(null)}
          participant={certData.participant}
          session={selected}
          moduleName={moduleName}
          branch={safeBranch(selected)}
          date={safeDate(selected)}
          conductedBy={selected?.payload?.conductedBy || ''}
          verifiedBy={selected?.payload?.verifiedBy || DEFAULT_QA_MANAGER}
          lang={globalLang}
        />
      )}

      {/* ── Participant Photos Viewer ── */}
      {photoViewer && (
        <PhotoViewer setPhotoViewer={setPhotoViewer} photoViewer={photoViewer} />
      )}

      {/* ── Attendance sheet: off-screen stage captured by the PDF exporter ── */}
      {selected && createPortal(
        <AttendanceStage attendanceRef={attendanceRef} selected={selected} participants={participants} />,
        document.body
      )}

      {selected && (
        <TrainingReferenceModal
          open={refOpen}
          onClose={() => setRefOpen(false)}
          moduleName={moduleName}
          branch={safeBranch(selected)}
          date={safeDate(selected)}
          details={MODULE_DETAILS_BI[moduleName] || selected?.payload?.details || ''}
          objectives={selected?.payload?.objectives || ''}
          conductedBy={selected?.payload?.conductedBy || ''}
          quickCheckQuestions={(() => {
            const live = lookupBank(liveQuizBank, moduleName);
            return (live.length ? live : lookupBank(QUIZ_BANK, moduleName)).slice(0, 5);
          })()}
        />
      )}
    </div>
  );
}

