// routes/demoRequests.cjs — "Request a demo" leads for the public /demo page.
//
//   POST   /api/demo-requests        PUBLIC  (no login) — save a request + e-mail the owner
//   GET    /api/demo-requests        super-admin — list all requests
//   PATCH  /api/demo-requests/:id    super-admin — change { status, notes }
//   DELETE /api/demo-requests/:id    super-admin — delete (spam / duplicates)
//
// Mount it in the server's main file (see README.md next to this file):
//
//   const demoRequestsRouter = require("./routes/demoRequests.cjs");
//   app.use("/api/demo-requests", demoRequestsRouter({ pool, requireSuperAdmin, sendMail }));
//
// - pool              : the pg Pool the server already uses (Neon / Postgres)
// - requireSuperAdmin : the server's existing middleware that lets only the
//                       platform owner through (same one used by /api/companies)
// - sendMail          : optional async ({ to, subject, text, html }) => void,
//                       e.g. the function behind /api/email/send. If it is
//                       missing or fails, the request is still saved.
//
// Needs no new npm packages. The table is created on first start.

const express = require("express");

const STATUSES = ["new", "contacted", "demo_done", "trial", "won", "lost"];

// field -> max length. Anything else in the body is ignored.
const FIELDS = {
  companyName: 150,
  activity: 40,
  branches: 20,
  contactName: 120,
  jobTitle: 120,
  phone: 40,
  email: 160,
  emirate: 40,
  message: 2000,
  source: 60,
  referrer: 300,
  lang: 5,
};

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS demo_requests (
  id            SERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'new',
  notes         TEXT NOT NULL DEFAULT '',
  company_name  TEXT NOT NULL,
  activity      TEXT NOT NULL DEFAULT '',
  branches      TEXT NOT NULL DEFAULT '',
  contact_name  TEXT NOT NULL,
  job_title     TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  emirate       TEXT NOT NULL DEFAULT '',
  message       TEXT NOT NULL DEFAULT '',
  source        TEXT NOT NULL DEFAULT '',
  referrer      TEXT NOT NULL DEFAULT '',
  lang          TEXT NOT NULL DEFAULT '',
  ip            TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS demo_requests_created_idx ON demo_requests (created_at DESC);
`;

/* ---- tiny in-memory rate limit: 5 requests per IP per hour ---- */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return list.length > MAX_PER_WINDOW;
}

const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "";

const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

module.exports = function demoRequestsRouter({ pool, requireSuperAdmin, sendMail } = {}) {
  if (!pool) throw new Error("demoRequestsRouter: pool is required");
  if (typeof requireSuperAdmin !== "function") throw new Error("demoRequestsRouter: requireSuperAdmin middleware is required");

  const router = express.Router();
  const ready = pool.query(CREATE_SQL).catch((e) => console.error("[demo-requests] create table failed:", e.message));

  /* ---------- PUBLIC: create ---------- */
  router.post("/", express.json({ limit: "20kb" }), async (req, res) => {
    try {
      const body = req.body || {};
      // Honeypot: people never see the "website" field; bots fill it. Pretend success.
      if (String(body.website || "").trim()) return res.status(201).json({ ok: true });

      const ip = clientIp(req);
      if (rateLimited(ip)) return res.status(429).json({ ok: false, error: "Too many requests" });

      const d = {};
      for (const [k, max] of Object.entries(FIELDS)) d[k] = clean(body[k], max);
      if (!d.companyName || !d.contactName || !d.phone) {
        return res.status(400).json({ ok: false, error: "Company name, contact name and phone are required" });
      }
      if (d.phone.replace(/\D/g, "").length < 7) return res.status(400).json({ ok: false, error: "Invalid phone" });
      if (d.email && !isEmail(d.email)) return res.status(400).json({ ok: false, error: "Invalid e-mail" });

      await ready;
      const { rows } = await pool.query(
        `INSERT INTO demo_requests
           (company_name, activity, branches, contact_name, job_title, phone, email, emirate, message, source, referrer, lang, ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [d.companyName, d.activity, d.branches, d.contactName, d.jobTitle, d.phone, d.email,
         d.emirate, d.message, d.source, d.referrer, d.lang, ip]
      );
      const row = rows[0];
      res.status(201).json({ ok: true, id: row.id });

      // Notify the owner after answering — a mail problem never loses the lead.
      const to = process.env.DEMO_NOTIFY_EMAIL;
      if (to && typeof sendMail === "function") {
        const lines = [
          ["Company", d.companyName], ["Business type", d.activity], ["Branches", d.branches],
          ["Emirate", d.emirate], ["Contact", `${d.contactName}${d.jobTitle ? " — " + d.jobTitle : ""}`],
          ["Phone", d.phone], ["E-mail", d.email], ["Source", d.source], ["Message", d.message],
        ].filter(([, v]) => v);
        const appUrl = (process.env.APP_PUBLIC_URL || "").replace(/\/$/, "");
        const link = appUrl ? `${appUrl}/select-company?tab=leads` : "";
        Promise.resolve(
          sendMail({
            to,
            subject: `New demo request: ${d.companyName}${d.branches ? ` (${d.branches} branches)` : ""}`,
            text: lines.map(([k, v]) => `${k}: ${v}`).join("\n") + (link ? `\n\nOpen: ${link}` : ""),
            html:
              `<h2 style="font-family:sans-serif">New demo request</h2><table style="font-family:sans-serif;border-collapse:collapse">` +
              lines.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b"><b>${esc(k)}</b></td><td style="padding:4px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("") +
              `</table>` + (link ? `<p><a href="${esc(link)}">Open Demo Requests</a></p>` : ""),
          })
        ).catch((e) => console.error("[demo-requests] notify mail failed:", e.message));
      }
    } catch (e) {
      console.error("[demo-requests] create failed:", e);
      if (!res.headersSent) res.status(500).json({ ok: false, error: "Could not save the request" });
    }
  });

  /* ---------- super-admin: list / update / delete ---------- */
  router.get("/", requireSuperAdmin, async (_req, res) => {
    try {
      await ready;
      const { rows } = await pool.query("SELECT * FROM demo_requests ORDER BY created_at DESC LIMIT 2000");
      res.json({ ok: true, requests: rows });
    } catch (e) {
      console.error("[demo-requests] list failed:", e);
      res.status(500).json({ ok: false, error: "Could not load demo requests" });
    }
  });

  router.patch("/:id", requireSuperAdmin, express.json({ limit: "20kb" }), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Bad id" });
      const sets = [];
      const vals = [];
      if (req.body?.status !== undefined) {
        if (!STATUSES.includes(req.body.status)) return res.status(400).json({ ok: false, error: "Bad status" });
        vals.push(req.body.status); sets.push(`status = $${vals.length}`);
      }
      if (req.body?.notes !== undefined) {
        vals.push(clean(req.body.notes, 5000)); sets.push(`notes = $${vals.length}`);
      }
      if (!sets.length) return res.status(400).json({ ok: false, error: "Nothing to update" });
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE demo_requests SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: "Not found" });
      res.json({ ok: true, request: rows[0] });
    } catch (e) {
      console.error("[demo-requests] update failed:", e);
      res.status(500).json({ ok: false, error: "Update failed" });
    }
  });

  router.delete("/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Bad id" });
      const { rowCount } = await pool.query("DELETE FROM demo_requests WHERE id = $1", [id]);
      if (!rowCount) return res.status(404).json({ ok: false, error: "Not found" });
      res.json({ ok: true });
    } catch (e) {
      console.error("[demo-requests] delete failed:", e);
      res.status(500).json({ ok: false, error: "Delete failed" });
    }
  });

  return router;
};
