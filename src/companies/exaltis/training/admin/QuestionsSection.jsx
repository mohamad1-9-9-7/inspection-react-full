// src/companies/exaltis/training/admin/QuestionsSection.jsx
// Training admin — question bank tab.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { getModuleName } from "../TrainingSessionsList.helpers";
import { blankQuestion, COLORS, DIFFICULTY, DIFF_COLORS, DIFFICULTY_LABEL, isQuestionComplete } from "./adminModel";
import { btnStyle, inputStyle, chipStyle, cardStyle, Label } from "./adminUi";

/* ===================== QUESTIONS ===================== */
export function QuestionsSection({ T, theme, tt, isAr, lang, modulesWithStats, qModule, setQModule, currentQData, filteredQuestions, qSearch, setQSearch, qDifficulty, setQDifficulty, showAddQ, setShowAddQ, newQ, setNewQ, editingQIdx, setEditingQIdx, editingQData, setEditingQData, onAdd, onSaveEdit, onDelete, onMove, onDuplicate, onImportDefaults, onExport }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...cardStyle(theme), padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {modulesWithStats.map((m) => {
            const c = COLORS[m.color] || COLORS.indigo;
            const active = m.name === qModule;
            return (
              <button key={m.name} onClick={() => setQModule(m.name)}
                style={{ padding: "8px 14px", borderRadius: 99, border: active ? `2px solid ${c.solid}` : `1px solid ${T.cardBorder}`, background: active ? c.bg : T.cardBg, color: active ? c.fg : T.text, fontWeight: active ? 1000 : 800, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                <span>{m.icon}</span>
                <span>{getModuleName(m.name, lang)}</span>
                <span style={{ background: active ? c.solid : T.chip, color: active ? "#fff" : T.textMuted, padding: "1px 6px", borderRadius: 99, fontSize: 10, fontWeight: 1000 }}>{m.qCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {qModule ? (
        <>
          <div style={{ ...cardStyle(theme), padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...inputStyle(theme), maxWidth: 260 }} placeholder={`🔍 ${tt("search_questions")}`} value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
            <select style={{ ...inputStyle(theme), maxWidth: 160 }} value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
              <option value="">{tt("all_difficulties")}</option>
              {DIFFICULTY.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[lang]?.[d] || d}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 800 }}>{filteredQuestions.length} / {currentQData.questions.length}</span>
            <button onClick={() => setShowAddQ((v) => !v)} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
            <button onClick={onImportDefaults} style={btnStyle(theme, "warning")}>{tt("btn_defaults")}</button>
            <button onClick={() => onExport()} style={btnStyle(theme, "ghost")}>{tt("btn_export")}</button>
          </div>

          {showAddQ && (
            <div style={{ ...cardStyle(theme), padding: 18, borderColor: T.accent, borderWidth: 2 }}>
              <div style={{ fontWeight: 1000, marginBottom: 12, color: T.accent }}>{tt("new_question")}</div>
              <QuestionForm theme={theme} T={T} tt={tt} lang={lang} data={newQ} onChange={setNewQ} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={onAdd} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
                <button onClick={() => { setShowAddQ(false); setNewQ(blankQuestion()); }} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {filteredQuestions.length === 0 && (
              <div style={{ ...cardStyle(theme), padding: 30, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
                {currentQData.questions.length === 0 ? tt("no_questions_yet") : tt("no_questions_match")}
              </div>
            )}
            {filteredQuestions.map((q) => {
              const idx = q._idx;
              const isEditing = editingQIdx === idx && editingQData;
              return (
                <div key={idx} style={{ ...cardStyle(theme), padding: 14 }}>
                  {isEditing ? (
                    <>
                      <QuestionForm theme={theme} T={T} tt={tt} lang={lang} data={editingQData} onChange={setEditingQData} />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={onSaveEdit} style={btnStyle(theme, "success")}>{tt("btn_save")}</button>
                        <button onClick={() => { setEditingQIdx(null); setEditingQData(null); }} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={chipStyle("indigo", true)}>Q{idx + 1}</span>
                          <span style={chipStyle(DIFF_COLORS[q.difficulty || "Medium"], true)}>{DIFFICULTY_LABEL[lang]?.[q.difficulty || "Medium"] || (q.difficulty || "Medium")}</span>
                          {!isQuestionComplete(q) && <span style={chipStyle("rose", true)}>{tt("incomplete")}</span>}
                        </div>
                        {(() => {
                          const qText = lang === "ar" ? (q.q_ar || q.q_en) : (q.q_en || q.q_ar);
                          const opts = lang === "ar" ? (q.options_ar?.length ? q.options_ar : q.options_en || []) : (q.options_en?.length ? q.options_en : q.options_ar || []);
                          return (
                            <>
                              <div style={{ fontWeight: 1000, color: T.text, fontSize: 14, direction: lang === "ar" ? "rtl" : "ltr" }}>{qText}</div>
                              <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                                {opts.map((opt, oi) => {
                                  const correct = oi === q.correct;
                                  return (
                                    <div key={oi} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: correct ? COLORS.emerald.bg : T.sectionBg, color: correct ? COLORS.emerald.fg : T.text, fontWeight: correct ? 1000 : 700, border: correct ? `1px solid ${COLORS.emerald.border}` : `1px solid ${T.cardBorder}`, direction: lang === "ar" ? "rtl" : "ltr" }}>
                                      {correct ? "✅" : "○"} {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => onMove(idx, -1)} style={btnStyle(theme, "ghost")} title={tt("move_up")}>↑</button>
                        <button onClick={() => onMove(idx, 1)} style={btnStyle(theme, "ghost")} title={tt("move_down")}>↓</button>
                        <button onClick={() => onDuplicate(idx)} style={btnStyle(theme, "ghost")} title={tt("duplicate_tip")}>{tt("btn_duplicate")}</button>
                        <button onClick={() => { setEditingQIdx(idx); setEditingQData({ ...q, options_en: [...(q.options_en || ["","",""])], options_ar: [...(q.options_ar || ["","",""])] }); }} style={btnStyle(theme, "ghost")}>{tt("btn_edit")}</button>
                        <button onClick={() => onDelete(idx)} style={btnStyle(theme, "danger")} data-delete-action="true">{tt("btn_delete")}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ ...cardStyle(theme), padding: 40, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
          {tt("pick_module_above")}
        </div>
      )}
    </div>
  );
}

export function QuestionForm({ theme, T, tt, lang, data, onChange }) {
  function setField(f, v) { onChange({ ...data, [f]: v }); }
  function setOption(L, idx, v) {
    const key = L === "en" ? "options_en" : "options_ar";
    const arr = [...(data[key] || ["", "", ""])];
    arr[idx] = v; onChange({ ...data, [key]: arr });
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label T={T}>{tt("question_en")}</Label>
          <textarea style={inputStyle(theme, true)} value={data.q_en} onChange={(e) => setField("q_en", e.target.value)} />
        </div>
        <div>
          <Label T={T}>{tt("question_ar")}</Label>
          <textarea style={{ ...inputStyle(theme, true), direction: "rtl" }} value={data.q_ar} onChange={(e) => setField("q_ar", e.target.value)} />
        </div>
      </div>
      <div>
        <Label T={T}>{tt("options_label")}</Label>
        <div style={{ display: "grid", gap: 8 }}>
          {[0, 1, 2].map((i) => {
            const correct = data.correct === i;
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderRadius: 10, background: correct ? COLORS.emerald.bg : T.sectionBg, border: `1px solid ${correct ? COLORS.emerald.border : T.cardBorder}` }}>
                <button type="button" onClick={() => setField("correct", i)} style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${correct ? COLORS.emerald.solid : T.cardBorder}`, background: correct ? COLORS.emerald.solid : "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 1000, flexShrink: 0 }}>
                  {correct ? "✓" : ""}
                </button>
                <input style={{ ...inputStyle(theme), flex: 1 }} value={(data.options_en || [])[i] || ""} onChange={(e) => setOption("en", i, e.target.value)} placeholder={`EN ${i + 1}`} />
                <input style={{ ...inputStyle(theme), flex: 1, direction: "rtl" }} value={(data.options_ar || [])[i] || ""} onChange={(e) => setOption("ar", i, e.target.value)} placeholder={`AR ${i + 1}`} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <div>
          <Label T={T}>{tt("difficulty")}</Label>
          <select style={inputStyle(theme)} value={data.difficulty || "Medium"} onChange={(e) => setField("difficulty", e.target.value)}>
            {DIFFICULTY.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[lang]?.[d] || d}</option>)}
          </select>
        </div>
        <div>
          <Label T={T}>{tt("tags_label")}</Label>
          <input style={inputStyle(theme)} value={(data.tags || []).join(", ")} onChange={(e) => setField("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder={tt("tags_placeholder")} />
        </div>
      </div>
    </div>
  );
}
