// src/companies/exaltis/ohc/view/OhcTableRow.jsx
// OHC view — one employee row (status, dates, actions).
// (Extracted from OHCView.jsx — the code is unchanged.)
import { toIsoYMD } from "./ohcViewModel";

export function OhcTableRow({ i, rowBg, showLeftBar, leftBarColor, r, st, resultBadgeStyle, openImage, handleDelete, toggleOutsideDubai, toggleLeftCompany, startEdit }) {
  return (
    <tr
      key={i}
      style={{
        textAlign: "center",
        background: rowBg,
        borderLeft: showLeftBar
          ? `4px solid ${leftBarColor}`
          : "4px solid transparent",
      }}
    >
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
        }}
      >
        {i + 1}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {r.appNo || "—"}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        {r.name}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        {r.nationality}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        {r.job}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            color:
              st.key === "expired" ||
              st.key === "expiring_soon"
                ? "#b91c1c"
                : "#111827",
            fontWeight:
              st.key === "expired" ||
              st.key === "expiring_soon"
                ? 700
                : 500,
          }}
        >
          {toIsoYMD(r.expiryDate) || "—"}
        </span>
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 60,
            padding: "2px 8px",
            borderRadius: 999,
            borderWidth: 1,
            borderStyle: "solid",
            fontSize: 11,
            fontWeight: 700,
            ...resultBadgeStyle,
          }}
        >
          {r.result || "—"}
        </span>
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
        }}
      >
        {st.days === null ? (
          <span style={{ color: "#9ca3af" }}>—</span>
        ) : st.days < 0 ? (
          <span
            style={{
              fontWeight: 700,
              color: "#b91c1c",
            }}
            title={`Expired ${Math.abs(
              st.days
            )} day(s) ago`}
          >
            -{Math.abs(st.days)}
          </span>
        ) : (
          <span
            style={{
              fontWeight: 700,
              color:
                st.key === "expiring_soon"
                  ? "#c2410c"
                  : st.key === "expiring"
                  ? "#a16207"
                  : "#15803d",
            }}
            title={`${st.days} day(s) remaining`}
          >
            {st.days}
          </span>
        )}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            color: "#fff",
            background: st.bg,
            letterSpacing: 0.3,
            whiteSpace: "nowrap",
          }}
        >
          {st.label}
        </span>
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "center",
          }}
        >
          <span>{r.branch || "-"}</span>
          {r.outsideDubai && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#fff",
                background:
                  "linear-gradient(135deg,#0ea5e9,#0369a1)",
                padding: "1px 6px",
                borderRadius: 999,
                letterSpacing: 0.3,
                whiteSpace: "nowrap",
              }}
            >
              📍 OUTSIDE DUBAI
            </span>
          )}
          {r.leftCompany && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#fff",
                background:
                  "linear-gradient(135deg,#dc2626,#7c2d12)",
                padding: "1px 6px",
                borderRadius: 999,
                letterSpacing: 0.3,
                whiteSpace: "nowrap",
              }}
            >
              🚪 LEFT COMPANY
            </span>
          )}
        </div>
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        {r.image ? (
          <img
            src={r.image}
            alt="certificate"
            onClick={() => openImage(r)}
            title="Click to view"
            style={{
              height: 48,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              boxShadow:
                "0 6px 16px rgba(15,23,42,0.35)",
            }}
          />
        ) : (
          "—"
        )}
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
        }}
      >
        <button
          onClick={() => handleDelete(i)}
          style={{
            padding: "6px 12px",
            background:
              "linear-gradient(135deg,#ef4444,#b91c1c)",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
          }}
         data-delete-action="true">
          Delete
        </button>
      </td>
      <td
        style={{
          padding: 8,
          borderTop: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
        <button
          onClick={() => toggleOutsideDubai(i)}
          title={
            r.outsideDubai
              ? "Move back to Dubai"
              : "Mark as Outside Dubai (hide from main view)"
          }
          style={{
            padding: "6px 10px",
            background: r.outsideDubai
              ? "linear-gradient(135deg,#10b981,#047857)"
              : "linear-gradient(135deg,#0ea5e9,#0369a1)",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {r.outsideDubai ? "🏙️ To Dubai" : "📍 Outside"}
        </button>
        <button
          onClick={() => toggleLeftCompany(i)}
          title={
            r.leftCompany
              ? "Restore as active employee"
              : "Mark as Left Company (hide from main view)"
          }
          style={{
            padding: "6px 10px",
            background: r.leftCompany
              ? "linear-gradient(135deg,#10b981,#047857)"
              : "linear-gradient(135deg,#dc2626,#7c2d12)",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {r.leftCompany ? "↩ Restore" : "🚪 Left"}
        </button>
        <button
          onClick={() => startEdit(i)}
          style={{
            padding: "6px 12px",
            background:
              "linear-gradient(135deg,#2563eb,#1d4ed8)",
            color: "#fff",
            border: 0,
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          Edit
        </button>
        </div>
      </td>
    </tr>
  );
}
