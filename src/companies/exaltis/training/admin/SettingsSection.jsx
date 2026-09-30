// src/companies/exaltis/training/admin/SettingsSection.jsx
// Training admin — settings, backup and activity tabs.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { btnStyle, inputStyle, cardStyle, Stat, Field, Toggle } from "./adminUi";

/* ===================== SETTINGS ===================== */
export function SettingsSection({ T, theme, tt, settings, setSettings, onSave }) {
  function set(f, v) { setSettings((p) => ({ ...p, [f]: v })); }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 14 }}>{tt("quiz_settings")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <Field T={T} label={tt("pass_mark")} hint={tt("pass_mark_hint")}>
            <input type="number" min={0} max={100} style={inputStyle(theme)} value={settings.passMark} onChange={(e) => set("passMark", Number(e.target.value))} />
          </Field>
          <Field T={T} label={tt("default_language")}>
            <select style={inputStyle(theme)} value={settings.defaultLang} onChange={(e) => set("defaultLang", e.target.value)}>
              <option value="en">{tt("en_lang")}</option>
              <option value="ar">{tt("ar_lang")}</option>
            </select>
          </Field>
          <Field T={T} label={tt("time_limit")} hint={tt("time_limit_hint")}>
            <input type="number" min={0} style={inputStyle(theme)} value={settings.quizTimeLimit} onChange={(e) => set("quizTimeLimit", Number(e.target.value))} />
          </Field>
          <Field T={T} label={tt("max_retakes")}>
            <input type="number" min={0} max={10} style={inputStyle(theme)} value={settings.maxRetakes} onChange={(e) => set("maxRetakes", Number(e.target.value))} />
          </Field>
        </div>
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <Toggle T={T} label={tt("randomize_order")} value={settings.randomizeOrder} onChange={(v) => set("randomizeOrder", v)} />
          <Toggle T={T} label={tt("show_answer_after")} value={settings.showAnswerAfter} onChange={(v) => set("showAnswerAfter", v)} />
          <Toggle T={T} label={tt("allow_retake")} value={settings.allowRetake} onChange={(v) => set("allowRetake", v)} />
        </div>
      </div>

      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 14 }}>{tt("certificate")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <Field T={T} label={tt("org_name")}>
            <input style={inputStyle(theme)} value={settings.orgName} onChange={(e) => set("orgName", e.target.value)} />
          </Field>
          <Field T={T} label={tt("signatory")}>
            <input style={inputStyle(theme)} value={settings.signatory} onChange={(e) => set("signatory", e.target.value)} />
          </Field>
          <Field T={T} label={tt("validity_months")}>
            <input type="number" min={1} max={60} style={inputStyle(theme)} value={settings.certValidity} onChange={(e) => set("certValidity", Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 14 }}>{tt("notes_trainers")}</div>
        <textarea style={inputStyle(theme, true)} value={settings.notes} onChange={(e) => set("notes", e.target.value)} placeholder={tt("notes_placeholder")} />
      </div>

      <div>
        <button onClick={onSave} style={btnStyle(theme, "primary")}>{tt("btn_save_settings")}</button>
      </div>
    </div>
  );
}

/* ===================== BACKUP ===================== */
export function BackupSection({ T, theme, tt, stats, onBackup, onRestoreClick }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...cardStyle(theme), padding: 22 }}>
        <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 6 }}>{tt("backup_title")}</div>
        <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>{tt("backup_desc")}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <Stat T={T} label={tt("nav_modules")} value={stats.modules} icon="📋" />
          <Stat T={T} label={tt("nav_questions")} value={stats.questions} icon="❓" />
          <Stat T={T} label={tt("nav_references")} value={stats.references} icon="📎" />
        </div>
        <button onClick={onBackup} style={{ ...btnStyle(theme, "primary"), padding: "12px 20px", fontSize: 14 }}>{tt("btn_download_backup")}</button>
      </div>

      <div style={{ ...cardStyle(theme), padding: 22 }}>
        <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 6 }}>{tt("restore_title")}</div>
        <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>
          {tt("restore_desc1")}<br />
          <b style={{ color: T.warning }}>{tt("restore_warning")}</b>
        </div>
        <button onClick={onRestoreClick} style={{ ...btnStyle(theme, "warning"), padding: "12px 20px", fontSize: 14 }}>{tt("btn_choose_file")}</button>
      </div>
    </div>
  );
}

/* ===================== ACTIVITY ===================== */
export function ActivitySection({ T, tt, activity }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {activity.length === 0 && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 40, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
          {tt("no_activity_full")}
          <div style={{ fontSize: 11, marginTop: 8 }}>{tt("activity_note")}</div>
        </div>
      )}
      {activity.map((a) => (
        <div key={a.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 1000, fontSize: 13, color: T.text }}>{a.action}</div>
            {a.target && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{a.target}</div>}
          </div>
          <div style={{ fontSize: 11, color: T.textSubtle, whiteSpace: "nowrap" }}>{new Date(a.at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
