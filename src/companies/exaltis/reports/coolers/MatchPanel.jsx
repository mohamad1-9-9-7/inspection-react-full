// src/companies/exaltis/reports/coolers/MatchPanel.jsx
// Cooler temperatures — product/room temperature matches of one storage unit.
// (Extracted from CoolersTab.js — the code is unchanged.)
import { Bi } from "../bilingual";
import { addMatchBtn, mField, mLabel, mInput, mReadOnly, statusChip, delBtn } from "./coolersStyles";
import { TIMES, SWEETS_PRODUCTS } from "./coolersModel";

export function MatchPanel({ accent, list, addProductVerificationFor, storageKey, getProductVerificationStatus, getRoomTempForVerification, updateProductVerification, removeProductVerification }) {
  return (
    <div style={{ marginTop: 14, borderTop: `1px dashed ${accent}66`, paddingTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: list.length ? 10 : 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1rem" }}>🔗</span>
          <strong style={{ color: "#0f172a" }}><Bi en="Product Match" ar="مطابقة المنتج" /></strong>
          <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: ".82rem" }}>
            {list.length ? `${list.length} check${list.length === 1 ? "" : "s"} · فحص` : "optional · اختياري"}
          </span>
        </div>
        <button type="button" onClick={() => addProductVerificationFor(storageKey)} style={addMatchBtn(accent)}>
          <Bi en="+ Add product" ar="+ إضافة منتج" />
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: ".86rem", paddingBottom: 4 }}>
          <Bi en="No product matched yet — add a check to compare a product against the recorded temperature." ar="لا توجد مطابقة بعد — أضف فحصاً لمقارنة منتج بالحرارة المسجلة." />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map(({ row, idx }, pos) => {
            const status = getProductVerificationStatus(row);
            const roomTemp = getRoomTempForVerification(row);
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: 10,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 12px",
                  boxShadow: "0 1px 4px rgba(15,23,42,.05)",
                }}
              >
                <span
                  style={{
                    alignSelf: "center",
                    minWidth: 24,
                    height: 24,
                    borderRadius: 999,
                    background: `${accent}1a`,
                    color: accent,
                    fontWeight: 900,
                    fontSize: ".8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {pos + 1}
                </span>

                <label style={{ ...mField, width: 100 }}>
                  <span style={mLabel}><Bi en="Time" /></span>
                  <select value={row.time} onChange={(e) => updateProductVerification(idx, "time", e.target.value)} style={mInput}>
                    {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
                  </select>
                </label>

                <label style={{ ...mField, flex: "1 1 220px", minWidth: 200 }}>
                  <span style={mLabel}><Bi en="Product" /></span>
                  <>
                    <input
                      list="sweets-cooler-products"
                      value={row.productName || ""}
                      placeholder="Product name… · اسم المنتج…"
                      style={mInput}
                      onChange={(e) => updateProductVerification(idx, "productName", e.target.value)}
                    />
                    <datalist id="sweets-cooler-products">
                      {SWEETS_PRODUCTS.map((p) => <option key={p} value={p} />)}
                    </datalist>
                  </>
                </label>

                <label style={{ ...mField, width: 130 }}>
                  <span style={mLabel}><Bi en="Country" ar="البلد" /></span>
                  <input
                    value={row.country || row.batchNo || ""}
                    onChange={(e) => updateProductVerification(idx, "country", e.target.value)}
                    placeholder="Origin · المنشأ"
                    style={mInput}
                  />
                </label>

                <label style={{ ...mField, width: 92 }}>
                  <span style={mLabel}><Bi en="Product °C" ar="المنتج °م" /></span>
                  <input
                    type="number"
                    step="0.1"
                    value={row.productTemp}
                    onChange={(e) => updateProductVerification(idx, "productTemp", e.target.value)}
                    placeholder="°C"
                    style={{ ...mInput, textAlign: "center", fontWeight: 900 }}
                  />
                </label>

                <div style={{ ...mField, width: 92 }}>
                  <span style={mLabel}><Bi en="Room °C" ar="الغرفة °م" /></span>
                  <div style={{ ...mReadOnly, color: roomTemp === "" ? "#94a3b8" : "#0f172a" }}>
                    {roomTemp === "" ? "—" : `${roomTemp}°C`}
                  </div>
                </div>

                <div style={{ ...mField, width: 92 }}>
                  <span style={mLabel}><Bi en="Limit" ar="الحد" /></span>
                  <div style={{ ...mReadOnly, color: "#475569", fontSize: ".82rem" }}>{status.limit || "—"}</div>
                </div>

                <div style={{ ...mField }}>
                  <span style={mLabel}><Bi en="Status" /></span>
                  <span style={statusChip(status)}>{status.text}</span>
                </div>

                <label style={{ ...mField, flex: "1 1 200px", minWidth: 180 }}>
                  <span style={mLabel}><Bi en="Remarks / Corrective" ar="ملاحظات / إجراء تصحيحي" /></span>
                  <input
                    value={row.remarks}
                    onChange={(e) => updateProductVerification(idx, "remarks", e.target.value)}
                    placeholder={status.text === "FAIL" ? "Corrective action required · مطلوب إجراء تصحيحي" : "Remarks · ملاحظات"}
                    style={mInput}
                  />
                </label>

                <button type="button" onClick={() => removeProductVerification(idx)} style={delBtn} title="Remove product check · حذف الفحص">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
