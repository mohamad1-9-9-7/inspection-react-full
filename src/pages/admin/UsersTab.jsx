import React, { useState, useEffect } from "react";

export default function UsersTab({ users = [], setUsers = () => {} }) {
  const [newUser, setNewUser] = useState({ username: "", password: "", jobTitle: "", employeeId: "" });
  const [showPasswords, setShowPasswords] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editUser, setEditUser] = useState({ username: "", password: "", jobTitle: "", employeeId: "" });

  // تحديث عند تغيّر عدد المستخدمين
  useEffect(() => {
    setShowPasswords(Array(users.length).fill(false));
  }, [users]);

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password || !newUser.jobTitle || !newUser.employeeId) {
      alert("⚠️ الرجاء إدخال جميع الحقول.");
      return;
    }
    const exists = users.some((u) => u.username === newUser.username);
    if (exists) {
      alert("⚠️ هذا المستخدم موجود مسبقًا.");
      return;
    }
    const updated = [...users, newUser];
    localStorage.setItem("readonlyUsers", JSON.stringify(updated));
    setUsers(updated);
    setNewUser({ username: "", password: "", jobTitle: "", employeeId: "" });
    alert("✅ تم إضافة المستخدم بنجاح");
  };

  const handleTogglePassword = (index) => {
    const updated = [...showPasswords];
    updated[index] = !updated[index];
    setShowPasswords(updated);
  };

  const handleEditUser = (index) => {
    setEditingIndex(index);
    setEditUser(users[index]);
  };

  const handleSaveEdit = () => {
    const updated = [...users];
    updated[editingIndex] = editUser;
    localStorage.setItem("readonlyUsers", JSON.stringify(updated));
    setUsers(updated);
    setEditingIndex(null);
  };

  const handleDeleteUser = (index) => {
    if (window.confirm("❗ هل أنت متأكد من حذف هذا المستخدم؟")) {
      const updated = users.filter((_, i) => i !== index);
      localStorage.setItem("readonlyUsers", JSON.stringify(updated));
      setUsers(updated);
    }
  };

  return (
    <div style={cardStyle}>
      <h3>➕ إضافة مستخدم جديد</h3>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "300px" }}>
        <input
          placeholder="اسم المستخدم"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="الصفة الوظيفية"
          value={newUser.jobTitle}
          onChange={(e) => setNewUser({ ...newUser, jobTitle: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="الرقم الوظيفي"
          value={newUser.employeeId}
          onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
          style={inputStyle}
        />
        <button onClick={handleAddUser} style={addButtonStyle}>✅ إضافة</button>
      </div>

      <hr style={{ margin: "2rem 0" }} />

      <h4>👥 المستخدمون المضافون ({users.length})</h4>
      {users.map((u, i) => (
        <div key={i} style={userBoxStyle}>
          {editingIndex === i ? (
            <>
              <input value={editUser.username} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} style={inputStyle} />
              <input value={editUser.password} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} style={inputStyle} />
              <input value={editUser.jobTitle} onChange={(e) => setEditUser({ ...editUser, jobTitle: e.target.value })} style={inputStyle} />
              <input value={editUser.employeeId} onChange={(e) => setEditUser({ ...editUser, employeeId: e.target.value })} style={inputStyle} />
              <button onClick={handleSaveEdit} style={addButtonStyle}>💾 حفظ</button>
            </>
          ) : (
            <>
              <p>👤 <strong>{u.username}</strong></p>
              <p>📌 الصفة الوظيفية: {u.jobTitle}</p>
              <p>🆔 الرقم الوظيفي: {u.employeeId}</p>
              <p>🔐 كلمة المرور: {showPasswords[i] ? u.password : "••••••"}</p>
              <button onClick={() => handleTogglePassword(i)} style={smallButtonStyle}>👁️ عرض/إخفاء</button>
              <button onClick={() => handleEditUser(i)} style={smallButtonStyle}>✏️ تعديل</button>
              <button onClick={() => handleDeleteUser(i)} style={deleteButtonStyle}>🗑️ حذف</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ✅ نفس التنسيقات

const cardStyle = {
  backgroundColor: "white",
  padding: "2rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const inputStyle = {
  marginBottom: "1rem",
  padding: "0.5rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const addButtonStyle = {
  backgroundColor: "#2ecc71",
  color: "white",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const smallButtonStyle = {
  marginTop: "0.5rem",
  marginRight: "0.5rem",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  backgroundColor: "#3498db",
  color: "white",
};

const deleteButtonStyle = {
  marginTop: "0.5rem",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  backgroundColor: "#e74c3c",
  color: "white",
};

const userBoxStyle = {
  backgroundColor: "#f9f9f9",
  padding: "1rem",
  borderRadius: "8px",
  marginBottom: "1rem",
  border: "1px solid #ddd",
};
