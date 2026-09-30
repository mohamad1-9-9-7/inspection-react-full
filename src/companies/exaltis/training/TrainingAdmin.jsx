// src/companies/exaltis/training/TrainingAdmin.jsx
// 🛠️ Training Administration Console — bilingual EN/AR
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "./nav";
import { useGlobalLang } from "./TrainingSessionsList.helpers";
import { MODULES as CANON_MODULES } from "./TrainingSessionCreate";
import { MODULE_DETAILS_BI, DEFAULT_DETAILS_BI } from "./TrainingReferenceModal";
import { t } from "./admin/adminI18n";
import { apiGet, apiPost, apiPut, apiDel } from "./admin/adminApi";
import { normalizeCanonQuestions, blankQuestion, blankRef, blankModuleMeta, THEMES, countQuestions } from "./admin/adminModel";
import { btnStyle, CmdKModal } from "./admin/adminUi";
import { OverviewSection } from "./admin/OverviewSection";
import { ModulesSection } from "./admin/ModulesSection";
import { QuestionsSection } from "./admin/QuestionsSection";
import { ReferencesSection } from "./admin/ReferencesSection";
import { SettingsSection, BackupSection, ActivitySection } from "./admin/SettingsSection";

/* ===================== MAIN ===================== */
export default function TrainingAdmin() {
  const navigate = useNavigate();

  const [lang, setLang] = useGlobalLang();
  const theme = "light";
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showCmdK, setShowCmdK] = useState(false);

  const [modulesRecord, setModulesRecord] = useState(null);
  const [modulesMeta, setModulesMeta] = useState({});
  const [modules, setModules] = useState(CANON_MODULES);
  const [editingModule, setEditingModule] = useState(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({ name: "", ...blankModuleMeta() });

  const [qModule, setQModule] = useState("");
  const [questionsRecords, setQuestionsRecords] = useState([]);
  const [showAddQ, setShowAddQ] = useState(false);
  const [newQ, setNewQ] = useState(blankQuestion());
  const [editingQIdx, setEditingQIdx] = useState(null);
  const [editingQData, setEditingQData] = useState(null);
  const [qSearch, setQSearch] = useState("");
  const [qDifficulty, setQDifficulty] = useState("");

  const [references, setReferences] = useState([]);
  const [refFilter, setRefFilter] = useState("");
  const [refModuleFilter, setRefModuleFilter] = useState("");
  const [refTypeFilter, setRefTypeFilter] = useState("");
  const [refSort, setRefSort] = useState("newest");
  const [showAddRef, setShowAddRef] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [newRef, setNewRef] = useState(blankRef());
  const [selectedRefs, setSelectedRefs] = useState(new Set());

  const [settingsRecord, setSettingsRecord] = useState(null);
  const [settings, setSettings] = useState({
    passMark: 80, defaultLang: "en", certValidity: 12,
    quizTimeLimit: 0, randomizeOrder: false, showAnswerAfter: true,
    allowRetake: true, maxRetakes: 2,
    orgName: "QCS", signatory: "QA Manager", notes: "",
  });

  const [activity, setActivity] = useState([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const importFileRef = useRef(null);

  const T = THEMES[theme];
  const tt = (k, ...a) => t(lang, k, ...a);
  const isAr = lang === "ar";

  function toast(text, kind = "success") {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, text, kind }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
  }
  function logActivity(action, target) {
    setActivity((p) => [{ id: Date.now(), at: new Date().toISOString(), action, target }, ...p].slice(0, 50));
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [modRecs, qRecs, refRecs, setRecs, sessRecs] = await Promise.all([
        apiGet("sweets_training_config"), apiGet("sweets_training_questions"),
        apiGet("sweets_training_reference"), apiGet("sweets_training_settings"),
        apiGet("sweets_training_session"),
      ]);
      const modRec = modRecs[0] || null;
      setModulesRecord(modRec);
      // Merge the saved list with the canonical one so a newly shipped module
      // is never hidden by an older saved training_config record.
      if (modRec?.payload?.modules?.length) {
        setModules([...new Set([...modRec.payload.modules, ...CANON_MODULES])]);
      }
      if (modRec?.payload?.meta) setModulesMeta(modRec.payload.meta);
      setQuestionsRecords(qRecs); setReferences(refRecs);
      const setRec = setRecs[0] || null;
      setSettingsRecord(setRec);
      if (setRec?.payload) setSettings((p) => ({ ...p, ...setRec.payload }));
      setSessionsCount(sessRecs.length);
    } catch (e) {
      toast(`${tt("toast_load_failed")}: ${e.message}`, "error");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setShowCmdK(true); }
      if (e.key === "Escape") setShowCmdK(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* MODULES */
  async function saveModulesList(list, meta = modulesMeta) {
    try {
      const payload = { modules: list, meta };
      const saved = modulesRecord?.id
        ? await apiPut(modulesRecord.id, "sweets_training_config", payload)
        : await apiPost("sweets_training_config", payload);
      setModules(list); setModulesMeta(meta);
      setModulesRecord(saved?.id ? { id: saved.id, payload } : modulesRecord);
      toast(tt("toast_modules_saved"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleAddModule() {
    const name = newModule.name.trim();
    if (!name) { toast(tt("toast_module_required"), "error"); return; }
    if (modules.includes(name)) { toast(tt("toast_module_exists"), "error"); return; }
    const meta = { ...modulesMeta, [name]: { icon: newModule.icon, color: newModule.color, description: newModule.description, createdAt: new Date().toISOString().slice(0, 10) } };
    await saveModulesList([...modules, name], meta);
    logActivity(tt("log_added_module"), name);
    setNewModule({ name: "", ...blankModuleMeta() }); setShowAddModule(false);
  }
  async function handleSaveModuleEdit() {
    if (!editingModule) return;
    const { originalName, name, icon, color, description } = editingModule;
    const trimmed = name.trim(); if (!trimmed) return;
    const updatedModules = modules.map((m) => (m === originalName ? trimmed : m));
    const meta = { ...modulesMeta };
    if (originalName !== trimmed) { meta[trimmed] = { ...(meta[originalName] || {}), icon, color, description }; delete meta[originalName]; }
    else meta[trimmed] = { ...(meta[trimmed] || {}), icon, color, description };
    await saveModulesList(updatedModules, meta);
    logActivity(tt("log_edited_module"), trimmed);
    setEditingModule(null);
  }
  async function handleDeleteModule(name) {
    if (!window.confirm(tt("confirm_delete_module", name))) return;
    const meta = { ...modulesMeta }; delete meta[name];
    await saveModulesList(modules.filter((m) => m !== name), meta);
    logActivity(tt("log_deleted_module"), name);
  }
  async function handleMoveModule(idx, dir) {
    const ni = idx + dir; if (ni < 0 || ni >= modules.length) return;
    const u = [...modules]; [u[idx], u[ni]] = [u[ni], u[idx]];
    await saveModulesList(u);
  }
  function moduleMetaFor(name) {
    const m = modulesMeta[name];
    if (m) return { icon: m.icon || "📋", color: m.color || "indigo", description: m.description || "", createdAt: m.createdAt || "" };
    return blankModuleMeta();
  }

  /* QUESTIONS */
  function getQuestionsForModule(mod) {
    const rec = questionsRecords.find((r) => r?.payload?.module === mod);
    // Reuse the existing record's id even when its questions array is empty,
    // so the next save updates that row (PUT) instead of creating a duplicate.
    if (rec) return { id: rec.id, questions: rec.payload?.questions?.length ? rec.payload.questions : normalizeCanonQuestions(mod) };
    return { id: null, questions: normalizeCanonQuestions(mod) };
  }
  async function persistQuestions(mod, questions, existingId) {
    try {
      const saved = existingId
        ? await apiPut(existingId, "sweets_training_questions", { module: mod, questions })
        : await apiPost("sweets_training_questions", { module: mod, questions });
      setQuestionsRecords((prev) => {
        const idx = prev.findIndex((r) => r?.payload?.module === mod);
        const rec = { id: saved?.id ?? existingId, payload: { module: mod, questions } };
        if (idx >= 0) { const c = [...prev]; c[idx] = rec; return c; }
        return [...prev, rec];
      });
      toast(tt("toast_saved"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleAddQuestion() {
    if (!qModule) { toast(tt("toast_select_module"), "error"); return; }
    if (!newQ.q_en.trim() && !newQ.q_ar.trim()) { toast(tt("toast_question_required"), "error"); return; }
    const { id, questions } = getQuestionsForModule(qModule);
    await persistQuestions(qModule, [...questions, { ...newQ }], id);
    logActivity(tt("log_added_question"), qModule);
    setNewQ(blankQuestion()); setShowAddQ(false);
  }
  async function handleDeleteQuestion(idx) {
    if (!qModule || !window.confirm(tt("confirm_delete_question"))) return;
    const { id, questions } = getQuestionsForModule(qModule);
    await persistQuestions(qModule, questions.filter((_, i) => i !== idx), id);
    logActivity(tt("log_deleted_question"), qModule);
  }
  async function handleMoveQuestion(idx, dir) {
    if (!qModule) return;
    const { id, questions } = getQuestionsForModule(qModule);
    const ni = idx + dir; if (ni < 0 || ni >= questions.length) return;
    const a = [...questions]; [a[idx], a[ni]] = [a[ni], a[idx]];
    await persistQuestions(qModule, a, id);
  }
  async function handleDuplicateQuestion(idx) {
    if (!qModule) return;
    const { id, questions } = getQuestionsForModule(qModule);
    const dup = { ...questions[idx] };
    const a = [...questions.slice(0, idx + 1), dup, ...questions.slice(idx + 1)];
    await persistQuestions(qModule, a, id);
    logActivity(tt("log_duplicated_question"), qModule);
  }
  async function handleSaveEditQuestion() {
    if (editingQIdx === null || !qModule) return;
    const { id, questions } = getQuestionsForModule(qModule);
    const c = [...questions]; c[editingQIdx] = { ...editingQData };
    await persistQuestions(qModule, c, id);
    logActivity(tt("log_edited_question"), qModule);
    setEditingQIdx(null); setEditingQData(null);
  }
  async function handleImportDefaults() {
    if (!qModule) { toast(tt("toast_select_module"), "error"); return; }
    const defaults = normalizeCanonQuestions(qModule);
    if (!defaults.length) { toast(tt("toast_no_defaults"), "error"); return; }
    if (!window.confirm(tt("confirm_import_defaults", defaults.length, qModule))) return;
    const { id } = getQuestionsForModule(qModule);
    await persistQuestions(qModule, defaults, id);
    logActivity(tt("log_imported_defaults"), qModule);
  }
  function handleExportQuestions(mod = qModule) {
    if (!mod) return;
    const { questions } = getQuestionsForModule(mod);
    const blob = new Blob([JSON.stringify({ module: mod, questions }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `questions_${mod.replace(/\s+/g, "_")}.json`; a.click();
  }

  /* REFERENCES */
  async function handleAddReference() {
    const r = { ...newRef, addedAt: new Date().toISOString().slice(0, 10) };
    if (!r.title.trim()) { toast(tt("toast_title_required"), "error"); return; }
    try {
      const saved = await apiPost("sweets_training_reference", r);
      setReferences((p) => [{ id: saved?.id, payload: r, created_at: new Date().toISOString() }, ...p]);
      logActivity(tt("log_added_reference"), r.title);
      setNewRef(blankRef()); setShowAddRef(false);
      toast(tt("toast_ref_added"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleUpdateReference() {
    if (!editingRef) return;
    try {
      await apiPut(editingRef.id, "sweets_training_reference", editingRef.payload);
      setReferences((p) => p.map((r) => (r.id === editingRef.id ? { ...r, payload: editingRef.payload } : r)));
      logActivity(tt("log_edited_reference"), editingRef.payload.title);
      setEditingRef(null); toast(tt("toast_ref_updated"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleDeleteReference(id) {
    const r = references.find((x) => x.id === id);
    if (!window.confirm(tt("confirm_delete_ref", r?.payload?.title || id))) return;
    try {
      await apiDel(id);
      setReferences((p) => p.filter((x) => x.id !== id));
      setSelectedRefs((p) => { const n = new Set(p); n.delete(id); return n; });
      logActivity(tt("log_deleted_reference"), r?.payload?.title || String(id));
      toast(tt("toast_deleted"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleBulkDeleteRefs() {
    if (selectedRefs.size === 0) return;
    if (!window.confirm(tt("confirm_bulk_delete_refs", selectedRefs.size))) return;
    for (const id of selectedRefs) { try { await apiDel(id); } catch {} }
    setReferences((p) => p.filter((r) => !selectedRefs.has(r.id)));
    setSelectedRefs(new Set());
    toast(tt("toast_deleted"));
  }
  async function handleSeedBuiltInRefs() {
    const today = new Date().toISOString().slice(0, 10);
    const existingModules = new Set(references.map((r) => r?.payload?.module));
    const toImport = modules.filter((m) => !existingModules.has(m) || !references.some((r) => r?.payload?.module === m && r?.payload?.isBuiltIn));
    if (!toImport.length) { toast(lang === "ar" ? "كل المراجع المدمجة موجودة مسبقاً" : "All built-in refs already exist"); return; }
    if (!window.confirm(tt("seed_refs_confirm", toImport.length))) return;
    let count = 0;
    for (const mod of toImport) {
      try {
        const content = MODULE_DETAILS_BI[mod] || DEFAULT_DETAILS_BI;
        const firstLine = content.split("\n")[0].trim().slice(0, 120);
        const payload = {
          title: `${mod} — Reference`,
          module: mod,
          refType: "Document",
          url: "",
          description: firstLine,
          content,
          tags: ["built-in"],
          isBuiltIn: true,
          addedAt: today,
        };
        const saved = await apiPost("sweets_training_reference", payload);
        setReferences((p) => [{ id: saved?.id, payload, created_at: new Date().toISOString() }, ...p]);
        count++;
      } catch {}
    }
    logActivity(lang === "ar" ? "استيراد مراجع مدمجة" : "Seeded built-in refs", `${count} modules`);
    toast(tt("seed_refs_done", count));
  }

  function handleExportReferences(items = filteredRefs) {
    const data = items.map((r) => r.payload);
    const csv = [
      "title,module,type,url,description,addedAt",
      ...data.map((r) => [r.title, r.module, r.refType, r.url, r.description, r.addedAt].map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "training_references.csv"; a.click();
  }

  /* SETTINGS */
  async function handleSaveSettings() {
    try {
      if (settingsRecord?.id) await apiPut(settingsRecord.id, "sweets_training_settings", settings);
      else { const saved = await apiPost("sweets_training_settings", settings); setSettingsRecord({ id: saved?.id }); }
      logActivity(tt("log_updated_settings"), "");
      toast(tt("toast_settings_saved"));
    } catch (e) { toast(e.message, "error"); }
  }

  /* BACKUP / RESTORE */
  function handleFullBackup() {
    const backup = {
      version: 1, generatedAt: new Date().toISOString(),
      modules, modulesMeta,
      questions: questionsRecords.map((r) => r.payload),
      references: references.map((r) => r.payload),
      settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `training_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    toast(tt("toast_backup_done"));
  }
  async function handleRestoreFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("Invalid file");
      if (!window.confirm(tt("confirm_restore"))) return;
      if (Array.isArray(data.modules)) await saveModulesList(data.modules, data.modulesMeta || {});
      if (Array.isArray(data.questions)) {
        for (const q of data.questions) {
          if (q?.module) {
            const existing = questionsRecords.find((r) => r?.payload?.module === q.module);
            await persistQuestions(q.module, q.questions || [], existing?.id || null);
          }
        }
      }
      if (data.settings && typeof data.settings === "object") setSettings((p) => ({ ...p, ...data.settings }));
      toast(tt("toast_restored"));
      logActivity(tt("log_restored"), "");
      setTimeout(() => loadAll(), 600);
    } catch (e) { toast(`${tt("toast_load_failed")}: ${e.message}`, "error"); }
  }

  /* DERIVED */
  const totalQuestions = useMemo(() => questionsRecords.reduce((s, r) => s + countQuestions(r), 0), [questionsRecords]);
  const modulesWithStats = useMemo(() => modules.map((name) => {
    const rec = questionsRecords.find((r) => r?.payload?.module === name);
    const meta = moduleMetaFor(name);
    const qCount = rec?.payload?.questions?.length || normalizeCanonQuestions(name).length;
    const refCount = references.filter((r) => r?.payload?.module === name).length;
    return { name, ...meta, qCount, refCount, hasServerQuestions: Boolean(rec) };
  }), [modules, modulesMeta, questionsRecords, references]);

  const filteredRefs = useMemo(() => {
    let arr = references.filter((r) => {
      const p = r.payload || {};
      if (refModuleFilter && p.module !== refModuleFilter) return false;
      if (refTypeFilter && p.refType !== refTypeFilter) return false;
      if (refFilter) {
        const tx = refFilter.toLowerCase();
        const hay = [p.title, p.module, p.refType, p.description, p.url].join(" ").toLowerCase();
        if (!hay.includes(tx)) return false;
      }
      return true;
    });
    if (refSort === "newest") arr.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (refSort === "oldest") arr.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    if (refSort === "title")  arr.sort((a, b) => (a.payload?.title || "").localeCompare(b.payload?.title || ""));
    return arr;
  }, [references, refFilter, refModuleFilter, refTypeFilter, refSort]);

  const currentQData = qModule ? getQuestionsForModule(qModule) : { id: null, questions: [] };
  const filteredQuestions = useMemo(() => {
    let arr = currentQData.questions.map((q, idx) => ({ ...q, _idx: idx }));
    if (qSearch) {
      const tx = qSearch.toLowerCase();
      arr = arr.filter((q) => [q.q_en, q.q_ar, ...(q.options_en || []), ...(q.options_ar || [])].join(" ").toLowerCase().includes(tx));
    }
    if (qDifficulty) arr = arr.filter((q) => (q.difficulty || "Medium") === qDifficulty);
    return arr;
  }, [currentQData, qSearch, qDifficulty]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const tx = globalSearch.toLowerCase();
    const out = [];
    modules.forEach((m) => { if (m.toLowerCase().includes(tx)) out.push({ type: tt("type_module"), name: m, action: () => { setSection("modules"); setShowCmdK(false); } }); });
    questionsRecords.forEach((rec) => {
      (rec?.payload?.questions || []).forEach((q, idx) => {
        if ([q.q_en, q.q_ar].join(" ").toLowerCase().includes(tx)) {
          out.push({ type: tt("type_question"), name: `${rec.payload.module} — Q${idx + 1}: ${q.q_en || q.q_ar}`, action: () => { setSection("questions"); setQModule(rec.payload.module); setShowCmdK(false); } });
        }
      });
    });
    references.forEach((r) => {
      const p = r.payload || {};
      if ([p.title, p.description].join(" ").toLowerCase().includes(tx)) {
        out.push({ type: tt("type_reference"), name: p.title, action: () => { setSection("references"); setRefFilter(p.title); setShowCmdK(false); } });
      }
    });
    return out.slice(0, 30);
  }, [globalSearch, modules, questionsRecords, references, lang]);

  const NAV = [
    { key: "overview",   icon: "🏠", label: tt("nav_overview") },
    { key: "modules",    icon: "📋", label: tt("nav_modules"),    badge: modules.length },
    { key: "questions",  icon: "❓", label: tt("nav_questions"),  badge: totalQuestions },
    { key: "references", icon: "📎", label: tt("nav_references"), badge: references.length },
    { key: "settings",   icon: "⚙️", label: tt("nav_settings") },
    { key: "backup",     icon: "💾", label: tt("nav_backup") },
    { key: "activity",   icon: "📊", label: tt("nav_activity") },
  ];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: T.pageBg, color: T.text, fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, sans-serif", display: "flex" }}
    >
      {/* ===== Sidebar ===== */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 64,
          background: T.sidebarBg, color: T.sidebarText,
          minHeight: "100vh", padding: "16px 10px", boxSizing: "border-box",
          transition: "width 0.2s", display: "flex", flexDirection: "column",
          position: "sticky", top: 0, maxHeight: "100vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 1000, fontSize: 15, color: T.sidebarTextActive }}>🛠️ {tt("app_title")}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{tt("app_sub")}</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "transparent", color: T.sidebarText, border: "none", cursor: "pointer", padding: 6, fontSize: 16 }}>
            {isAr ? (sidebarOpen ? "⇥" : "⇤") : (sidebarOpen ? "⇤" : "⇥")}
          </button>
        </div>

        <nav style={{ display: "grid", gap: 4, flex: 1 }}>
          {NAV.map((n) => {
            const active = section === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                style={{
                  background: active ? T.sidebarItemActive : "transparent",
                  color: active ? T.sidebarTextActive : T.sidebarText,
                  border: "none", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  fontWeight: active ? 1000 : 800, fontSize: 13,
                  display: "flex", alignItems: "center", gap: 10,
                  textAlign: isAr ? "right" : "left", fontFamily: "inherit",
                  boxShadow: active ? "0 4px 12px rgba(99,102,241,0.4)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>{n.label}</span>}
                {sidebarOpen && typeof n.badge === "number" && (
                  <span style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 1000 }}>{n.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div style={{ marginTop: 12, padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, opacity: 0.7 }}>
            <div>{tt("cmd_k_hint")}</div>
            <div style={{ marginTop: 4 }}>{tt("built_by")}</div>
          </div>
        )}
      </aside>

      {/* ===== Main ===== */}
      <main style={{ flex: 1, padding: "18px 22px", boxSizing: "border-box", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 1000, color: T.text }}>
              {NAV.find((n) => n.key === section)?.icon} {NAV.find((n) => n.key === section)?.label}
            </div>
            <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
              {tt("page_subtitle")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowCmdK(true)} style={{ ...btnStyle(theme, "ghost"), padding: "8px 14px", minWidth: 220, justifyContent: "space-between" }}>
              <span style={{ color: T.textMuted }}>🔍 {tt("search_anything")}</span>
              <span style={{ fontSize: 10, padding: "2px 6px", border: `1px solid ${T.cardBorder}`, borderRadius: 4, color: T.textMuted }}>⌘K</span>
            </button>
            <button onClick={() => setLang(isAr ? "en" : "ar")} style={btnStyle(theme)} title={isAr ? "Switch to English" : "بدّل إلى العربية"}>
              🌐 {isAr ? "EN" : "ع"}
            </button>
            <button onClick={loadAll} style={btnStyle(theme)} title={tt("btn_refresh")}>{loading ? "⏳" : "🔄"}</button>
            <button onClick={() => navigate("/training")} style={btnStyle(theme, "ghost")}>{tt("btn_back")}</button>
          </div>
        </div>

        {section === "overview" && <OverviewSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modules={modules} modulesWithStats={modulesWithStats} totalQuestions={totalQuestions} references={references} sessionsCount={sessionsCount} activity={activity} onJump={(s) => setSection(s)} />}
        {section === "modules" && <ModulesSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modulesWithStats={modulesWithStats} showAddModule={showAddModule} setShowAddModule={setShowAddModule} newModule={newModule} setNewModule={setNewModule} editingModule={editingModule} setEditingModule={setEditingModule} onAdd={handleAddModule} onSaveEdit={handleSaveModuleEdit} onDelete={handleDeleteModule} onMove={handleMoveModule} onJumpToQuestions={(mod) => { setSection("questions"); setQModule(mod); }} />}
        {section === "questions" && <QuestionsSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modulesWithStats={modulesWithStats} qModule={qModule} setQModule={setQModule} currentQData={currentQData} filteredQuestions={filteredQuestions} qSearch={qSearch} setQSearch={setQSearch} qDifficulty={qDifficulty} setQDifficulty={setQDifficulty} showAddQ={showAddQ} setShowAddQ={setShowAddQ} newQ={newQ} setNewQ={setNewQ} editingQIdx={editingQIdx} setEditingQIdx={setEditingQIdx} editingQData={editingQData} setEditingQData={setEditingQData} onAdd={handleAddQuestion} onSaveEdit={handleSaveEditQuestion} onDelete={handleDeleteQuestion} onMove={handleMoveQuestion} onDuplicate={handleDuplicateQuestion} onImportDefaults={handleImportDefaults} onExport={handleExportQuestions} />}
        {section === "references" && <ReferencesSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modules={modules} references={references} filteredRefs={filteredRefs} refFilter={refFilter} setRefFilter={setRefFilter} refModuleFilter={refModuleFilter} setRefModuleFilter={setRefModuleFilter} refTypeFilter={refTypeFilter} setRefTypeFilter={setRefTypeFilter} refSort={refSort} setRefSort={setRefSort} showAddRef={showAddRef} setShowAddRef={setShowAddRef} newRef={newRef} setNewRef={setNewRef} editingRef={editingRef} setEditingRef={setEditingRef} selectedRefs={selectedRefs} setSelectedRefs={setSelectedRefs} onAdd={handleAddReference} onUpdate={handleUpdateReference} onDelete={handleDeleteReference} onBulkDelete={handleBulkDeleteRefs} onExport={handleExportReferences} onSeedBuiltIn={handleSeedBuiltInRefs} />}
        {section === "settings" && <SettingsSection T={T} theme={theme} tt={tt} settings={settings} setSettings={setSettings} onSave={handleSaveSettings} />}
        {section === "backup" && <BackupSection T={T} theme={theme} tt={tt} stats={{ modules: modules.length, questions: totalQuestions, references: references.length }} onBackup={handleFullBackup} onRestoreClick={() => importFileRef.current?.click()} />}
        {section === "activity" && <ActivitySection T={T} tt={tt} activity={activity} />}

        <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestoreFile(f); e.target.value = ""; }} />
      </main>

      {showCmdK && <CmdKModal T={T} theme={theme} tt={tt} search={globalSearch} setSearch={setGlobalSearch} results={globalSearchResults} onClose={() => setShowCmdK(false)} />}

      <div style={{ position: "fixed", [isAr ? "left" : "right"]: 18, bottom: 18, display: "flex", flexDirection: "column", gap: 8, zIndex: 10000 }}>
        {toasts.map((tx) => (
          <div key={tx.id} style={{ background: tx.kind === "error" ? "#fef2f2" : "#ecfdf5", color: tx.kind === "error" ? "#b91c1c" : "#047857", border: `1px solid ${tx.kind === "error" ? "#fecaca" : "#a7f3d0"}`, padding: "10px 16px", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", fontWeight: 900, fontSize: 13, minWidth: 240 }}>
            {tx.kind === "error" ? "❌" : "✅"} {tx.text}
          </div>
        ))}
      </div>
    </div>
  );
}

