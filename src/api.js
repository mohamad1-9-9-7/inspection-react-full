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
app.use(
  cors({
    // السماح للنشر على Netlify والتجارب على أي بورت محلي (3000, 5173, ...إلخ)
    origin: [/\.netlify\.app$/, /^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Idempotency-Key"],
  })
);
app.options("*", cors());

/* ======================== DB Schema ======================== */
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
    -- فهرس يساعد على حذف/جلب يوم معين بسرعة
    CREATE INDEX IF NOT EXISTS idx_reports_type_reportdate
      ON reports (type, ((payload->>'reportDate')));
  `);
  console.log("✅ DB schema ready");
}

/* ======================== Health ======================== */
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

/* ======================== Reports API ======================== */
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

// قراءة التقارير (آخر 50 حسب type إن وُجد)
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

// حذف تقارير يوم معيّن (Hard Delete) بناءً على نوع التقرير وتاريخ التقرير
// يُستدعى هكذا من الواجهة:
// DELETE /api/reports?type=returns&reportDate=YYYY-MM-DD
app.delete("/api/reports", async (req, res) => {
  try {
    const { type, reportDate } = req.query;
    if (!type || !reportDate) {
      return res.status(400).json({ ok: false, error: "bad request" });
    }

    const delQuery = `
      DELETE FROM reports
      WHERE type = $1
        AND payload->>'reportDate' = $2
    `;
    const r = await pool.query(delQuery, [type, reportDate]);

    return res.json({ ok: true, deleted: r.rowCount });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "db delete failed" });
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
