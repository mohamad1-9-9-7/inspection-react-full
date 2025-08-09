import React from "react";

const options = ["C", "NC"];

export default function PersonalHygieneTab({ personalHygiene, setPersonalHygiene }) {
  const handleChange = (index, field, value) => {
    const updated = [...personalHygiene];
    updated[index][field] = value;
    setPersonalHygiene(updated);
  };

  const addEmployee = () => {
    setPersonalHygiene([...personalHygiene, {
      employName: "",
      nails: "",
      hair: "",
      notWearingJewelries: "",
      wearingCleanCloth: "",
      communicableDisease: "",
      openWounds: "",
      remarks: "",
    }]);
  };

  const removeEmployee = (index) => {
    const updated = [...personalHygiene];
    updated.splice(index, 1);
    setPersonalHygiene(updated);
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <h3>🧼 قائمة النظافة الشخصية للموظفين</h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 900,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>S. No</th>
            <th style={thStyle}>Employ Name</th>
            <th style={thStyle}>Nails</th>
            <th style={thStyle}>Hair</th>
            <th style={thStyle}>Not wearing Jewelries</th>
            <th style={thStyle}>Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/ Shoe</th>
            <th style={thStyle}>Communicable disease</th>
            <th style={thStyle}>Open wounds/ sores & cut</th>
            <th style={thStyle}>Remarks and Corrective Actions</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {personalHygiene.map((emp, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={emp.employName}
                  onChange={(e) => handleChange(i, "employName", e.target.value)}
                  style={inputStyle}
                  placeholder="اسم الموظف"
                />
              </td>

              {["nails", "hair", "notWearingJewelries", "wearingCleanCloth", "communicableDisease", "openWounds"].map(
                (field) => (
                  <td key={field} style={tdStyle}>
                    <select
                      value={emp[field]}
                      onChange={(e) => handleChange(i, field, e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">--</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                )
              )}

              <td style={tdStyle}>
                <input
                  type="text"
                  value={emp.remarks}
                  onChange={(e) => handleChange(i, "remarks", e.target.value)}
                  style={inputStyle}
                  placeholder="ملاحظات"
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <button
                  onClick={() => removeEmployee(i)}
                  style={removeBtnStyle}
                  title="حذف الموظف"
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={addEmployee}
        style={{
          marginTop: 10,
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          backgroundColor: "#2980b9",
          color: "white",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ➕ إضافة موظف
      </button>
    </div>
  );
}

const thStyle = {
  borderBottom: "2px solid #2980b9",
  padding: "10px 8px",
  textAlign: "center",
  backgroundColor: "#d6eaf8",
};

const tdStyle = {
  padding: "8px 6px",
  textAlign: "center",
  borderRight: "1px solid #ddd",
};

const inputStyle = {
  width: "100%",
  padding: "6px 8px",
  boxSizing: "border-box",
  borderRadius: 4,
  border: "1px solid #ccc",
  textAlign: "center",
};

const selectStyle = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 4,
  border: "1px solid #ccc",
  textAlign: "center",
  cursor: "pointer",
};

const removeBtnStyle = {
  backgroundColor: "#e74c3c",
  border: "none",
  color: "white",
  padding: "4px 8px",
  borderRadius: 6,
  cursor: "pointer",
};

