// index.js
import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ======================== CORS Headers (مبكرة) ======================== */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // غيّرها لقائمة أصول معيّنة إذا لزم
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // 🆕 أضفنا PUT
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Idempotency-Key");
  next();
});

/* ======================== PostgreSQL ======================== */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // مناسب لـ Render/Neon
});

app.use(express.json());

/* ======================== إعداد CORS ======================== */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      /\.netlify\.app$/,
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // 🆕 أضفنا PUT
    allowedHeaders: ["Content-Type", "X-Idempotency-Key"],
  })
);
app.options("*", cors());

/* ======================== DB Schema ======================== */
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id BIGSERIAL PRIMARY KEY,
      reporter TEXT,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_reports_type_reportdate
      ON reports (type, ((payload->>'reportDate')));
  `);
  console.log("✅ DB schema ready");
}

/* ======================== Health ======================== */
app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/", (_req, res) => res.send("OK"));

/* ======================== Reports API ======================== */
// قراءة التقارير (?type=returns)
app.get("/api/reports", async (req, res) => {
  try {
    const { type } = req.query;
    const q = type
      ? "SELECT * FROM reports WHERE type=$1 ORDER BY created_at DESC LIMIT 50"
      : "SELECT * FROM reports ORDER BY created_at DESC LIMIT 50";
    const r = await pool.query(q, type ? [type] : []);
    res.json({ ok: true, data: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db select failed" });
  }
});

// إضافة تقرير جديد
app.post("/api/reports", async (req, res) => {
  try {
    const { reporter, type, payload } = req.body || {};
    if (!type || !payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "invalid payload" });
    }
    const q = `
      INSERT INTO reports (reporter, type, payload)
      VALUES ($1, $2, $3)
      RETURNING *`;
    const r = await pool.query(q, [reporter || "anonymous", type, payload]);
    res.status(201).json({ ok: true, report: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db insert failed" });
  }
});

// 🔹 المسار الأساسي: حذف بحسب النوع والتاريخ
// مثال: DELETE /api/reports?type=returns&reportDate=2025-08-20
app.delete("/api/reports", async (req, res) => {
  try {
    const { type, reportDate } = req.query;
    if (!type || !reportDate) {
      return res.status(400).json({ ok: false, error: "type & reportDate required" });
    }
    const delQuery = `
      DELETE FROM reports
      WHERE type = $1
        AND payload->>'reportDate' = $2
    `;
    const r = await pool.query(delQuery, [type, reportDate]);
    res.json({ ok: true, deleted: r.rowCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db delete failed" });
  }
});

// 🔸 مسار بديل مطابق لمحاولة الواجهة الثانية
// مثال: DELETE /api/reports/returns?reportDate=2025-08-20
app.delete("/api/reports/returns", async (req, res) => {
  try {
    const { reportDate } = req.query;
    if (!reportDate) return res.status(400).json({ ok: false, error: "reportDate required" });
    const { rowCount } = await pool.query(
      `DELETE FROM reports
       WHERE type = 'returns' AND payload->>'reportDate' = $1`,
      [reportDate]
    );
    res.json({ ok: true, deleted: rowCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db delete failed" });
  }
});

// 🔹 مسار ثالث بسيط (يرجع نص/204 لو حاب) — مطابق لمحاولة الواجهة الثالثة
// مثال: DELETE /returns?reportDate=2025-08-20
app.delete("/returns", async (req, res) => {
  try {
    const { reportDate } = req.query;
    if (!reportDate) return res.status(400).send("reportDate required");
    const { rowCount } = await pool.query(
      `DELETE FROM reports
       WHERE type = 'returns' AND payload->>'reportDate' = $1`,
      [reportDate]
    );
    res.status(200).send(String(rowCount || 0)); // الواجهة تتعامل مع 204/نص أيضًا
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

/* ======================== 🆕 التعديل (PUT) ======================== */
/**
 * استبدال تقرير يوم محدد (Upsert منطقي بدون تغيير السكيمة):
 * - نتوقع في الـ body:
 *   { type: 'returns', payload: { reportDate: 'YYYY-MM-DD', items: [...] }, reporter? }
 * - ننفّذ حذفًا لكل سجل بنفس (type, reportDate)، ثم نُدرج سجلًّا واحدًا جديدًا.
 * - هذا يحل مشكلة "السيرفر يضيف فقط" ويجعل التعديل يعمل من الواجهة.
 */
app.put("/api/reports", async (req, res) => {
  const { reporter, type, payload } = req.body || {};
  const reportDate =
    payload?.reportDate ??
    (typeof payload === "object" ? payload?.report_date : undefined) ??
    req.query?.reportDate;

  if (!type || !payload || typeof payload !== "object" || !reportDate) {
    return res.status(400).json({ ok: false, error: "type & payload.reportDate required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // حذف كل النسخ القديمة لنفس اليوم ونفس النوع
    await client.query(
      `DELETE FROM reports
       WHERE type = $1 AND payload->>'reportDate' = $2`,
      [type, reportDate]
    );
    // إدراج النسخة الجديدة المعدّلة
    const ins = await client.query(
      `INSERT INTO reports (reporter, type, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reporter || "anonymous", type, payload]
    );
    await client.query("COMMIT");
    res.json({ ok: true, report: ins.rows[0] });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ ok: false, error: "db upsert (replace) failed" });
  } finally {
    client.release();
  }
});

/**
 * تعديل مباشر عبر المعرّف (id) — مفيد لو بدك تستخدمه بالإدارة.
 * body: { payload: {...} }
 */
app.put("/api/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { payload } = req.body || {};
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "invalid payload" });
    }
    const r = await pool.query(
      `UPDATE reports
          SET payload = $1
        WHERE id = $2
        RETURNING *`,
      [payload, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, report: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db update failed" });
  }
});

/* ======================== Boot ======================== */
ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB init failed:", err);
    process.exit(1);
  });
