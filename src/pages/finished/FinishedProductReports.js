import React, { useEffect, useState } from "react";

// اسم المفتاح الذي استخدمناه لحفظ التقارير (تم التصحيح هنا)
const STORAGE_KEY = "finished_products_reports";

function daysBetween(from, to) {
  // from, to: date strings "YYYY-MM-DD"
  if (!from || !to) return "";
  const a = new Date(from);
  const b = new Date(to);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

export default function FinishedProductReports() {
  const [allRows, setAllRows] = useState([]);
  const [search, setSearch] = useState("");

  // تحميل كل المنتجات من التخزين المحلي
  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Flatten all rows from all reports into one table
    const all = [];
    reports.forEach(report => {
      (report.products || []).forEach(product => {
        all.push({
          ...product,
          reportDate: report.reportDate, // استخدم reportDate وليس date
        });
      });
    });
    setAllRows(all);
  }, []);

  // حذف صف
  const handleDelete = idx => {
    if (!window.confirm("هل تريد حذف هذا الصف؟")) return;
    // حذف المنتج من التقارير الأصلية وحفظها من جديد
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    let found = false;
    for (const rep of reports) {
      const i = (rep.products || []).findIndex(p =>
        p.productName === allRows[idx].productName &&
        p.orderNo === allRows[idx].orderNo &&
        p.customer === allRows[idx].customer &&
        p.slaughterDate === allRows[idx].slaughterDate
      );
      if (i >= 0) {
        rep.products.splice(i, 1);
        found = true;
        break;
      }
    }
    if (found) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      setAllRows(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // بحث
  const filtered = allRows.filter(row =>
    Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      padding: "2.5rem 2% 4rem",
      fontFamily: "Cairo, sans-serif",
      minHeight: "100vh",
      background: "#f4f6fa"
    }}>
      <h2 style={{
        color: "#2980b9",
        fontWeight: "bold",
        marginBottom: "1.5rem",
        textAlign: "center",
        letterSpacing: "1px"
      }}>
        📦 تقارير المنتج النهائي (Finished Product Reports)
      </h2>
      <div style={{
        marginBottom: 18, display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap"
      }}>
        <input
          type="search"
          placeholder="🔍 بحث عن منتج أو عميل أو أمر..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 330, maxWidth: "99%",
            padding: "9px 17px",
            fontSize: "1.1em",
            borderRadius: 13,
            border: "1.7px solid #a4b0be",
            background: "#fff",
            boxShadow: "0 2px 6px #bfc9d933",
            marginBottom: 14,
          }}
        />
        <span style={{ color: "#bbb", fontSize: 17 }}>
          عدد المنتجات: <b style={{ color: "#2980b9" }}>{filtered.length}</b>
        </span>
      </div>
      <div style={{
        overflowX: "auto",
        background: "#fff",
        borderRadius: 17,
        boxShadow: "0 4px 18px #bfc9d944",
        padding: "0.7rem 1.3rem",
      }}>
        <table style={{
          width: "100%",
          minWidth: 1100,
          borderCollapse: "collapse",
          fontSize: "1.03em"
        }}>
          <thead>
            <tr style={{
              background: "#f4f9ff",
              color: "#2980b9"
            }}>
              <th style={th}>Product</th>
              <th style={th}>Customer</th>
              <th style={th}>Order No</th>
              <th style={th}>TIME</th>
              <th style={th}>Slaughter Date</th>
              <th style={th}>Expiry Date</th>
              <th style={th}>TEMP</th>
              <th style={th}>Quantity</th>
              <th style={th}>Unit</th>
              <th style={th}>Condition</th>
              <th style={th}>Remarks</th>
              <th style={th}>Report Date</th>
              <th style={th}>Days Left</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const days = daysBetween(row.reportDate, row.expiryDate);
              let expStatus = "";
              if (days <= 0) expStatus = "EXP";
              else if (days <= 6) expStatus = "NEAR EXPIRED";
              return (
                <tr key={i} style={{ background: i % 2 ? "#f7fafd" : "#fff" }}>
                  <td style={td}>{row.productName || row.product}</td>
                  <td style={td}>{row.customer}</td>
                  <td style={td}>{row.orderNo}</td>
                  <td style={td}>{row.time}</td>
                  <td style={td}>{row.slaughterDate}</td>
                  <td style={td}>{row.expiryDate}</td>
                  <td style={td}>{row.temp}</td>
                  <td style={td}>{row.quantity}</td>
                  <td style={td}>{row.unit || "KG"}</td>
                  <td style={td}>{row.condition}</td>
                  <td style={td}>{row.remarks}</td>
                  <td style={td}>{row.reportDate}</td>
                  <td style={{ ...td, fontWeight: "bold", color: days <= 0 ? "#c0392b" : "#f39c12" }}>
                    {days}
                    <span style={{ fontSize: "0.85em", marginRight: 5 }}>
                      {expStatus && <>| <b>{expStatus}</b></>}
                    </span>
                  </td>
                  <td style={td}>
                    <button onClick={() => handleDelete(i)}
                      style={{
                        background: "#c0392b",
                        color: "#fff",
                        border: "none",
                        borderRadius: 7,
                        fontSize: 16,
                        padding: "2px 10px",
                        cursor: "pointer"
                      }}
                      title="حذف المنتج"
                    >🗑️</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={14} style={{
                  textAlign: "center", color: "#aaa", padding: 50,
                  fontSize: "1.2em"
                }}>
                  لا يوجد تقارير مسجلة بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  padding: "10px 7px",
  borderBottom: "2px solid #bfc9d9",
  fontWeight: "bold",
  textAlign: "center",
  fontSize: "1.01em"
};
const td = {
  padding: "8px 7px",
  textAlign: "center",
  borderBottom: "1px solid #eef2f7"
};
