// index.js
import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config(); // محلي فقط، على Render يكفي Environment Variables

const app = express();
const PORT = process.env.PORT || 3000;

// اتصال PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());
app.use(cors({
  origin: [/\.netlify\.app$/, "http://localhost:5173"],
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","X-Idempotency-Key"]
}));

// إنشاء الجدول إذا لم يكن موجود
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
  `);
  console.log("✅ DB schema ready");
}

// فحص صحة قاعدة البيانات
app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// فحص صحة السيرفر
app.get("/", (_req, res) => res.send("OK"));

// إضافة تقرير
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

    res.status(200).json({ ok: true, report: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db insert failed" });
  }
});

// قراءة التقارير
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

// تشغيل السيرفر بعد التأكد من الـ DB
ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ DB init failed:", err);
    process.exit(1);
  });
