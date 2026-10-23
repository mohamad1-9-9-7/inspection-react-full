// src/pages/settings/_shared/NeonBackupCard.jsx
// 🗄️ Full database backup (Neon) — super-admin only.
//
// The JSON and Excel backups cover the `reports` table only. This one asks the
// server for GET /api/admin/db-dump: every table of every company (accounts,
// catalogue, audit trail, invoices, subscriptions…) as ONE gzipped .sql file
// that `psql` restores into an empty database. The server re-checks the
// super-admin token; hiding the card here is only for tidiness.

import React, { useState } from "react";
import API_BASE from "../../../config/api";
import { Button } from "./SettingsUIKit";

function currentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}") || {}; } catch { return {}; }
}

const fmtMB = (b) => `${(b / 1048576).toFixed(2)} MB`;

export default function NeonBackupCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  if (!currentUser().isSuperAdmin) return null;

  async function download() {
    setBusy(true);
    setMsg({ ok: true, text: "⏳ جاري تجهيز النسخة الكاملة من السيرفر… (دقيقة تقريباً)" });
    try {
      const res = await fetch(`${API_BASE}/api/admin/db-dump`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error === "backup_already_running" ? "في نسخة شغّالة هلق — جرّب بعد شوي" : (j.error || `HTTP ${res.status}`));
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const name = (cd.match(/filename="([^"]+)"/) || [])[1]
        || `neon-full-${new Date().toISOString().slice(0, 10)}.sql.gz`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: `✅ تم تحميل ${name} (${fmtMB(blob.size)})` });
    } catch (e) {
      setMsg({ ok: false, text: `❌ فشل النسخ: ${e.message || e}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#ecfdf5,#f0fdfa)",
        border: "1px solid #99f6e4",
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 800, color: "#134e4a", marginBottom: 6 }}>
        🗄️ نسخة احتياطية كاملة لقاعدة البيانات (Neon)
      </div>
      <div style={{ color: "#115e59", lineHeight: 1.8, fontSize: "0.9rem", marginBottom: 12 }}>
        كل الجداول لكل الشركات — التقارير، الحسابات، الكتالوج، سجل التعديلات، الفواتير والاشتراكات —
        بملف <b>.sql.gz</b> واحد بيرجع بالكامل على قاعدة فاضية. الملف فيه بيانات حساسة (كلمات سر مشفّرة)،
        خزّنه بمكان آمن.
      </div>
      <Button tone="primary" onClick={download} disabled={busy}>
        {busy ? "⏳ جاري النسخ…" : "⬇️ تحميل نسخة Neon كاملة"}
      </Button>
      {msg && (
        <div style={{ marginTop: 10, fontWeight: 700, color: msg.ok ? "#065f46" : "#b91c1c" }}>{msg.text}</div>
      )}
    </div>
  );
}
