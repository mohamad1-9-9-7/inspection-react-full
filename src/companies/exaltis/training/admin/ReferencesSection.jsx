// src/companies/exaltis/training/admin/ReferencesSection.jsx
// Training admin — references tab.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import React from "react";
import { getModuleName } from "../TrainingSessionsList.helpers";
import { blankRef, COLORS, COLOR_KEYS, REF_TYPES, REF_TYPE_ICONS } from "./adminModel";
import { btnStyle, inputStyle, chipStyle, cardStyle, Label } from "./adminUi";
import { RefPreviewModal } from "./RefPreviewModal";

/* ===================== REFERENCES ===================== */
export function ReferencesSection({ T, theme, tt, isAr, lang, modules, references, filteredRefs, refFilter, setRefFilter, refModuleFilter, setRefModuleFilter, refTypeFilter, setRefTypeFilter, refSort, setRefSort, showAddRef, setShowAddRef, newRef, setNewRef, editingRef, setEditingRef, selectedRefs, setSelectedRefs, onAdd, onUpdate, onDelete, onBulkDelete, onExport, onSeedBuiltIn }) {
  const [previewRef, setPreviewRef] = React.useState(null); // { id, payload } of ref being previewed

  function toggleSelect(id) { setSelectedRefs((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function selectAll() {
    if (selectedRefs.size === filteredRefs.length) setSelectedRefs(new Set());
    else setSelectedRefs(new Set(filteredRefs.map((r) => r.id)));
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* ── Preview Modal ── */}
      {previewRef && (
        <RefPreviewModal
          refData={previewRef}
          lang={lang}
          onClose={() => setPreviewRef(null)}
          onEdit={() => { setEditingRef({ id: previewRef.id, payload: { ...previewRef.payload } }); setPreviewRef(null); }}
        />
      )}

      {/* ── Toolbar ── */}
      <div style={{ ...cardStyle(theme), padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inputStyle(theme), maxWidth: 280 }} placeholder={`🔍 ${tt("search_references")}`} value={refFilter} onChange={(e) => setRefFilter(e.target.value)} />
          <select style={{ ...inputStyle(theme), maxWidth: 200 }} value={refModuleFilter} onChange={(e) => setRefModuleFilter(e.target.value)}>
            <option value="">{tt("all_modules")}</option>
            {modules.map((m) => <option key={m} value={m}>{getModuleName(m, lang)}</option>)}
          </select>
          <select style={{ ...inputStyle(theme), maxWidth: 160 }} value={refTypeFilter} onChange={(e) => setRefTypeFilter(e.target.value)}>
            <option value="">{tt("all_types")}</option>
            {REF_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
          <select style={{ ...inputStyle(theme), maxWidth: 160 }} value={refSort} onChange={(e) => setRefSort(e.target.value)}>
            <option value="newest">{tt("sort_newest")}</option>
            <option value="oldest">{tt("sort_oldest")}</option>
            <option value="title">{tt("sort_title")}</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 800 }}>{filteredRefs.length} / {references.length}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setShowAddRef((v) => !v)} style={btnStyle(theme, "primary")}>{tt("btn_add_reference")}</button>
          <button onClick={onSeedBuiltIn} style={btnStyle(theme, "warning")} title={tt("seed_refs_title")}>{tt("btn_seed_refs")}</button>
          <button onClick={() => onExport()} style={btnStyle(theme, "ghost")}>{tt("btn_export")}</button>
          {selectedRefs.size > 0 && (
            <>
              <button onClick={selectAll} style={btnStyle(theme, "ghost")}>
                {selectedRefs.size === filteredRefs.length ? tt("deselect_all") : tt("select_all")}
              </button>
              <button onClick={onBulkDelete} style={btnStyle(theme, "danger")} data-delete-action="true">{tt("bulk_delete")} ({selectedRefs.size})</button>
            </>
          )}
        </div>
        {references.length === 0 && (
          <div style={{ padding: "12px 16px", background: COLORS.amber.bg, border: `1px solid ${COLORS.amber.border}`, borderRadius: 10, fontSize: 13, color: COLORS.amber.fg, fontWeight: 800 }}>
            📋 {tt("seed_refs_desc")}
          </div>
        )}
      </div>

      {/* ── Add form ── */}
      {showAddRef && (
        <div style={{ ...cardStyle(theme), padding: 18, borderColor: T.accent, borderWidth: 2 }}>
          <div style={{ fontWeight: 1000, marginBottom: 12, color: T.accent }}>{tt("new_reference")}</div>
          <ReferenceForm theme={theme} T={T} tt={tt} lang={lang} data={newRef} onChange={setNewRef} modules={modules} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onAdd} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
            <button onClick={() => { setShowAddRef(false); setNewRef(blankRef()); }} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
          </div>
        </div>
      )}

      {/* ── Cards grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
        {filteredRefs.length === 0 && (
          <div style={{ gridColumn: "1/-1", ...cardStyle(theme), padding: 40, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
            <div>{references.length === 0 ? tt("no_refs_yet") : tt("no_refs_match")}</div>
            {references.length === 0 && (
              <button onClick={onSeedBuiltIn} style={{ ...btnStyle(theme, "warning"), marginTop: 16 }}>{tt("btn_seed_refs")}</button>
            )}
          </div>
        )}
        {filteredRefs.map((r) => {
          const p = r.payload || {};
          const isEditing = editingRef?.id === r.id;
          const isSelected = selectedRefs.has(r.id);
          const typeIcon = REF_TYPE_ICONS[p.refType] || "📌";
          const hasContent = Boolean(p.content);
          const moduleColor = COLORS[modules.indexOf(p.module) % COLOR_KEYS.length] || COLORS.indigo;

          return (
            <div key={r.id} style={{
              ...cardStyle(theme), padding: 0, overflow: "hidden",
              borderColor: isSelected ? T.accent : (p.isBuiltIn ? COLORS.violet.border : T.cardBorder),
              borderWidth: isSelected ? 2 : 1,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* Colour top bar */}
              <div style={{ height: 4, background: p.isBuiltIn ? "linear-gradient(90deg,#4338ca,#8b5cf6)" : "linear-gradient(90deg,#94a3b8,#cbd5e1)" }} />

              {/* Header */}
              <div style={{ padding: "12px 14px 8px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)} style={{ accentColor: T.accent, marginTop: 3, flexShrink: 0 }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: p.isBuiltIn ? "linear-gradient(135deg,#4338ca,#7c3aed)" : T.chip, display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 }}>
                  {typeIcon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 13.5, color: T.text, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                    {p.refType && <span style={chipStyle("violet", true)}>{p.refType}</span>}
                    {p.module && <span style={chipStyle("sky", true)}>{getModuleName(p.module, lang)}</span>}
                    {p.isBuiltIn && <span style={chipStyle("indigo", true)}>📥</span>}
                    {hasContent && <span style={chipStyle("emerald", true)}>📝 {(p.content.length / 1000).toFixed(1)}k</span>}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div style={{ padding: "0 14px 14px" }}>
                  <ReferenceForm theme={theme} T={T} tt={tt} lang={lang} data={editingRef.payload} onChange={(u) => setEditingRef((prev) => ({ ...prev, payload: u }))} modules={modules} />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={onUpdate} style={btnStyle(theme, "success")}>{tt("btn_save")}</button>
                    <button onClick={() => setEditingRef(null)} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "0 14px 14px" }}>
                  {p.description && (
                    <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{p.description.slice(0, 120)}{p.description.length > 120 ? "…" : ""}</div>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.accent, textDecoration: "none", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4, marginBottom: 8, padding: "4px 8px", background: T.sectionBg, borderRadius: 6, border: `1px solid ${T.cardBorder}` }}>
                      🔗 <span style={{ textDecoration: "underline" }}>{p.url.slice(0, 50)}{p.url.length > 50 ? "…" : ""}</span>
                    </a>
                  )}
                  <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
                    <span style={{ fontSize: 11, color: T.textSubtle }}>{p.addedAt}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {hasContent && (
                        <button
                          onClick={() => setPreviewRef({ id: r.id, payload: p })}
                          style={{ ...btnStyle(theme, "primary"), padding: "6px 12px", fontSize: 12 }}
                        >
                          👁 {lang === "ar" ? "معاينة" : "Preview"}
                        </button>
                      )}
                      <button onClick={() => setEditingRef({ id: r.id, payload: { ...p } })} style={btnStyle(theme, "ghost")}>{tt("btn_edit")}</button>
                      <button onClick={() => onDelete(r.id)} style={btnStyle(theme, "danger")} data-delete-action="true">{tt("btn_delete")}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReferenceForm({ theme, T, tt, lang, data, onChange, modules }) {
  function set(f, v) { onChange({ ...data, [f]: v }); }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <div>
          <Label T={T}>{tt("title_required")}</Label>
          <input style={inputStyle(theme)} value={data.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <Label T={T}>{tt("module_label")}</Label>
          <select style={inputStyle(theme)} value={data.module} onChange={(e) => set("module", e.target.value)}>
            <option value="">{tt("any_module")}</option>
            {modules.map((m) => <option key={m} value={m}>{getModuleName(m, lang)}</option>)}
          </select>
        </div>
        <div>
          <Label T={T}>{tt("type_label")}</Label>
          <select style={inputStyle(theme)} value={data.refType} onChange={(e) => set("refType", e.target.value)}>
            {REF_TYPES.map((tp) => <option key={tp} value={tp}>{REF_TYPE_ICONS[tp]} {tp}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label T={T}>{tt("url_label")}</Label>
        <input style={inputStyle(theme)} value={data.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" type="url" />
      </div>
      <div>
        <Label T={T}>{tt("description_label")}</Label>
        <textarea style={{ ...inputStyle(theme, true), minHeight: 56 }} value={data.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Label T={T}>{tt("content_label")}</Label>
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            {tt("ref_char_count", (data.content || "").length)}
          </span>
        </div>
        <textarea
          style={{ ...inputStyle(theme, true), minHeight: 200, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}
          value={data.content || ""}
          onChange={(e) => set("content", e.target.value)}
          placeholder={tt("content_placeholder")}
          dir="auto"
        />
        <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
          {data.content ? `${data.content.split("\n").filter(Boolean).length} ${lang === "ar" ? "سطر" : "lines"}` : ""}
        </div>
      </div>
    </div>
  );
}
