import API_BASE from "../config/api";

const AUDIT_KEY = "settings_audit_log_v1";
const AUDIT_TYPE = "settings_audit_log";
const MAX_LOCAL_ENTRIES = 500;

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function redact(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value !== "object") return value;

  const out = {};
  Object.entries(value).forEach(([key, val]) => {
    if (/password|token|secret|credential|currentUser/i.test(key)) {
      out[key] = "[redacted]";
    } else {
      out[key] = redact(val);
    }
  });
  return out;
}

function readLocalAudit() {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAudit(entries) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES)));
  } catch {
    /* ignore local quota errors */
  }
}

export function getSettingsAuditLog() {
  return readLocalAudit();
}

export async function logSettingsAudit({
  area,
  action,
  target = "",
  before = null,
  after = null,
  reason = "",
  meta = {},
  result = "success",
}) {
  const user = currentUser();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    area,
    action,
    target,
    reason: String(reason || "").trim(),
    result,
    actor: {
      username: user.username || "anonymous",
      displayName: user.displayName || "",
      isAdmin: !!user.isAdmin,
      isSuperAdmin: !!user.isSuperAdmin,
    },
    before: redact(before),
    after: redact(after),
    meta: redact(meta),
  };

  writeLocalAudit([entry, ...readLocalAudit()]);

  try {
    await fetch(`${API_BASE}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter: entry.actor.username,
        type: AUDIT_TYPE,
        payload: entry,
      }),
    });
  } catch {
    /* Local audit entry is the fallback when the server is unavailable. */
  }

  return entry;
}
