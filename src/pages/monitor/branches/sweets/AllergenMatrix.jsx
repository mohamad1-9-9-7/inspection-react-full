// src/pages/monitor/branches/sweets/AllergenMatrix.jsx
// HACCP → Allergen Matrix for the confectionery factory. Products × allergens
// with C / M / – cells, the label line each product must carry, a suggested
// production run order (allergen-free first, nuts last) and a review date.
// Opens in view mode; Edit turns cells into click-to-cycle toggles. Data and
// label logic live in allergenMatrixData.js (shared with the production log).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { canEdit } from "../../../../utils/perms";
import { SweetsReportActions, excelFromNode, pdfFromNode, printNode } from "./_sweetsReportKit";
import {
  ALLERGEN_COLS, NUT_TYPES, blankProduct, containsOf, hasNuts, labelStatement,
  loadAllergenMatrix, mayContainOf, runOrder, saveAllergenMatrix,
} from "./allergenMatrixData";

const NEXT = { "": "C", C: "M", M: "" };
const CELL = {
  C: { bg: "#fee2e2", fg: "#b91c1c", bd: "#fca5a5", txt: "C" },
  M: { bg: "#fef3c7", fg: "#b45309", bd: "#fcd34d", txt: "M" },
  "": { bg: "#f0fdf4", fg: "#94a3b8", bd: "#dcfce7", txt: "–" },
};
const REVIEW_DAYS = 365;
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");

export default function AllergenMatrix() {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ reviewedBy: "", reviewDate: "" });
  const [savedAt, setSavedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(""); // "" | allergen key | "nutfree"
  const snapshot = useRef(null);
  const sheetRef = useRef(null);
  const mayEdit = canEdit("daily");

  useEffect(() => {
    const ctl = new AbortController();
    (async () => {
      try {
        const p = await loadAllergenMatrix(ctl.signal);
        if (ctl.signal.aborted) return;
        setProducts(Array.isArray(p?.products) ? p.products : []);
        setMeta({ reviewedBy: p?.reviewedBy || "", reviewDate: p?.reviewDate || "" });
        setSavedAt(p?.savedAt || "");
        if (!p) setMsg({ tone: "warn", text: "No matrix yet — press Edit and add your products." });
      } catch {
        if (!ctl.signal.aborted) setMsg({ tone: "fail", text: "Could not load the allergen matrix." });
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctl.abort();
  }, []);

  const setProd = (id, patch) => setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const cycle = (p, key) => setProd(p.id, { cells: { ...p.cells, [key]: NEXT[p.cells?.[key] || ""] } });

  const startEdit = () => {
    snapshot.current = { products, meta };
    if (!products.length) setProducts([blankProduct(), blankProduct(), blankProduct()]);
    setEditing(true);
    setMsg(null);
  };
  const cancelEdit = () => {
    if (snapshot.current) { setProducts(snapshot.current.products); setMeta(snapshot.current.meta); }
    setEditing(false);
    setMsg(null);
  };
  const save = async () => {
    const clean = products.filter((p) => p.name.trim());
    const names = clean.map((p) => p.name.trim().toLowerCase());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return setMsg({ tone: "fail", text: `Product "${dup}" is listed twice.` });
    const nutsNoType = clean.find((p) => p.cells?.treeNuts === "C" && !String(p.nutTypes || "").trim());
    if (nutsNoType) return setMsg({ tone: "fail", text: `"${nutsNoType.name}" contains tree nuts — name the nut type(s) for the label.` });
    setSaving(true);
    try {
      const at = new Date().toISOString();
      await saveAllergenMatrix({ products: clean, ...meta, reviewDate: meta.reviewDate || todayISO(), savedAt: at });
      setProducts(clean);
      setMeta((m) => ({ ...m, reviewDate: m.reviewDate || todayISO() }));
      setSavedAt(at);
      setEditing(false);
      setMsg({ tone: "ok", text: `Saved — ${clean.length} product(s).` });
    } catch (e) {
      setMsg({ tone: "fail", text: `Failed to save: ${e.message || e}` });
    } finally {
      setSaving(false);
    }
  };

  const named = products.filter((p) => p.name.trim());
  const stats = useMemo(() => ({
    total: named.length,
    nuts: named.filter(hasNuts).length,
    nutFree: named.filter((p) => !hasNuts(p) && !["treeNuts", "peanuts"].some((k) => p.cells?.[k] === "M")).length,
    may: named.filter((p) => mayContainOf(p).length).length,
  }), [named]);
  const reviewAge = meta.reviewDate ? Math.floor((Date.now() - Date.parse(meta.reviewDate)) / 864e5) : null;

  const needle = q.trim().toLowerCase();
  const shown = (editing ? products : named).filter((p) => {
    if (!editing && needle && ![p.name, p.code, p.category].some((v) => String(v || "").toLowerCase().includes(needle))) return false;
    if (!editing && filter === "nutfree") return !["treeNuts", "peanuts"].some((k) => p.cells?.[k]);
    if (!editing && filter) return p.cells?.[filter] === "C" || p.cells?.[filter] === "M";
    return true;
  });
  const order = runOrder(named);
  const run = (fn) => async () => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>🥜 Allergen Matrix</h2>
          <p style={S.sub}>
            Last saved {savedAt ? fmt(savedAt) : "—"} · Reviewed by {meta.reviewedBy || "—"} on {fmt(meta.reviewDate)}
          </p>
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={cancelEdit} style={S.btn("#e2e8f0", "#334155")}>Cancel</button>
            <button onClick={save} disabled={saving} style={S.btn("#0f766e")}>{saving ? "Saving…" : "💾 Save Matrix"}</button>
          </div>
        ) : (
          <SweetsReportActions
            busy={busy || loading}
            onEdit={mayEdit ? startEdit : undefined}
            onExcel={run(() => excelFromNode(sheetRef.current, "allergen_matrix", "Allergen Matrix"))}
            onPdf={run(() => pdfFromNode(sheetRef.current, "allergen_matrix"))}
            onPrint={() => printNode(sheetRef.current, "Allergen Matrix")}
          />
        )}
      </div>

      {msg && <div style={{ ...S.msg, ...S.tone[msg.tone] }}>{msg.text}</div>}
      {!editing && reviewAge !== null && reviewAge > REVIEW_DAYS && (
        <div style={{ ...S.msg, ...S.tone.warn }}>⚠️ Last review was {reviewAge} days ago — review the matrix at least once a year and whenever a recipe or supplier changes.</div>
      )}

      {!editing && (
        <div style={S.tiles}>
          {[["Products", stats.total, "#0f766e"], ["Contain nuts", stats.nuts, "#b91c1c"], ["Nut-free", stats.nutFree, "#047857"], ["With «may contain»", stats.may, "#b45309"]].map(([k, v, c]) => (
            <div key={k} style={S.tile}><div style={{ ...S.tileV, color: c }}>{v}</div><div style={S.tileK}>{k}</div></div>
          ))}
        </div>
      )}

      {!editing && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          <input style={{ ...S.input, flex: "1 1 240px" }} placeholder="🔍 Search product, code, category…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={{ ...S.input, flex: "0 0 220px" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All products</option>
            <option value="nutfree">Nut-free only</option>
            {ALLERGEN_COLS.map((c) => <option key={c.key} value={c.key}>With {c.en}</option>)}
          </select>
        </div>
      )}

      {editing && (
        <div style={{ ...S.card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
          <label><span style={S.label}>Reviewed By (HACCP team leader)</span><input style={S.input} value={meta.reviewedBy} onChange={(e) => setMeta({ ...meta, reviewedBy: e.target.value })} /></label>
          <label><span style={S.label}>Review Date</span><input type="date" style={S.input} value={meta.reviewDate} onChange={(e) => setMeta({ ...meta, reviewDate: e.target.value })} /></label>
          <div style={{ alignSelf: "end", color: "#475569", fontWeight: 700 }}>Click a cell to cycle: <b style={{ color: CELL.C.fg }}>C</b> contains → <b style={{ color: CELL.M.fg }}>M</b> may contain → – free</div>
        </div>
      )}

      <div ref={sheetRef} style={S.card}>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "#64748b", fontWeight: 700 }}>⏳ Loading…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, minWidth: 180 }}>Product</th>
                  <th style={S.th}>Code</th>
                  <th style={S.th}>Category</th>
                  {ALLERGEN_COLS.map((c) => (
                    <th key={c.key} style={{ ...S.th, textAlign: "center", minWidth: 70 }} title={c.ar}>{c.icon}<br />{c.en}</th>
                  ))}
                  <th style={{ ...S.th, minWidth: 130 }}>Nut Type(s)</th>
                  <th style={{ ...S.th, minWidth: 260 }}>Label Statement</th>
                  {editing && <th style={S.th} />}
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td style={S.td}>{editing ? <input style={S.cellIn} value={p.name} placeholder="Product name" onChange={(e) => setProd(p.id, { name: e.target.value })} /> : <b>{p.name}</b>}</td>
                    <td style={S.td}>{editing ? <input style={S.cellIn} value={p.code} onChange={(e) => setProd(p.id, { code: e.target.value })} /> : p.code}</td>
                    <td style={S.td}>{editing ? <input style={S.cellIn} value={p.category} list="am-cats" onChange={(e) => setProd(p.id, { category: e.target.value })} /> : p.category}</td>
                    {ALLERGEN_COLS.map((c) => {
                      const v = p.cells?.[c.key] || "";
                      const st = CELL[v];
                      return (
                        <td key={c.key} style={{ ...S.td, textAlign: "center", padding: 3 }}>
                          {editing ? (
                            <button type="button" onClick={() => cycle(p, c.key)} style={{ ...S.toggle, background: st.bg, color: st.fg, borderColor: st.bd }}>{st.txt}</button>
                          ) : (
                            <span style={{ ...S.badge, background: st.bg, color: st.fg, borderColor: st.bd }}>{st.txt}</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={S.td}>
                      {editing ? <input style={S.cellIn} list="am-nuts" value={p.nutTypes} placeholder={p.cells?.treeNuts ? "e.g. Walnut, Pistachio" : ""} onChange={(e) => setProd(p.id, { nutTypes: e.target.value })} /> : p.nutTypes}
                    </td>
                    <td style={{ ...S.td, fontWeight: 700, color: containsOf(p).length ? "#7f1d1d" : "#047857" }}>{labelStatement(p)}</td>
                    {editing && (
                      <td style={S.td}>
                        <button type="button" title="Remove product" onClick={() => setProducts((l) => l.filter((x) => x.id !== p.id))} style={{ ...S.btn("#fee2e2", "#b91c1c"), padding: "5px 9px" }}>✕</button>
                      </td>
                    )}
                  </tr>
                ))}
                {!shown.length && (
                  <tr><td colSpan={ALLERGEN_COLS.length + 6} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 20 }}>{named.length ? "No product matches." : "No products yet."}</td></tr>
                )}
              </tbody>
            </table>
            <datalist id="am-nuts">{NUT_TYPES.map((n) => <option key={n} value={n} />)}</datalist>
            <datalist id="am-cats">{["Cakes", "Oriental sweets", "Pastries", "Cookies", "Chocolates", "Desserts"].map((n) => <option key={n} value={n} />)}</datalist>
          </div>
        )}
        {editing && (
          <button type="button" onClick={() => setProducts((l) => [...l, blankProduct()])} style={{ ...S.btn("#0f766e"), marginTop: 10 }}>+ Add Product</button>
        )}

        {!editing && order.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={S.h3}>🔁 Suggested production run order</h3>
            <table style={S.table}>
              <thead><tr><th style={{ ...S.th, width: 40 }}>#</th><th style={S.th}>Product</th><th style={S.th}>Allergens</th></tr></thead>
              <tbody>
                {order.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ ...S.td, fontWeight: 800 }}>{p.name}{hasNuts(p) ? " 🥜" : ""}</td>
                    <td style={S.td}>{containsOf(p).map((c) => c.en).join(", ") || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...S.sub, marginTop: 6 }}>Run allergen-free products first and nut products last; clean the line before switching back.</p>
          </div>
        )}

        <p style={{ ...S.sub, marginTop: 12 }}>
          <b style={{ color: CELL.C.fg }}>C</b> = Contains (ingredient) · <b style={{ color: CELL.M.fg }}>M</b> = May contain (cross-contact on shared line / supplier) · – = Free
        </p>
      </div>
    </div>
  );
}

const S = {
  wrap: { padding: "4px 0 20px", color: "#0f172a", fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif' },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  h2: { margin: 0, fontSize: 21, fontWeight: 900 },
  h3: { margin: "0 0 8px", fontSize: 15, fontWeight: 900, color: "#134e4a" },
  sub: { margin: "4px 0 0", color: "#64748b", fontWeight: 600, fontSize: 13 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1rem 1.1rem", marginBottom: 12, boxShadow: "0 8px 24px rgba(15,23,42,.05)" },
  label: { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 4 },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 14, outline: "none", background: "#fff", fontFamily: "inherit" },
  cellIn: { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 7px", fontSize: 13, fontFamily: "inherit" },
  table: { borderCollapse: "collapse", width: "100%" },
  th: { border: "1px solid #cbd5e1", background: "#ecfdf5", color: "#134e4a", padding: "7px 6px", fontSize: 12, fontWeight: 800, textAlign: "left" },
  td: { border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: 13, verticalAlign: "middle" },
  toggle: { width: 42, height: 32, borderRadius: 8, border: "1.5px solid", fontWeight: 900, cursor: "pointer", fontFamily: "inherit" },
  badge: { display: "inline-block", minWidth: 30, padding: "3px 0", borderRadius: 8, border: "1px solid", fontWeight: 900 },
  btn: (bg, color = "#fff") => ({ background: bg, color, border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }),
  tiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 },
  tile: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "10px 14px" },
  tileV: { fontSize: 24, fontWeight: 1000 },
  tileK: { fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" },
  msg: { borderRadius: 12, padding: "10px 14px", fontWeight: 700, marginBottom: 10, border: "1px solid" },
  tone: {
    ok: { background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" },
    warn: { background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" },
    fail: { background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" },
  },
};
