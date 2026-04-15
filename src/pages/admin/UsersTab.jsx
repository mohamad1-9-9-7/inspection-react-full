import React, { useState, useEffect } from "react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";

const EMPTY_USER = { username: "", password: "", jobTitle: "", employeeId: "" };

export default function UsersTab({ users = [], setUsers = () => {} }) {
  const [newUser,        setNewUser]        = useState(EMPTY_USER);
  const [showPasswords,  setShowPasswords]  = useState([]);
  const [editingIndex,   setEditingIndex]   = useState(null);
  const [editUser,       setEditUser]       = useState(EMPTY_USER);

  useEffect(() => {
    setShowPasswords(Array(users.length).fill(false));
  }, [users.length]);

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password || !newUser.jobTitle || !newUser.employeeId) {
      alert("⚠️ الرجاء إدخال جميع الحقول.");
      return;
    }
    if (users.some(u => u.username === newUser.username)) {
      alert("⚠️ هذا المستخدم موجود مسبقًا.");
      return;
    }
    const updated = [...users, newUser];
    localStorage.setItem("readonlyUsers", JSON.stringify(updated));
    setUsers(updated);
    setNewUser(EMPTY_USER);
  };

  const handleSaveEdit = () => {
    const updated = [...users];
    updated[editingIndex] = editUser;
    localStorage.setItem("readonlyUsers", JSON.stringify(updated));
    setUsers(updated);
    setEditingIndex(null);
  };

  const handleDeleteUser = (index) => {
    if (!window.confirm("❗ هل أنت متأكد من حذف هذا المستخدم؟")) return;
    const updated = users.filter((_, i) => i !== index);
    localStorage.setItem("readonlyUsers", JSON.stringify(updated));
    setUsers(updated);
  };

  const togglePassword = (i) => {
    const updated = [...showPasswords];
    updated[i] = !updated[i];
    setShowPasswords(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* ── إضافة مستخدم ── */}
      <div className="qms-card">
        <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", marginBottom: "var(--space-4)" }}>
          ➕ إضافة مستخدم جديد
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
          {[
            { placeholder: "اسم المستخدم",    key: "username",    type: "text" },
            { placeholder: "كلمة المرور",      key: "password",    type: "password" },
            { placeholder: "الصفة الوظيفية",   key: "jobTitle",    type: "text" },
            { placeholder: "الرقم الوظيفي",    key: "employeeId",  type: "text" },
          ].map(({ placeholder, key, type }) => (
            <input
              key={key}
              type={type}
              placeholder={placeholder}
              className="qms-input"
              value={newUser[key]}
              onChange={e => setNewUser({ ...newUser, [key]: e.target.value })}
            />
          ))}
        </div>
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="success" onClick={handleAddUser}>✅ إضافة المستخدم</Button>
        </div>
      </div>

      {/* ── قائمة المستخدمين ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <h4 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
            👥 المستخدمون
          </h4>
          <span className="qms-badge qms-badge-info">{users.length} مستخدم</span>
        </div>

        {users.length === 0 ? (
          <EmptyState icon="👤" message="لا يوجد مستخدمون" sub="أضف مستخدماً من النموذج أعلاه" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {users.map((u, i) => (
              <div key={i} className="qms-card qms-card-sm">
                {editingIndex === i ? (
                  /* وضع التعديل */
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                      {[
                        { placeholder: "اسم المستخدم",  key: "username",   type: "text" },
                        { placeholder: "كلمة المرور",    key: "password",   type: "password" },
                        { placeholder: "الصفة الوظيفية", key: "jobTitle",   type: "text" },
                        { placeholder: "الرقم الوظيفي",  key: "employeeId", type: "text" },
                      ].map(({ placeholder, key, type }) => (
                        <input
                          key={key}
                          type={type}
                          placeholder={placeholder}
                          className="qms-input"
                          value={editUser[key]}
                          onChange={e => setEditUser({ ...editUser, [key]: e.target.value })}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <Button variant="success" size="sm" onClick={handleSaveEdit}>💾 حفظ</Button>
                      <Button variant="ghost"   size="sm" onClick={() => setEditingIndex(null)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  /* وضع العرض */
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary), var(--color-purple))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
                        {u.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-base)", color: "var(--text-primary)" }}>
                          {u.username}
                        </div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                          {u.jobTitle} &nbsp;·&nbsp; #{u.employeeId}
                        </div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)", letterSpacing: 2 }}>
                          🔐 {showPasswords[i] ? u.password : "••••••••"}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <Button variant="ghost"   size="sm" onClick={() => togglePassword(i)}>👁️</Button>
                      <Button variant="primary" size="sm" onClick={() => { setEditingIndex(i); setEditUser(u); }}>✏️</Button>
                      <Button variant="danger"  size="sm" onClick={() => handleDeleteUser(i)}>🗑️</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
