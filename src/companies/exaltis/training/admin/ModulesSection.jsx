// src/companies/exaltis/training/admin/ModulesSection.jsx
// Training admin — modules tab.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { getModuleName } from "../TrainingSessionsList.helpers";
import { ICONS, COLORS, COLOR_KEYS } from "./adminModel";
import { btnStyle, inputStyle, chipStyle, cardStyle, Label } from "./adminUi";

/* ===================== MODULES ===================== */
export function ModulesSection({ T, theme, tt, isAr, lang, modulesWithStats, showAddModule, setShowAddModule, newModule, setNewModule, editingModule, setEditingModule, onAdd, onSaveEdit, onDelete, onMove, onJumpToQuestions }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 13 }}>
          {modulesWithStats.length} {tt("modules_count_subtitle")}
        </div>
        <button onClick={() => setShowAddModule((v) => !v)} style={btnStyle(theme, "primary")}>{tt("btn_add_module")}</button>
      </div>

      {showAddModule && (
        <div style={{ ...cardStyle(theme), padding: 18, borderColor: T.accent, borderWidth: 2 }}>
          <div style={{ fontWeight: 1000, marginBottom: 12, color: T.accent }}>{tt("new_module")}</div>
          <ModuleMetaForm theme={theme} T={T} tt={tt} data={newModule} onChange={setNewModule} showName />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onAdd} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
            <button onClick={() => setShowAddModule(false)} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {modulesWithStats.map((m, idx) => {
          const c = COLORS[m.color] || COLORS.indigo;
          const isEditing = editingModule?.originalName === m.name;
          return (
            <div key={m.name} style={{ ...cardStyle(theme), padding: 0, overflow: "hidden" }}>
              <div style={{ background: `linear-gradient(135deg, ${c.solid}, ${c.solid}aa)`, padding: "14px 16px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 28 }}>{m.icon}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onMove(idx, -1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 900 }}>↑</button>
                  <button onClick={() => onMove(idx, 1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 900 }}>↓</button>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                {isEditing ? (
                  <>
                    <ModuleMetaForm theme={theme} T={T} tt={tt} data={editingModule} onChange={setEditingModule} showName />
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button onClick={onSaveEdit} style={btnStyle(theme, "success")}>{tt("btn_save")}</button>
                      <button onClick={() => setEditingModule(null)} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 1000, color: T.text, marginBottom: 4 }}>{getModuleName(m.name, lang)}</div>
                    {m.description && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{m.description}</div>}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                      <span style={chipStyle(m.color, true)}>❓ {m.qCount} {tt("questions_count")}</span>
                      <span style={chipStyle("sky", true)}>📎 {m.refCount} {tt("refs_count")}</span>
                      {!m.hasServerQuestions && <span style={chipStyle("amber", true)}>{tt("default_tag")}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => onJumpToQuestions(m.name)} style={btnStyle(theme, "primary")}>{tt("btn_questions")}</button>
                      <button onClick={() => setEditingModule({ originalName: m.name, name: m.name, icon: m.icon, color: m.color, description: m.description })} style={btnStyle(theme, "ghost")}>{tt("btn_edit")}</button>
                      <button onClick={() => onDelete(m.name)} style={btnStyle(theme, "danger")} data-delete-action="true">{tt("btn_delete")}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ModuleMetaForm({ theme, T, tt, data, onChange, showName }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {showName && (
        <div>
          <Label T={T}>{tt("module_name")}</Label>
          <input style={inputStyle(theme)} value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label T={T}>{tt("icon")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflow: "auto", padding: 6, border: `1px solid ${T.inputBorder}`, borderRadius: 10, background: T.inputBg }}>
            {ICONS.map((ic) => (
              <button key={ic} type="button" onClick={() => onChange({ ...data, icon: ic })} style={{ width: 32, height: 32, fontSize: 18, background: data.icon === ic ? T.accent : "transparent", color: data.icon === ic ? "#fff" : T.text, border: `1px solid ${data.icon === ic ? T.accent : T.cardBorder}`, borderRadius: 6, cursor: "pointer" }}>{ic}</button>
            ))}
          </div>
        </div>
        <div>
          <Label T={T}>{tt("color")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 6, border: `1px solid ${T.inputBorder}`, borderRadius: 10, background: T.inputBg }}>
            {COLOR_KEYS.map((ck) => {
              const c = COLORS[ck];
              return <button key={ck} type="button" onClick={() => onChange({ ...data, color: ck })} style={{ width: 26, height: 26, background: c.solid, border: data.color === ck ? "3px solid #0f172a" : "2px solid #fff", borderRadius: "50%", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />;
            })}
          </div>
        </div>
      </div>
      <div>
        <Label T={T}>{tt("description_optional")}</Label>
        <textarea style={inputStyle(theme, true)} value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder={tt("description_placeholder")} />
      </div>
    </div>
  );
}
