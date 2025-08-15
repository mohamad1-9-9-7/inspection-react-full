import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({
  origin: [/\.netlify\.app$/, "http://localhost:5173"],
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","X-Idempotency-Key"]
}));

// تخزين مؤقت بالذاكرة (بدّلها بقاعدة بيانات لاحقًا)
const reports = [];

// POST /api/reports
app.post("/api/reports", (req, res) => {
  const { reporter, type, payload } = req.body || {};
  if (type !== "returns" || !payload?.reportDate || !Array.isArray(payload?.items)) {
    return res.status(400).json({ ok: false, error: "invalid payload" });
  }
  const rec = {
    id: crypto.randomUUID?.() || (Date.now()+""),
    reporter: reporter || "anonymous",
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  reports.push(rec);
  return res.status(200).json({ ok: true, id: rec.id });
});

// GET /api/reports?type=returns
app.get("/api/reports", (req, res) => {
  const { type } = req.query;
  const data = type ? reports.filter(r => r.type === type) : reports;
  res.json({ ok: true, data });
});

// (اختياري) فحص صحة
app.get("/", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API on", PORT));
