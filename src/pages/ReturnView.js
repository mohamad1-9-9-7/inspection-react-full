// src/pages/ReturnView.js

import React, { useState, useEffect } from "react";

// قائمة الأفرع (لتحليل إضافي)
const BRANCHES = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
  "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
  "POS 42", "POS 44", "POS 45", "فرع آخر..."
];
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Use in kitchen",
  "Send to market",
  "إجراء آخر..."
];

export default function ReturnView() {
  const [reports, setReports] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [editActionIdx, setEditActionIdx] = useState(null);
  const [editActionVal, setEditActionVal] = useState("");
  const [editCustomActionVal, setEditCustomActionVal] = useState("");

  // تحميل التقارير أول مرة
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("returns_reports") || "[]");
    // ترتيب تنازلي حسب التاريخ
    data.sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
    setReports(data);
  }, []);

  // الفلترة حسب التاريخ
  const filteredReports = reports.filter((r) => {
    if (!filterFrom && !filterTo) return true;
    const d = r.reportDate || "";
    if (filterFrom && d < filterFrom) return false;
    if (filterTo && d > filterTo) return false;
    return true;
  });

  // حساب التحليلات لكل الفلاتر المختارة
  let total = 0, totalQty = 0, byBranch = {}, byAction = {};
  filteredReports.forEach(rep => {
    total += rep.items.length;
    rep.items.forEach(r => {
      totalQty += Number(r.quantity || 0);
      // تجميع حسب الفرع
      const b = r.butchery === "فرع آخر..." ? r.customButchery : r.butchery;
      if (b) byBranch[b] = (byBranch[b] || 0) + 1;
      // تجميع حسب الإجراء
      const a = r.action === "إجراء آخر..." ? r.customAction : r.action;
      if (a) byAction[a] = (byAction[a] || 0) + 1;
    });
  });

  // ==== Badges جديدة ====
  const today = new Date().toISOString().slice(0, 10);
  const newReportsCount = filteredReports.filter(r => r.reportDate === today).length;

  // ==== تنبيه تجاوز الكميات ====
  let showAlert = false;
  let alertMsg = "";
  if (totalQty > 50) {
    showAlert = true;
    alertMsg = "⚠️ الكمية الكلية للمرتجعات مرتفعة جداً!";
  } else if (filteredReports.length > 50) {
    showAlert = true;
    alertMsg = "⚠️ عدد تقارير المرتجعات كبير في هذه الفترة!";
  }

  // حذف تقرير بالكامل
  const handleDelete = idx => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التقرير؟")) return;
    const list = [...reports];
    const realIdx = reports.findIndex((r, i) => filteredReports[idx] === r);
    list.splice(realIdx, 1);
    setReports(list);
    localStorage.setItem("returns_reports", JSON.stringify(list));
    setSelectedIdx(selectedIdx > 0 ? selectedIdx - 1 : 0);
  };

  // تحديث الإجراء
  const handleActionEdit = (itemIdx) => {
    const rep = filteredReports[selectedIdx];
    const item = rep.items[itemIdx];
    setEditActionIdx(itemIdx);
    setEditActionVal(item.action || "");
    setEditCustomActionVal(item.customAction || "");
  };
  const handleActionSave = (itemIdx) => {
    const repIdx = reports.findIndex(r => r === filteredReports[selectedIdx]);
    if (repIdx < 0) return;
    let updatedReports = [...reports];
    let updatedItems = [...updatedReports[repIdx].items];
    updatedItems[itemIdx] = {
      ...updatedItems[itemIdx],
      action: editActionVal,
      customAction: editActionVal === "إجراء آخر..." ? editCustomActionVal : "",
    };
    updatedReports[repIdx].items = updatedItems;
    setReports(updatedReports);
    localStorage.setItem("returns_reports", JSON.stringify(updatedReports));
    setEditActionIdx(null);
  };

  // ============ العرض ===============
  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "#f4f6fa",
        minHeight: "100vh",
        direction: "rtl"
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#512e5f",
          fontWeight: "bold",
          marginBottom: "1.5rem"
        }}
      >
        📋 جميع تقارير المرتجعات المحفوظة
        {newReportsCount > 0 && (
          <span style={{
            marginRight: 16,
            fontSize: "0.75em",
            color: "#c0392b",
            background: "#fadbd8",
            borderRadius: "50%",
            padding: "4px 12px",
            fontWeight: "bold",
            verticalAlign: "top"
          }}>
            🔴{newReportsCount}
          </span>
        )}
      </h2>

      {/* ====== كروت KPI أعلى الصفحة دائماً ====== */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "2.2rem",
        marginBottom: 30,
        marginTop: 10
      }}>
        <div style={cardBox}>
          <div style={{ fontSize: 28, marginBottom: 7 }}>📦</div>
          <div style={{ fontWeight: "bold", fontSize: "1.15em" }}>إجمالي التقارير</div>
          <div style={{ fontSize: "1.9em", color: "#229954" }}>{filteredReports.length}</div>
          {newReportsCount > 0 &&
            <span style={{
              display: "inline-block",
              background: "#c0392b",
              color: "#fff",
              borderRadius: 50,
              fontSize: "0.78em",
              padding: "1px 9px",
              marginTop: 5
            }}>جديد {newReportsCount}</span>
          }
        </div>
        <div style={cardBox}>
          <div style={{ fontSize: 28, marginBottom: 7 }}>🔢</div>
          <div style={{ fontWeight: "bold", fontSize: "1.15em" }}>إجمالي العناصر</div>
          <div style={{ fontSize: "1.65em", color: "#512e5f" }}>{total}</div>
        </div>
        <div style={cardBox}>
          <div style={{ fontWeight: "bold" }}>إجمالي الكميات:</div>
          <div style={{ color: "#884ea0", fontWeight: 700 }}>{totalQty}</div>
        </div>
        <div style={cardBox}>
          <div style={{ fontWeight: "bold" }}>أكثر الفروع مرتجعات:</div>
          {Object.entries(byBranch)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([b, c]) => (
              <div key={b}>{b}: <b style={{ color: "#884ea0" }}>{c}</b></div>
            ))}
        </div>
        <div style={cardBox}>
          <div style={{ fontWeight: "bold" }}>أكثر الإجراءات:</div>
          {Object.entries(byAction)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([a, c]) => (
              <div key={a}>{a}: <b style={{ color: "#c0392b" }}>{c}</b></div>
            ))}
        </div>
      </div>

      {/* إشعار تنبيه */}
      {showAlert && (
        <div style={{
          background: "#fdecea",
          color: "#c0392b",
          border: "1.5px solid #e74c3c",
          fontWeight: "bold",
          borderRadius: 11,
          textAlign: "center",
          fontSize: "1.13em",
          marginBottom: 23,
          padding: "14px 0",
          boxShadow: "0 2px 12px #f9ebea"
        }}>
          {alertMsg}
        </div>
      )}

      {/* فلاتر التاريخ */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1.2rem",
        marginBottom: 20
      }}>
        <span style={{ fontWeight: 600, fontSize: "1.1em" }}>فلترة حسب تاريخ التقرير:</span>
        <label>
          من:{" "}
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            style={dateInputStyle}
          />
        </label>
        <label>
          إلى:{" "}
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            style={dateInputStyle}
          />
        </label>
        {(filterFrom || filterTo) && (
          <button
            onClick={() => {
              setFilterFrom("");
              setFilterTo("");
            }}
            style={{
              background: "#e67e22",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "7px 18px",
              fontWeight: "bold",
              fontSize: "1em",
              marginRight: 7,
              cursor: "pointer"
            }}
          >
            🧹 مسح التصفية
          </button>
        )}
      </div>

      {/* --- تصميم قسمين: عناوين التقارير يسار & تفاصيل يمين --- */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        minHeight: 400
      }}>
        {/* ==== يسار: قائمة عناوين التقارير ==== */}
        <div style={{
          minWidth: 240,
          background: "#f9ebff",
          borderRadius: 12,
          marginLeft: 28,
          boxShadow: "0 1px 6px #e8daef44",
          padding: "12px 0"
        }}>
          {filteredReports.length === 0 && (
            <div style={{
              textAlign: "center", padding: 60, color: "#b2babb",
              fontSize: "1.13em"
            }}>
              لا يوجد تقارير مرتجعات محفوظة للفترة المختارة.
            </div>
          )}
          {filteredReports.map((rep, idx) => (
            <div
              key={rep.reportDate + idx}
              onClick={() => setSelectedIdx(idx)}
              style={{
                background: idx === selectedIdx ? "#884ea030" : "#f9ebff",
                color: idx === selectedIdx ? "#512e5f" : "#626262",
                padding: "12px 18px",
                borderRight: idx === selectedIdx ? "5px solid #884ea0" : "none",
                borderBottom: "1px solid #e8daef",
                fontWeight: idx === selectedIdx ? "bold" : "normal",
                cursor: "pointer",
                fontSize: "1.12em"
              }}
            >
              📅 {rep.reportDate}
              <span style={{ fontSize: "0.87em", color: "#8e44ad", marginRight: 6 }}>
                ({rep.items.length} عنصر)
              </span>
              <button
                title="حذف التقرير"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete(idx);
                }}
                style={{
                  background: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  marginRight: 9,
                  padding: "2px 10px",
                  cursor: "pointer"
                }}
              >🗑️</button>
            </div>
          ))}
        </div>

        {/* ==== يمين: تفاصيل التقرير ==== */}
        <div style={{
          flex: 1,
          background: "#fff",
          borderRadius: 15,
          boxShadow: "0 1px 12px #e8daef44",
          minHeight: 320,
          padding: "25px 28px",
          marginRight: 0
        }}>
          {filteredReports[selectedIdx] ? (
            <div>
              <div style={{
                fontWeight: "bold",
                color: "#512e5f",
                fontSize: "1.23em",
                marginBottom: 8
              }}>
                تفاصيل تقرير المرتجعات ({filteredReports[selectedIdx].reportDate})
              </div>
              <table style={{
                width: "100%",
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 12px #e8daef44",
                borderCollapse: "collapse",
                marginTop: 6,
                minWidth: 800
              }}>
                <thead>
                  <tr style={{ background: "#f9ebff", color: "#512e5f" }}>
                    <th style={th}>SL.NO</th>
                    <th style={th}>PRODUCT NAME</th>
                    <th style={th}>ORIGIN</th>
                    <th style={th}>BUTCHERY</th>
                    <th style={th}>QUANTITY</th>
                    <th style={th}>QTY TYPE</th>
                    <th style={th}>EXPIRY DATE</th>
                    <th style={th}>REMARKS</th>
                    <th style={th}>ACTION</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports[selectedIdx].items.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 ? "#fcf3ff" : "#fff" }}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{row.productName}</td>
                      <td style={td}>{row.origin}</td>
                      <td style={td}>
                        {row.butchery === "فرع آخر..." ? row.customButchery : row.butchery}
                      </td>
                      <td style={td}>{row.quantity}</td>
                      <td style={td}>{row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}</td>
                      <td style={td}>{row.expiry}</td>
                      <td style={td}>{row.remarks}</td>
                      <td style={td}>
                        {editActionIdx === i ? (
                          <div>
                            <select
                              value={editActionVal}
                              onChange={e => setEditActionVal(e.target.value)}
                              style={{
                                padding: "4px 6px",
                                borderRadius: 7,
                                fontSize: "1em",
                                marginBottom: 4
                              }}
                            >
                              {ACTIONS.map(act =>
                                <option value={act} key={act}>{act}</option>
                              )}
                            </select>
                            {editActionVal === "إجراء آخر..." && (
                              <input
                                value={editCustomActionVal}
                                onChange={e => setEditCustomActionVal(e.target.value)}
                                placeholder="حدد الإجراء..."
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 7,
                                  fontSize: "1em",
                                  marginBottom: 2,
                                  marginTop: 2
                                }}
                              />
                            )}
                            <button onClick={() => handleActionSave(i)}
                              style={{
                                marginRight: 5,
                                background: "#229954",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "2px 9px",
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                            >حفظ</button>
                            <button onClick={() => setEditActionIdx(null)}
                              style={{
                                background: "#bbb",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "2px 8px",
                                marginRight: 4,
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                            >إلغاء</button>
                          </div>
                        ) : (
                          row.action === "إجراء آخر..." ?
                            row.customAction :
                            row.action
                        )}
                      </td>
                      <td style={td}>
                        {editActionIdx !== i && (
                          <button
                            onClick={() => handleActionEdit(i)}
                            style={{
                              background: "#884ea0",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 15,
                              padding: "2px 8px",
                              cursor: "pointer"
                            }}
                          >✏️</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              textAlign: "center",
              color: "#b2babb",
              padding: 80,
              fontSize: "1.1em"
            }}>
              اختر تقريراً من القائمة لعرض تفاصيله.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== أنماط الكروت والجداول ==========
const cardBox = {
  background: "#fff",
  borderRadius: 16,
  padding: "1.1rem 2rem",
  minWidth: 180,
  minHeight: 70,
  textAlign: "center",
  boxShadow: "0 2px 12px #e8daef66",
  fontSize: "1.02em"
};
const th = {
  padding: "12px 7px",
  textAlign: "center",
  fontSize: "1.07em",
  fontWeight: "bold",
  borderBottom: "2px solid #c7a8dc"
};
const td = {
  padding: "8px 6px",
  textAlign: "center",
  minWidth: 90
};
const dateInputStyle = {
  borderRadius: 10,
  border: "2px solid #884ea0",
  background: "#fcf3ff",
  padding: "7px 13px",
  fontSize: "1em",
  minWidth: 105
};
