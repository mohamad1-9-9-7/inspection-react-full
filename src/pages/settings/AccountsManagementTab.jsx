// src/pages/settings/AccountsManagementTab.jsx
// 👥 Account Management — list · add · edit · toggle · activity log
import React, { useState, useEffect, useCallback } from "react";
import API_BASE from "../../config/api";

/* ─── All available permissions (mirrors Login.jsx roles) ─── */
const ALL_PERMISSIONS = [
  { id: "*",               label: "⭐ Full Access (All Sections)" },
  { id: "admin",           label: "👑 Admin" },
  { id: "inspector",       label: "🔍 Inspector" },
  { id: "supervisor",      label: "🛠️ Supervisor" },
  { id: "daily",           label: "📅 Daily Monitor" },
  { id: "ohc",             label: "🩺 OHC" },
  { id: "returns",         label: "♻️ Returns" },
  { id: "finalProduct",    label: "🏷️ Final Product Report" },
  { id: "cars",            label: "🚗 Cars" },
  { id: "maintenance",     label: "🔧 Maintenance Requests" },
  { id: "qcsView",         label: "📦 QCS Shipments (View)" },
  { id: "training",        label: "🎓 Training Certificates" },
  { id: "internalTraining",label: "🧑‍🏫 Internal Training" },
  { id: "iso",             label: "📘 ISO 22000 & HACCP" },
  { id: "halalAudit",      label: "📋 HALAL AUDIT" },
  { id: "hse",             label: "🦺 HSE" },
  { id: "settings",        label: "⚙️ Settings" },
];

const EMPTY_FORM = {
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
  permissions: [],
  isAdmin: false,
};

/* ─── helpers ─── */
function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ═══════════════════════════════════════════
   FORM — Add / Edit account
═══════════════════════════════════════════ */
function AccountForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [err, setErr]   = useState("");
  const isEdit = !!(initial?.id);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePerm = (id) => {
    if (id === "*") {
      // star = full access: toggle everything
      const allOn = ALL_PERMISSIONS.every(p => form.permissions.includes(p.id));
      set("permissions", allOn ? [] : ALL_PERMISSIONS.map(p => p.id));
      return;
    }
    const has = form.permissions.includes(id);
    const next = has ? form.permissions.filter(x => x !== id) : [...form.permissions, id];
    // if star was checked but now removing a single perm, drop star too
    set("permissions", next.filter(x => x !== "*"));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");
    if (!form.username.trim()) return setErr("Username is required");
    if (!isEdit && !form.password.trim()) return setErr("Password is required");
    if (form.password && form.password !== form.confirmPassword)
      return setErr("Passwords don't match");
    if (form.permissions.length === 0) return setErr("Select at least one permission");
    onSave(form);
  };

  const allChecked = ALL_PERMISSIONS.every(p => form.permissions.includes(p.id));

  return (
    <form onSubmit={handleSubmit} style={fs.wrap}>
      <h3 style={fs.title}>
        {isEdit ? "✏️ Edit Account" : "➕ Add New Account"}
      </h3>

      {/* Row: username + displayName */}
      <div style={fs.row}>
        <label style={fs.field}>
          <span style={fs.label}>Username *</span>
          <input
            style={fs.input}
            value={form.username}
            onChange={e => set("username", e.target.value)}
            placeholder="e.g. mohamad"
            disabled={isEdit}
          />
        </label>
        <label style={fs.field}>
          <span style={fs.label}>Display Name</span>
          <input
            style={fs.input}
            value={form.displayName}
            onChange={e => set("displayName", e.target.value)}
            placeholder="e.g. Mohammed Abdullah"
          />
        </label>
      </div>

      {/* Row: password */}
      <div style={fs.row}>
        <label style={fs.field}>
          <span style={fs.label}>{isEdit ? "New Password (leave blank = no change)" : "Password *"}</span>
          <input
            type="password"
            style={fs.input}
            value={form.password}
            onChange={e => set("password", e.target.value)}
            placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
            autoComplete="new-password"
          />
        </label>
        <label style={fs.field}>
          <span style={fs.label}>Confirm Password</span>
          <input
            type="password"
            style={fs.input}
            value={form.confirmPassword}
            onChange={e => set("confirmPassword", e.target.value)}
            placeholder="Repeat password"
            autoComplete="new-password"
          />
        </label>
      </div>

      {/* Admin flag */}
      <label style={{ ...fs.checkRow, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={form.isAdmin}
          onChange={e => set("isAdmin", e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "#7c3aed" }}
        />
        <span style={{ fontWeight: 800, color: "#7c3aed" }}>
          👑 Mark as Admin (can manage accounts in Settings)
        </span>
      </label>

      {/* Permissions */}
      <div style={fs.permBox}>
        <div style={fs.permTitle}>
          Permissions
          <button
            type="button"
            onClick={() => set("permissions", allChecked ? [] : ALL_PERMISSIONS.map(p => p.id))}
            style={fs.selectAll}
          >
            {allChecked ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div style={fs.permGrid}>
          {ALL_PERMISSIONS.map(p => (
            <label key={p.id} style={fs.checkRow}>
              <input
                type="checkbox"
                checked={form.permissions.includes(p.id)}
                onChange={() => togglePerm(p.id)}
                style={{ width: 15, height: 15, accentColor: "#2563eb" }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {err && <div style={fs.err}>⚠️ {err}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="submit" disabled={saving} style={fs.btnSave}>
          {saving ? "Saving…" : isEdit ? "💾 Save Changes" : "✅ Create Account"}
        </button>
        <button type="button" onClick={onCancel} style={fs.btnCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════
   ACTIVITY LOG TAB
═══════════════════════════════════════════ */
function ActivityLogTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `${API_BASE}/api/activity-log?limit=200&username=${encodeURIComponent(filter)}`
        : `${API_BASE}/api/activity-log?limit=200`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.ok) setLogs(d.logs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const actionColor = {
    login:  "#16a34a",
    logout: "#dc2626",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <input
          style={{ ...fs.input, maxWidth: 220 }}
          placeholder="Filter by username…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button onClick={load} style={fs.btnRefresh}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div style={fs.loading}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={fs.empty}>No activity recorded yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={fs.table}>
            <thead>
              <tr>
                {["Time", "Username", "Action", "Detail", "IP"].map(h => (
                  <th key={h} style={fs.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={fs.td}>{fmt(log.created_at)}</td>
                  <td style={{ ...fs.td, fontWeight: 800 }}>{log.username}</td>
                  <td style={{ ...fs.td, color: actionColor[log.action] || "#374151", fontWeight: 800 }}>
                    {log.action === "login" ? "🟢 login" : log.action === "logout" ? "🔴 logout" : log.action}
                  </td>
                  <td style={fs.td}>
                    {log.detail?.displayName ? `(${log.detail.displayName})` : ""}
                  </td>
                  <td style={{ ...fs.td, fontSize: 11, color: "#94a3b8" }}>{log.ip_addr || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function AccountsManagementTab() {
  const [tab, setTab]           = useState("list"); // list | form | activity
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [serverReady, setServerReady] = useState(true); // false = server not deployed yet
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null); // { type:'ok'|'err', text }
  const [confirmDel, setConfirmDel] = useState(null); // user to delete

  /* Check if current logged-in user is admin */
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();
  const canManage = currentUser?.isAdmin || currentUser?.username === "admin";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setServerReady(true);
    try {
      const r = await fetch(`${API_BASE}/api/app-users`);
      if (r.status === 404) {
        // Server not deployed yet with new endpoints
        setServerReady(false);
        setLoading(false);
        return;
      }
      const d = await r.json();
      if (d.ok) setUsers(d.users || []);
    } catch {
      // Network error — show generic message but don't crash
      setServerReady(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  /* ── Save (add or edit) ── */
  const handleSave = async (form) => {
    if (!serverReady) {
      showMsg("err", "⚠️ Server not deployed yet — push index.cjs to Render first");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editUser?.id;
      const url    = isEdit
        ? `${API_BASE}/api/app-users/${editUser.id}`
        : `${API_BASE}/api/app-users`;
      const method = isEdit ? "PUT" : "POST";

      const body = {
        username:    form.username.trim(),
        displayName: form.displayName.trim() || form.username.trim(),
        permissions: form.permissions,
        isAdmin:     form.isAdmin,
      };
      if (form.password) body.password = form.password;

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();

      if (!d.ok) {
        const errMap = {
          username_taken: "This username is already taken.",
          "username and password required": "Username and password are required.",
        };
        showMsg("err", errMap[d.error] || d.error || "Server error");
      } else {
        showMsg("ok", isEdit ? "Account updated ✅" : "Account created ✅");
        setTab("list");
        setEditUser(null);
        loadUsers();
      }
    } catch {
      showMsg("err", "Network error — please try again");
    }
    setSaving(false);
  };

  /* ── Toggle active ── */
  const handleToggle = async (user) => {
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.is_active }),
      });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? d.user : u));
        showMsg("ok", user.is_active ? "Account disabled" : "Account enabled");
      }
    } catch {
      showMsg("err", "Toggle failed");
    }
  };

  /* ── Delete ── */
  const handleDelete = async (user) => {
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${user.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        showMsg("ok", `Deleted "${user.username}"`);
      }
    } catch {
      showMsg("err", "Delete failed");
    }
    setConfirmDel(null);
  };

  const permLabel = (perms) => {
    if (!perms || perms.length === 0) return <span style={{ color: "#94a3b8" }}>No permissions</span>;
    if (perms.includes("*") || perms.length >= ALL_PERMISSIONS.length)
      return <span style={{ color: "#7c3aed", fontWeight: 900 }}>⭐ Full Access</span>;
    return (
      <span style={{ fontSize: 11, color: "#374151" }}>
        {perms.slice(0, 3).join(", ")}
        {perms.length > 3 && <span style={{ color: "#94a3b8" }}> +{perms.length - 3} more</span>}
      </span>
    );
  };

  /* ─── Tabs ─── */
  const tabs = [
    { id: "list",     label: "👥 Accounts" },
    { id: "activity", label: "📜 Activity Log" },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 1000, fontSize: 20, color: "#0f172a" }}>
            👥 Account Management
          </h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Manage named accounts · permissions · login history
          </p>
        </div>
        {tab !== "form" && (
          <button
            onClick={() => { setEditUser(null); setTab("form"); }}
            style={fs.btnAdd}
          >
            ➕ Add Account
          </button>
        )}
      </div>

      {/* Toast */}
      {msg && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, marginBottom: 14, fontWeight: 800, fontSize: 13,
          background: msg.type === "ok" ? "#dcfce7" : "#fee2e2",
          color:      msg.type === "ok" ? "#166534" : "#991b1b",
          border:     `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDel && (
        <div style={fs.overlay}>
          <div style={fs.modal}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>🗑️ Delete Account</div>
            <p style={{ color: "#374151", marginBottom: 16 }}>
              Delete <strong>{confirmDel.username}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleDelete(confirmDel)} style={fs.btnDanger}>Delete</button>
              <button onClick={() => setConfirmDel(null)} style={fs.btnCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher (not shown in form mode) */}
      {tab !== "form" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "2px solid #e2e8f0", paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 18px",
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid #2563eb" : "2.5px solid transparent",
                color: tab === t.id ? "#2563eb" : "#64748b",
                fontWeight: 900, fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Server not deployed yet banner ── */}
      {!serverReady && (
        <div style={{
          background: "#fffbeb",
          border: "1.5px solid #fbbf24",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 900, color: "#92400e", fontSize: 14, marginBottom: 4 }}>
              Server not updated yet
            </div>
            <div style={{ color: "#78350f", fontSize: 13, lineHeight: 1.6 }}>
              The <code style={{ background: "#fef3c7", padding: "1px 6px", borderRadius: 4 }}>/api/app-users</code> endpoint
              is not available on the deployed server yet.<br />
              Push <strong>index.cjs</strong> to Render first, then refresh this page.
            </div>
          </div>
        </div>
      )}

      {/* ── List Tab ── */}
      {tab === "list" && (
        <div>
          {loading ? (
            <div style={fs.loading}>Loading accounts…</div>
          ) : !serverReady ? (
            <div style={fs.empty}>⏳ Waiting for server deployment…</div>
          ) : users.length === 0 ? (
            <div style={fs.empty}>No accounts yet. Create one with "Add Account".</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={fs.table}>
                <thead>
                  <tr>
                    {["Username", "Display Name", "Permissions", "Admin", "Status", "Last Login", "Actions"].map(h => (
                      <th key={h} style={fs.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        opacity: u.is_active ? 1 : 0.55,
                      }}
                    >
                      <td style={{ ...fs.td, fontWeight: 900, color: "#1e3a5f" }}>
                        {u.username}
                      </td>
                      <td style={fs.td}>{u.display_name || "—"}</td>
                      <td style={fs.td}>{permLabel(u.permissions)}</td>
                      <td style={{ ...fs.td, textAlign: "center" }}>
                        {u.is_admin ? "👑" : "—"}
                      </td>
                      <td style={{ ...fs.td, textAlign: "center" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900,
                          background: u.is_active ? "#dcfce7" : "#fee2e2",
                          color:      u.is_active ? "#166534" : "#991b1b",
                        }}>
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ ...fs.td, fontSize: 11, color: "#64748b" }}>
                        {fmt(u.last_login)}
                      </td>
                      <td style={{ ...fs.td, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => { setEditUser(u); setTab("form"); }}
                            style={fs.btnSm}
                            title="Edit"
                          >✏️</button>
                          <button
                            onClick={() => handleToggle(u)}
                            style={{ ...fs.btnSm, background: u.is_active ? "#fef3c7" : "#dcfce7" }}
                            title={u.is_active ? "Disable" : "Enable"}
                          >
                            {u.is_active ? "🔒" : "🔓"}
                          </button>
                          <button
                            onClick={() => setConfirmDel(u)}
                            style={{ ...fs.btnSm, background: "#fee2e2", color: "#991b1b" }}
                            title="Delete"
                            disabled={u.username === "admin"}
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Form Tab ── */}
      {tab === "form" && (
        <AccountForm
          initial={editUser ? {
            id:             editUser.id,
            username:       editUser.username,
            displayName:    editUser.display_name,
            password:       "",
            confirmPassword:"",
            permissions:    editUser.permissions || [],
            isAdmin:        editUser.is_admin,
          } : EMPTY_FORM}
          onSave={handleSave}
          onCancel={() => { setTab("list"); setEditUser(null); }}
          saving={saving}
        />
      )}

      {/* ── Activity Log Tab ── */}
      {tab === "activity" && <ActivityLogTab />}
    </div>
  );
}

/* ─── Styles ─── */
const fs = {
  wrap: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "24px 28px",
    maxWidth: 780,
  },
  title: { margin: "0 0 18px", fontWeight: 1000, fontSize: 17, color: "#0f172a" },
  row: { display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" },
  field: { flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: ".05em" },
  input: {
    padding: "9px 12px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 13,
    fontFamily: "inherit",
    color: "#0f172a",
    background: "#f8fafc",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  permBox: {
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 4,
    background: "#f8fafc",
  },
  permTitle: {
    fontWeight: 900, fontSize: 12, color: "#475569",
    textTransform: "uppercase", letterSpacing: ".05em",
    marginBottom: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  selectAll: {
    fontSize: 11, fontWeight: 900, color: "#2563eb",
    background: "none", border: "none", cursor: "pointer", padding: "2px 8px",
    borderRadius: 6, fontFamily: "inherit",
  },
  permGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "6px 12px",
  },
  checkRow: {
    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
    padding: "4px 6px", borderRadius: 8,
  },
  err: {
    color: "#991b1b", background: "#fee2e2",
    padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 800,
    marginTop: 8,
  },
  btnSave: {
    padding: "10px 22px",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 10,
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  btnCancel: {
    padding: "10px 18px",
    background: "#f1f5f9", color: "#374151",
    border: "1px solid #e2e8f0", borderRadius: 10,
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  btnAdd: {
    padding: "10px 20px",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 10,
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 6px 16px rgba(37,99,235,.25)",
  },
  btnRefresh: {
    padding: "8px 14px",
    background: "#f1f5f9", color: "#374151",
    border: "1px solid #e2e8f0", borderRadius: 10,
    fontWeight: 900, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit",
  },
  btnDanger: {
    padding: "10px 18px",
    background: "#dc2626", color: "#fff",
    border: "none", borderRadius: 10,
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSm: {
    padding: "5px 9px", background: "#f1f5f9",
    border: "1px solid #e2e8f0", borderRadius: 8,
    fontSize: 14, cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "8px 12px", background: "#f8fafc",
    fontSize: 11, fontWeight: 900, color: "#64748b",
    textTransform: "uppercase", letterSpacing: ".05em",
    textAlign: "left", whiteSpace: "nowrap",
    borderBottom: "2px solid #e2e8f0",
  },
  td: { padding: "10px 12px", fontSize: 13, color: "#0f172a", verticalAlign: "middle" },
  loading: { padding: "40px 0", textAlign: "center", color: "#94a3b8", fontWeight: 700 },
  empty:   { padding: "40px 0", textAlign: "center", color: "#94a3b8", fontWeight: 700 },
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: "24px 28px",
    boxShadow: "0 20px 60px rgba(0,0,0,.18)",
    width: "min(420px,92vw)", border: "1px solid #e2e8f0",
  },
};
