// src/pages/settings/ExcelBackupTab.jsx
// 📊 Excel Backup — each report becomes one Excel sheet matching its view design.
//    Branches and individual report types are independently selectable.

import React, { useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { getExporter } from "./excel-exporters";
import { sheetNameFor, sanitizeSheetName } from "./excel-exporters/_lib";
import { BRANCHES } from "./reportTypeCatalog";

/* ═══════════════════════════════════════════════════════════════
   BRANCH / TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */
/* Branch/type catalog lives in reportTypeCatalog.js so other screens can reuse it. */

/* ═══════════════════════════════════════════════════════════════
   API FETCH
   ═══════════════════════════════════════════════════════════════ */
async function fetchType(type) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════
   WORKBOOK BUILDER
   ═══════════════════════════════════════════════════════════════ */
function addEmptySheet(wb, typeLabel) {
  const ws = wb.addWorksheet("لا بيانات", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 60 }];
  ws.getCell("A1").value = `لا توجد بيانات لـ ${typeLabel}`;
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A1").font = { size: 13, color: { argb: "9CA3AF" } };
  ws.getRow(1).height = 36;
}

async function buildWorkbook(ExcelJS, branchLabel, typeKey, typeLabel, records) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Al Mawashi — Excel Backup";
  wb.created = new Date();

  const exporter = getExporter(typeKey);

  // Collection exporters (registers/logs) render ALL records into ONE sheet
  // that mirrors the on-screen table — call once with the full array.
  if (exporter.collection) {
    if (!records.length) { addEmptySheet(wb, typeLabel); return wb; }
    try {
      await exporter(wb, records, { branchLabel, typeKey, typeLabel });
    } catch (e) {
      console.error(`Collection exporter failed for ${typeKey}:`, e);
      const ws = wb.addWorksheet(sanitizeSheetName(typeLabel), { views: [{ showGridLines: false }] });
      ws.getCell("A1").value = `⚠️ Failed to render this register: ${e?.message || e}`;
      ws.getCell("A1").font = { color: { argb: "B91C1C" } };
    }
    return wb;
  }

  if (!records.length) {
    addEmptySheet(wb, typeLabel);
    return wb;
  }

  const usedNames = new Map();
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    let name = sheetNameFor(i, rec);
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    if (count > 0) name = `${name.slice(0, 28)}(${count})`;
    name = sanitizeSheetName(name);
    try {
      await exporter(wb, rec, { branchLabel, typeKey, typeLabel, sheetName: name });
    } catch (e) {
      console.error(`Exporter failed for ${typeKey} record ${i}:`, e);
      const ws = wb.addWorksheet(name, { views: [{ showGridLines: false }] });
      ws.getCell("A1").value = `⚠️ Failed to render this report: ${e?.message || e}`;
      ws.getCell("A1").font = { color: { argb: "B91C1C" } };
    }
  }
  return wb;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function ExcelBackupTab() {
  // Selection state: Set of "branchId::typeKey" strings (type-level granularity)
  const [picked, setPicked] = useState(() => {
    const all = new Set();
    BRANCHES.forEach((b) => b.types.forEach(([k]) => all.add(`${b.id}::${k}`)));
    return all;
  });
  const [expandedBranches, setExpandedBranches] = useState(() => new Set(BRANCHES.map((b) => b.id)));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [query, setQuery] = useState("");

  /* ─── Derived: counts & filter ─── */
  const totalTypes = useMemo(
    () => BRANCHES.reduce((s, b) => s + b.types.length, 0),
    []
  );
  const pickedCount = picked.size;
  const filterQ = query.trim().toLowerCase();

  function isPicked(branchId, typeKey) {
    return picked.has(`${branchId}::${typeKey}`);
  }
  function togglePicked(branchId, typeKey) {
    setPicked((prev) => {
      const next = new Set(prev);
      const key = `${branchId}::${typeKey}`;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function branchPickedCount(branch) {
    return branch.types.filter(([k]) => picked.has(`${branch.id}::${k}`)).length;
  }
  function toggleBranchAll(branch) {
    setPicked((prev) => {
      const next = new Set(prev);
      const allOn = branch.types.every(([k]) => next.has(`${branch.id}::${k}`));
      branch.types.forEach(([k]) => {
        const id = `${branch.id}::${k}`;
        if (allOn) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }
  function selectAll(on) {
    if (on) {
      const all = new Set();
      BRANCHES.forEach((b) => b.types.forEach(([k]) => all.add(`${b.id}::${k}`)));
      setPicked(all);
    } else {
      setPicked(new Set());
    }
  }
  function toggleExpand(branchId) {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      next.has(branchId) ? next.delete(branchId) : next.add(branchId);
      return next;
    });
  }

  /* ─── Generate ─── */
  async function handleGenerate() {
    if (pickedCount === 0) {
      setMsg({ kind: "err", text: "⚠️ اختر تقرير واحد على الأقل" });
      return;
    }
    setBusy(true);
    setStats(null);
    setMsg({ kind: "info", text: "⏳ جارٍ جلب البيانات من السيرفر..." });

    try {
      const [JSZipModule, ExcelJSModule] = await Promise.all([
        import("jszip"),
        import("exceljs"),
      ]);
      const JSZip   = JSZipModule.default;
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const zip     = new JSZip();

      // Build flat list of [branch, typeKey, typeLabel] for picked items
      const work = [];
      BRANCHES.forEach((b) => {
        b.types.forEach(([k, lbl]) => {
          if (picked.has(`${b.id}::${k}`)) work.push({ branch: b, typeKey: k, typeLabel: lbl });
        });
      });

      let step = 0;
      let filesCreated = 0;
      let filesEmpty   = 0;
      let totalRows    = 0;
      const folderCache = new Map();
      const heavyTypes  = []; // types with 400+ records — warn user after export

      for (const { branch, typeKey, typeLabel } of work) {
        step++;
        setProgress({ current: step, total: work.length, label: `${branch.label} ← ${typeLabel}` });

        let folder = folderCache.get(branch.label);
        if (!folder) {
          folder = zip.folder(branch.label);
          folderCache.set(branch.label, folder);
        }

        const records = await fetchType(typeKey);
        totalRows += records.length;
        if (records.length >= 400) {
          heavyTypes.push(`${typeLabel} (${records.length.toLocaleString()} سجل)`);
        }

        const wb = await buildWorkbook(ExcelJS, branch.label, typeKey, typeLabel, records);
        const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });

        if (records.length === 0) {
          filesEmpty++;
          folder.file(`${typeLabel} — empty.xlsx`, buf);
        } else {
          filesCreated++;
          folder.file(`${typeLabel}.xlsx`, buf);
        }
      }

      setProgress({ current: work.length, total: work.length, label: "🗜️ جارٍ ضغط الملفات..." });

      const today = new Date().toISOString().slice(0, 10);
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AlMawashi_Excel_Backup_${today}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000); // 60s — enough for large ZIPs on slow connections

      setStats({ filesCreated, filesEmpty, totalRows, branches: folderCache.size });
      const heavyNote = heavyTypes.length > 0
        ? `  ⚠️ تقارير ضخمة (${heavyTypes.length}): ${heavyTypes.join(" · ")}`
        : "";
      setMsg({
        kind: heavyTypes.length > 0 ? "info" : "ok",
        text: `✅ تم! ${filesCreated} ملف Excel · ${filesEmpty} فارغ · ${totalRows.toLocaleString()} سجل · ${folderCache.size} فرع${heavyNote}`,
      });
    } catch (e) {
      console.error(e);
      setMsg({ kind: "err", text: `❌ فشل الإنشاء: ${e?.message || e}` });
    } finally {
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div style={S.root}>
      {/* ═══ Hero ═══ */}
      <div style={S.hero}>
        <div style={S.heroLeft}>
          <div style={S.heroBadge}>📊  EXCEL BACKUP</div>
          <h1 style={S.heroTitle}>نسخ احتياطي مُصمَّم لكل تقرير</h1>
          <p style={S.heroSub}>
            كل تقرير في السيستم بيطلع صفحة Excel منفصلة بنفس تصميم صفحة العرض الأصلية.
            اختار الفروع والتقارير اللي بدك ياها بالتحديد.
          </p>
        </div>
        <div style={S.heroRight}>
          <div style={S.heroStat}>
            <div style={S.heroStatNum}>{pickedCount}</div>
            <div style={S.heroStatLbl}>تقرير مُختار</div>
          </div>
          <div style={S.heroStatDivider} />
          <div style={S.heroStat}>
            <div style={S.heroStatNum}>{totalTypes}</div>
            <div style={S.heroStatLbl}>إجمالي</div>
          </div>
        </div>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div style={S.toolbar}>
        <div style={S.search}>
          <span style={S.searchIco}>🔎</span>
          <input
            type="text"
            placeholder="ابحث عن نوع تقرير..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={S.searchInput}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} style={S.searchClear} title="مسح">✕</button>
          )}
        </div>
        <div style={S.toolbarBtns}>
          <button onClick={() => selectAll(true)}  style={S.btnGhost}>تحديد الكل</button>
          <button onClick={() => selectAll(false)} style={S.btnGhost}>إلغاء الكل</button>
          <button
            onClick={() => setExpandedBranches(new Set(BRANCHES.map((b) => b.id)))}
            style={S.btnGhost}
          >
            توسيع
          </button>
          <button
            onClick={() => setExpandedBranches(new Set())}
            style={S.btnGhost}
          >
            طي
          </button>
        </div>
      </div>

      {/* ═══ Branch grid ═══ */}
      <div style={S.branchGrid}>
        {BRANCHES.map((branch) => {
          const expanded = expandedBranches.has(branch.id);
          const count = branchPickedCount(branch);
          const total = branch.types.length;
          const allOn = count === total;
          const someOn = count > 0 && count < total;

          // Filter types by search query
          const visibleTypes = branch.types.filter(([, lbl]) => {
            if (!filterQ) return true;
            return lbl.toLowerCase().includes(filterQ) || branch.label.toLowerCase().includes(filterQ);
          });
          if (filterQ && visibleTypes.length === 0) return null;

          return (
            <div key={branch.id} style={S.branchCard(branch.accent, count > 0)}>
              {/* Branch header */}
              <div style={S.branchHead}>
                <button
                  type="button"
                  onClick={() => toggleExpand(branch.id)}
                  style={S.branchHeadLeft}
                  title={expanded ? "طي" : "توسيع"}
                >
                  <span style={S.branchEmoji}>{branch.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.branchName(branch.accent)}>{branch.label}</div>
                    <div style={S.branchCount}>
                      {count}/{total} نوع
                    </div>
                  </div>
                  <span style={S.branchChev}>{expanded ? "▾" : "▸"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleBranchAll(branch)}
                  style={S.branchTogAll(allOn, someOn, branch.accent)}
                  title={allOn ? "إلغاء كل تقارير الفرع" : "تحديد كل تقارير الفرع"}
                >
                  {allOn ? "✓" : someOn ? "—" : ""}
                </button>
              </div>

              {/* Types list (collapsible) */}
              {expanded && (
                <div style={S.typeList}>
                  {visibleTypes.map(([k, lbl]) => {
                    const on = isPicked(branch.id, k);
                    return (
                      <label key={k} style={S.typeRow(on, branch.accent)}>
                        {/* hidden native checkbox for accessibility */}
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => togglePicked(branch.id, k)}
                          style={S.typeChkHidden}
                        />
                        <span style={S.typeLbl}>{lbl}</span>
                        {/* custom visible checkbox */}
                        <span style={S.typeChkBox(on, branch.accent)}>
                          {on && "✓"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Action bar (sticky bottom) ═══ */}
      <div style={S.actionBar}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || pickedCount === 0}
          style={S.btnGenerate(busy, pickedCount === 0)}
        >
          {busy
            ? `⏳  ${progress.current}/${progress.total} — ${pct}%`
            : `📥  إنشاء وتحميل ZIP   ·   ${pickedCount} ملف Excel`}
        </button>

        {busy && (
          <div style={S.progressBox}>
            <div style={S.progressTrack}>
              <div style={S.progressBar(pct)} />
            </div>
            {progress.label && <div style={S.progressLabel}>{progress.label}</div>}
          </div>
        )}
      </div>

      {/* ═══ Message ═══ */}
      {msg.text && <div style={S.msgBox(msg.kind)}>{msg.text}</div>}

      {/* ═══ Stats ═══ */}
      {stats && !busy && (
        <div style={S.statsGrid}>
          <Stat icon="✅" label="ملف بيانات" value={stats.filesCreated} color="#16a34a" bg="#dcfce7" />
          <Stat icon="📭" label="ملف فارغ"   value={stats.filesEmpty}   color="#92400e" bg="#fef3c7" />
          <Stat icon="📋" label="إجمالي السجلات" value={stats.totalRows.toLocaleString()} color="#1e40af" bg="#dbeafe" />
          <Stat icon="🏢" label="فرع"          value={stats.branches}    color="#7c3aed" bg="#ede9fe" />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${color}44`, borderRadius: 16, padding: "18px 22px" }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 1000, color, marginTop: 8, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", marginTop: 6 }}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — wide cards, big font, clear checkboxes
   ═══════════════════════════════════════════════════════════════ */
const NAVY   = "#0b1f4d";
const SLATE  = "#475569";
const SLATE2 = "#64748b";
const BORDER = "#dde3ec";

const S = {
  root: {
    fontFamily: 'ui-sans-serif, "Segoe UI", Cairo, sans-serif',
    color: NAVY,
    direction: "rtl",
  },

  /* ── Hero ── */
  hero: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 24,
    alignItems: "center",
    padding: "28px 36px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #2d5a8e 100%)",
    color: "#fff",
    borderRadius: 20,
    marginBottom: 18,
    boxShadow: "0 18px 40px rgba(15,23,42,.22)",
  },
  heroLeft: { minWidth: 0 },
  heroBadge: {
    display: "inline-block",
    padding: "6px 16px",
    borderRadius: 999,
    background: "rgba(255,255,255,.15)",
    border: "1px solid rgba(255,255,255,.28)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".16em",
    marginBottom: 12,
  },
  heroTitle: {
    margin: 0,
    fontSize: "1.9rem",
    fontWeight: 1000,
    lineHeight: 1.2,
  },
  heroSub: {
    margin: "10px 0 0",
    fontSize: 15,
    opacity: 0.85,
    lineHeight: 1.65,
    maxWidth: 720,
  },
  heroRight: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: "18px 24px",
    background: "rgba(255,255,255,.09)",
    border: "1px solid rgba(255,255,255,.22)",
    borderRadius: 16,
  },
  heroStat: { textAlign: "center", minWidth: 80 },
  heroStatNum: { fontSize: "2.4rem", fontWeight: 1000, lineHeight: 1, color: "#fff" },
  heroStatLbl: { fontSize: 13, fontWeight: 700, opacity: 0.8, marginTop: 5 },
  heroStatDivider: { width: 1, height: 44, background: "rgba(255,255,255,.28)" },

  /* ── Toolbar ── */
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: "14px 18px",
    background: "#fff",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 16,
    marginBottom: 14,
    boxShadow: "0 3px 10px rgba(2,6,23,.06)",
  },
  search: {
    flex: "1 1 300px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f6f8fb",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12,
    padding: "0 16px",
    height: 46,
  },
  searchIco: { fontSize: 17, color: SLATE2 },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "inherit",
    color: NAVY,
    height: "100%",
  },
  searchClear: {
    background: "#e2e8f0",
    color: NAVY,
    border: "none",
    borderRadius: 999,
    width: 24,
    height: 24,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    display: "grid",
    placeItems: "center",
  },
  toolbarBtns: { display: "flex", gap: 8, flexWrap: "wrap" },
  btnGhost: {
    background: "#f1f5f9",
    color: NAVY,
    border: `1.5px solid ${BORDER}`,
    padding: "10px 20px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
    fontFamily: "inherit",
    transition: "all .12s",
  },

  /* ── Branch grid — wider cards ── */
  branchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: 16,
    marginBottom: 18,
  },
  branchCard: (accent, hasSelection) => ({
    background: "#fff",
    border: `2px solid ${hasSelection ? accent : BORDER}`,
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
    boxShadow: hasSelection
      ? `0 10px 30px ${accent}28`
      : "0 2px 8px rgba(2,6,23,.06)",
    transition: "all .16s",
    display: "flex",
    flexDirection: "column",
  }),
  branchHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 20px",
    background: "#f6f8fb",
    borderBottom: `1.5px solid ${BORDER}`,
  },
  branchHeadLeft: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    color: NAVY,
    textAlign: "start",
    padding: 0,
  },
  branchEmoji: { fontSize: 30, flexShrink: 0 },
  branchName: () => ({
    fontWeight: 900,
    fontSize: 18,
    color: NAVY,
    lineHeight: 1.2,
  }),
  branchCount: { fontSize: 13, fontWeight: 700, color: SLATE2, marginTop: 3 },
  branchChev: { fontSize: 16, color: SLATE2, fontWeight: 900, marginLeft: 4 },

  /* ── Branch select-all toggle ── */
  branchTogAll: (allOn, someOn, accent) => ({
    width: 34, height: 34, borderRadius: 9,
    background: allOn ? accent : (someOn ? `${accent}22` : "#fff"),
    color: allOn ? "#fff" : (someOn ? accent : NAVY),
    border: `2px solid ${allOn || someOn ? accent : "#c8d0dc"}`,
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 16,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    transition: "all .14s",
  }),

  /* ── Type rows ── */
  typeList: {
    padding: "10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    maxHeight: 440,
    overflowY: "auto",
  },
  typeRow: (on, accent) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "13px 16px",
    borderRadius: 12,
    background: on ? `${accent}12` : "#fdfdfe",
    border: `1.5px solid ${on ? accent : "#e4e9f0"}`,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all .12s",
    minHeight: 52,
  }),
  typeChkHidden: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
    pointerEvents: "none",
  },
  typeLbl: {
    flex: 1,
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  typeChkBox: (on, accent) => ({
    width: 28, height: 28,
    borderRadius: 8,
    border: `2px solid ${on ? accent : "#c4cdd8"}`,
    background: on ? accent : "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all .13s",
    fontSize: 15,
    color: "#fff",
    fontWeight: 900,
    boxShadow: on ? `0 3px 10px ${accent}44` : "none",
  }),

  /* ── Action bar ── */
  actionBar: {
    position: "sticky",
    bottom: 0,
    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.85) 25%, #fff 50%)",
    paddingTop: 14,
    paddingBottom: 10,
    zIndex: 5,
    marginBottom: 14,
  },
  btnGenerate: (busy, disabled) => ({
    width: "100%",
    padding: "17px 24px",
    borderRadius: 16,
    border: "none",
    background: busy
      ? "#94a3b8"
      : disabled
        ? "#cbd5e1"
        : "linear-gradient(135deg, #0b1f4d 0%, #1e3a5f 50%, #2d5a8e 100%)",
    color: "#fff",
    fontWeight: 1000,
    fontSize: 16,
    fontFamily: "inherit",
    cursor: busy || disabled ? "not-allowed" : "pointer",
    boxShadow: busy || disabled ? "none" : "0 16px 32px rgba(11,31,77,.35)",
    transition: "all .2s",
    letterSpacing: ".03em",
  }),
  progressBox: { marginTop: 12 },
  progressTrack: {
    height: 10, background: "#e2e8f0", borderRadius: 999, overflow: "hidden",
  },
  progressBar: (pct) => ({
    height: "100%", width: `${pct}%`,
    background: "linear-gradient(90deg, #1e3a5f, #2d5a8e, #7c3aed)",
    borderRadius: 999,
    transition: "width .3s ease",
  }),
  progressLabel: {
    fontSize: 13, color: SLATE, fontWeight: 700, marginTop: 7, textAlign: "center",
  },

  /* ── Message ── */
  msgBox: (kind) => ({
    borderRadius: 14,
    padding: "14px 20px",
    fontWeight: 800,
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 1.6,
    background: kind === "ok" ? "#f0fdf4" : kind === "err" ? "#fef2f2" : "#eff6ff",
    border: `1.5px solid ${kind === "ok" ? "#86efac" : kind === "err" ? "#fca5a5" : "#bfdbfe"}`,
    color:   kind === "ok" ? "#065f46" : kind === "err" ? "#991b1b" : "#1e40af",
  }),

  /* ── Stats ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
};
