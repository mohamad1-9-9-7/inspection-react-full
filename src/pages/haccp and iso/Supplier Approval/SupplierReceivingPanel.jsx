// Suppliers that appear in goods receiving (last 12 months) but have no
// evaluation. Shown in the results page's right pane from the KPI tile.
// Per name: send an evaluation link, link it to an evaluated supplier (a
// spelling the fuzzy match missed — the picker ranks the likely ones first,
// and a link can be undone), or ignore it (internal / not a supplier).
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nameSimilarity } from "./supplierReceiving";

const T = {
  en: {
    title: "Suppliers in goods receiving without an evaluation",
    sub: "From shipment receiving records of the last 12 months. Names are typed at the branches, so similar spellings are grouped.",
    deliveries: "deliveries",
    last: "Last",
    since: "since",
    variants: "Spellings",
    evaluate: "📨 Create evaluation link",
    linkTo: "🔗 Link to an existing supplier",
    linkHint: "Same supplier, different spelling? Pick the evaluated supplier — every delivery under this name will count for it.",
    linkSearch: "Search evaluated suppliers...",
    likely: "likely",
    noMatch: "No evaluated supplier matches.",
    cancel: "Cancel",
    confirmLink: (a, b) => `Link "${a}" to the evaluated supplier "${b}"?`,
    linkedTitle: "Names linked by hand",
    unlink: "✂ Unlink",
    missingEval: "evaluation not found",
    ignore: "🙈 Not a supplier",
    restore: "↩ Restore",
    ignoredTitle: "Ignored names",
    auto: "auto: internal transfer / country of origin",
    none: "Every supplier in receiving has an evaluation. ✅",
    loading: "Reading receiving records...",
    failed: "Could not read the receiving records.",
    search: "Search names...",
  },
  ar: {
    title: "موردون في استلام الشحنات بدون تقييم",
    sub: "من سجلات استلام الشحنات لآخر 12 شهر. الأسماء تُكتب يدوياً في الفروع، لذلك تُجمع الكتابات المتشابهة معاً.",
    deliveries: "استلام",
    last: "آخر استلام",
    since: "منذ",
    variants: "طرق الكتابة",
    evaluate: "📨 إنشاء رابط تقييم",
    linkTo: "🔗 ربط بمورد موجود",
    linkHint: "نفس المورد لكن الاسم مكتوب بشكل مختلف؟ اختر المورد المُقيَّم — كل الاستلامات بهذا الاسم ستُحسب له.",
    linkSearch: "ابحث في الموردين المُقيَّمين...",
    likely: "الأقرب",
    noMatch: "لا يوجد مورد مُقيَّم مطابق.",
    cancel: "إلغاء",
    confirmLink: (a, b) => `ربط "${a}" بالمورد المُقيَّم "${b}"؟`,
    linkedTitle: "أسماء مربوطة يدوياً",
    unlink: "✂ فك الربط",
    missingEval: "التقييم غير موجود",
    ignore: "🙈 ليس مورداً",
    restore: "↩ استرجاع",
    ignoredTitle: "أسماء متجاهلة",
    auto: "تلقائي: تحويل داخلي / بلد منشأ",
    none: "كل الموردين في الاستلام لديهم تقييم. ✅",
    loading: "جاري قراءة سجلات الاستلام...",
    failed: "تعذّرت قراءة سجلات الاستلام.",
    search: "ابحث في الأسماء...",
  },
};

export default function SupplierReceivingPanel({ lang, match, evaluated, cfg, onSaveCfg, loading, error, btn, input, panel }) {
  const t = T[lang] || T.en;
  const nav = useNavigate();
  const [showIgnored, setShowIgnored] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [linking, setLinking] = useState(""); // key of the name whose picker is open
  const [linkQ, setLinkQ] = useState("");
  const [showLinked, setShowLinked] = useState(false);
  const evalName = (id) => (evaluated.find((e) => e.id === id) || {}).name;

  /* Evaluated suppliers ranked by likeness to this receiving name (all spellings). */
  const choices = (r) => {
    const query = linkQ.trim().toLowerCase();
    const seen = new Set();
    return evaluated
      .map((e) => ({ ...e, score: Math.max(...r.names.map((n) => nameSimilarity(n, e.name))) }))
      .filter((e) => !query || e.name.toLowerCase().includes(query))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .filter((e) => {
        // one row per supplier name (re-evaluations share a name) — the first is the best-ranked
        const k = e.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, query ? 30 : 8);
  };

  const linkTo = (r, e) => {
    if (!window.confirm(t.confirmLink(r.name, e.name))) return;
    const aliases = { ...(cfg.aliases || {}) };
    // every spelling of this name points at the chosen evaluation
    r.keys.forEach((k) => {
      aliases[k] = e.id;
    });
    setLinking("");
    setLinkQ("");
    save({ ...cfg, aliases }, r.key);
  };

  const save = async (next, key) => {
    setBusy(key);
    try {
      await onSaveCfg(next);
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusy("");
    }
  };

  const chip = (bg, fg, border) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: bg,
    color: fg,
    border: "1px solid " + border,
    fontWeight: 900,
    whiteSpace: "nowrap",
  });

  const list = (match?.unevaluated || []).filter(
    (r) => !q || r.names.some((n) => n.toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <section style={{ ...panel, padding: "16px 18px", minHeight: 0, height: "100%", overflowY: "auto" }}>
      <div className="ser-h1 ser-h1" style={{ fontWeight: 990, color: "#9a3412" }}>
        🚚 {t.title}
      </div>
      <div style={{ color: "#64748b", fontWeight: 800, margin: "4px 0 12px" }}>{t.sub}</div>

      {loading ? <div style={{ fontWeight: 900, color: "#64748b" }}>⏳ {t.loading}</div> : null}
      {error ? <div style={{ fontWeight: 900, color: "#991b1b" }}>⚠ {t.failed} {error}</div> : null}

      {!loading && !error ? (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} style={{ ...input, padding: "8px 12px", marginBottom: 10 }} />
          {list.length === 0 ? <div style={{ fontWeight: 900, color: "#166534" }}>{t.none}</div> : null}
          <div style={{ display: "grid", gap: 8 }}>
            {list.map((r) => (
              <div key={r.key} style={{ border: "1px solid rgba(15,23,42,0.12)", borderInlineStart: "5px solid #f97316", borderRadius: 12, padding: "10px 12px", background: "#fff" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, fontWeight: 980 }}>{r.name}</div>
                  <span style={chip("#ffedd5", "#9a3412", "#fdba74")}>
                    {r.deliveries} {t.deliveries}
                  </span>
                </div>
                <div className="ser-sm ser-sm" style={{ color: "#64748b", fontWeight: 800, marginTop: 4 }}>
                  {t.last}: {r.lastDate || "—"} · {t.since} {r.firstDate || "—"} · {r.branches.join(", ") || "—"}
                </div>
                {r.names.length > 1 ? (
                  <div className="ser-sm ser-sm" style={{ color: "#94a3b8", fontWeight: 800, marginTop: 2 }}>
                    {t.variants}: {r.names.join(" · ")}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <button
                    type="button"
                    style={{ ...btn, padding: "6px 12px", background: "#0f766e", color: "#fff", borderColor: "#0f766e" }}
                    onClick={() => nav(`/haccp-iso/supplier-evaluation/create?name=${encodeURIComponent(r.name)}`)}
                  >
                    {t.evaluate}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    style={{ ...btn, padding: "6px 12px", ...(linking === r.key ? { background: "#e0f2fe", borderColor: "#0284c7" } : null) }}
                    onClick={() => {
                      setLinking(linking === r.key ? "" : r.key);
                      setLinkQ("");
                    }}
                  >
                    {t.linkTo}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    style={{ ...btn, padding: "6px 12px" }}
                    onClick={() => save({ ...cfg, ignored: [...(cfg.ignored || []), ...r.keys] }, r.key)}
                  >
                    {busy === r.key ? "…" : t.ignore}
                  </button>
                </div>
                {linking === r.key ? (
                  <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                    <div className="ser-sm ser-sm" style={{ color: "#075985", fontWeight: 850, marginBottom: 6 }}>{t.linkHint}</div>
                    <input
                      autoFocus
                      value={linkQ}
                      onChange={(e) => setLinkQ(e.target.value)}
                      placeholder={t.linkSearch}
                      style={{ ...input, padding: "6px 10px", marginBottom: 6 }}
                    />
                    <div style={{ display: "grid", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                      {choices(r).map((e, i) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => linkTo(r, e)}
                          style={{ ...btn, padding: "6px 10px", display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", textAlign: "start", background: "#fff" }}
                        >
                          <span style={{ fontWeight: 900 }}>{e.name}</span>
                          {i < 3 && e.score >= 0.5 && !linkQ.trim() ? <span style={chip("#dcfce7", "#166534", "#86efac")}>{t.likely}</span> : null}
                        </button>
                      ))}
                      {!choices(r).length ? <div style={{ color: "#64748b", fontWeight: 850 }}>{t.noMatch}</div> : null}
                    </div>
                    <button type="button" style={{ ...btn, padding: "4px 10px", marginTop: 6 }} onClick={() => setLinking("")}>
                      {t.cancel}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {(match?.linked || []).length ? (
            <div style={{ marginTop: 16 }}>
              <button type="button" style={{ ...btn, padding: "6px 12px" }} onClick={() => setShowLinked((v) => !v)}>
                {showLinked ? "▾" : "▸"} {t.linkedTitle} ({match.linked.length})
              </button>
              {showLinked ? (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {match.linked.map((r) => (
                    <div key={r.evaluatedId + "|" + r.key} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 10px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                      <span style={{ flex: 1, minWidth: 180, fontWeight: 850, color: "#334155" }}>
                        {r.names.join(" · ")} → <b>{evalName(r.evaluatedId) || `⚠ ${t.missingEval}`}</b> — {r.deliveries} {t.deliveries}
                      </span>
                      <button
                        type="button"
                        disabled={!!busy}
                        style={{ ...btn, padding: "4px 10px" }}
                        onClick={() => {
                          const aliases = { ...(cfg.aliases || {}) };
                          r.keys.forEach((k) => delete aliases[k]);
                          save({ ...cfg, aliases }, r.key);
                        }}
                      >
                        {busy === r.key ? "…" : t.unlink}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {(match?.ignored || []).length ? (
            <div style={{ marginTop: 16 }}>
              <button type="button" style={{ ...btn, padding: "6px 12px" }} onClick={() => setShowIgnored((v) => !v)}>
                {showIgnored ? "▾" : "▸"} {t.ignoredTitle} ({match.ignored.length})
              </button>
              {showIgnored ? (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {match.ignored.map((r) => (
                    <div key={r.key} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 10px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <span style={{ flex: 1, minWidth: 180, fontWeight: 850, color: "#475569" }}>
                        {r.names.join(" · ")} — {r.deliveries} {t.deliveries}
                      </span>
                      {r.auto ? (
                        <span className="ser-sm ser-sm" style={{ color: "#94a3b8", fontWeight: 800 }}>
                          {t.auto}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!!busy}
                          style={{ ...btn, padding: "4px 10px" }}
                          onClick={() => save({ ...cfg, ignored: (cfg.ignored || []).filter((k) => !r.keys.includes(k)) }, r.key)}
                        >
                          {t.restore}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
