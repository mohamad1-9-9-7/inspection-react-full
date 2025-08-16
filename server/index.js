// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config(); // قراءة متغيرات .env محليًا

const app = express();
const PORT = process.env.PORT || 5000;

// اتصال PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // مطلوب مع Neon/Render أحيانًا
});

app.use(express.json());

// CORS: اسمح لتطبيق Netlify + أي localhost
app.use(
  cors({
    origin: ["https://cheerful-melba-898d30.netlify.app", /^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Idempotency-Key"],
  })
);
app.options("*", cors());

/* ======================== Schema (اختياري لكنه مفيد) ======================== */
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

app.get("/", (_req, res) => res.send("🚀 API is running"));

/* ======================== Reports API ======================== */
// قراءة التقارير (يدعم ?type=returns ويعيد آخر 50)
app.get("/api/reports", async (req, res) => {
  try {
    const { type } = req.query;
    const q = type
      ? "SELECT * FROM reports WHERE type=$1 ORDER BY created_at DESC LIMIT 50"
      : "SELECT * FROM reports ORDER BY created_at DESC LIMIT 50";
    const r = await pool.query(q, type ? [type] : []);
    // الواجهة تتعامل مع الشكلين (Array أو {ok,data})
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});

// إضافة تقرير جديد
app.post("/api/reports", async (req, res) => {
  try {
    const { reporter, type, payload } = req.body || {};
    if (!type || !payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "invalid payload" });
    }
    const r = await pool.query(
      "INSERT INTO reports (reporter, type, payload) VALUES ($1, $2, $3) RETURNING *",
      [reporter || "anonymous", type, payload]
    );
    res.status(201).json({ ok: true, report: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});

// حذف تقارير يوم معيّن حسب النوع والتاريخ (Hard Delete)
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

/* ======================== Boot ======================== */
ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB init failed:", err);
    process.exit(1);
  });
