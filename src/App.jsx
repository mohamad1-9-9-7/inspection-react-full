// App.jsx
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy imports (عدّل المسارات حسب مشروعك)
const Login = lazy(() => import("./pages/Login"));
const Inspection = lazy(() => import("./pages/Inspection"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SupervisorDashboard = lazy(() => import("./pages/Supervisor"));

const DailyMonitorDashboard = lazy(() => import("./pages/monitor/DailyMonitorDashboard"));
const QCSReport = lazy(() => import("./pages/monitor/branches/QCSReport"));
const POS19Report = lazy(() => import("./pages/monitor/branches/POS19Report"));

const OHCUpload = lazy(() => import("./pages/ohc/OHCUpload"));
const OHCView = lazy(() => import("./pages/ohc/OHCView"));

const QCSRawMaterialInspection = lazy(() => import("./pages/monitor/branches/shipment_recc/QCSRawMaterialInspection"));
const QCSRawMaterialView = lazy(() => import("./pages/admin/QCSRawMaterialView"));

const Returns = lazy(() => import("./pages/Returns"));
const ReturnView = lazy(() => import("./pages/ReturnView"));

const LoginKPI = lazy(() => import("./pages/LoginKPI"));
const KPIDashboard = lazy(() => import("./pages/KPIDashboard"));

const FinishedProductsData = lazy(() => import("./pages/finished/FinishedProductsData"));
const FinishedProductEntry = lazy(() => import("./pages/finished/FinishedProductEntry"));
const FinishedProductReports = lazy(() => import("./pages/finished/FinishedProductReports"));

// 🆕 سيارات: صفحة التبويبات (CarIcon.jsx الموجود عندك في src/pages/car/pages)
const CarIconPage = lazy(() => import("./pages/car/pages/CarIcon"));

// (اختياري) مكون لحماية المسارات
/**
 * مكوّن لحماية المسارات الخاصة: يقوم بالتحقق من وجود مستخدم مسجّل في localStorage.
 * إذا كان المستخدم موجودًا، يعرض المكوّن الأب؛ وإلا يعيد التوجيه لصفحة تسجيل الدخول.
 */
function ProtectedRoute({ children }) {
  // نحاول قراءة بيانات المستخدم الحالي من localStorage. إذا لم يكن موجودًا أو كان معطوبًا
  // يعتبر المستخدم غير مصادق، ويتم إعادة التوجيه إلى الجذر (صفحة تسجيل الدخول).
  let isAuthed = false;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
    isAuthed = !!(raw && JSON.parse(raw));
  } catch {
    // في حال وجود JSON غير صالح في localStorage نتجاهل الخطأ ونعتبر أنه غير مسجّل
    isAuthed = false;
  }
  return isAuthed ? children : <Navigate to="/" replace />;
}

// (جديد) صفحة عامة مؤقتة لأي فرع /monitor/:slug
function BranchMonitorPage() {
  const { slug } = useParams();

  const prettyName = (s) => {
    if (!s) return "";
    if (s.toLowerCase() === "qcs") return "QCS";
    const m = s.match(/^([a-zA-Z]+)(\d+)$/);
    if (m) return `${m[1].toUpperCase()} ${m[2]}`;
    return s.toUpperCase();
  };

  return (
    <div style={{ padding: "2rem", direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
      <h2>📝 صفحة تقارير الفرع: {prettyName(slug)}</h2>
      <p>هذه صفحة مؤقتة. يمكنك لاحقًا استبدالها بنموذج الفرع الحقيقي.</p>
      <ul style={{ marginTop: "1rem" }}>
        <li>أضف نموذج الإدخال الخاص بهذا الفرع هنا.</li>
        <li>أو استورد مكوّن الفرع النهائي عندما يكون جاهزًا.</li>
      </ul>
    </div>
  );
}

// (اختياري) صفحة 404
function NotFound() {
  return <div style={{ padding: 24, direction: "rtl" }}>الصفحة غير موجودة</div>;
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24, direction: "rtl" }}>جارٍ التحميل…</div>}>
      <Routes>
        {/* الجذر */}
        <Route path="/" element={<Login />} />
        <Route
          path="/inspection"
          element={
            <ProtectedRoute>
              <Inspection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />

        {/* monitor/* */}
        <Route path="/monitor">
          <Route
            index
            element={
              <ProtectedRoute>
                <DailyMonitorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="qcs"
            element={
              <ProtectedRoute>
                <QCSReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos19"
            element={
              <ProtectedRoute>
                <POS19Report />
              </ProtectedRoute>
            }
          />
          <Route
            path="qcs-raw-material-inspection"
            element={
              <ProtectedRoute>
                <QCSRawMaterialInspection />
              </ProtectedRoute>
            }
          />
          <Route
            path=":slug"
            element={
              <ProtectedRoute>
                <BranchMonitorPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ohc/* */}
        <Route path="/ohc">
          <Route
            index
            element={
              <ProtectedRoute>
                <OHCUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <OHCView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* admin/QCS raw material view */}
        <Route
          path="/qcs-raw-material-view"
          element={
            <ProtectedRoute>
              <QCSRawMaterialView />
            </ProtectedRoute>
          }
        />

        {/* returns/* */}
        <Route path="/returns">
          <Route
            index
            element={
              <ProtectedRoute>
                <Returns />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <ReturnView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* KPI */}
        <Route path="/kpi-login" element={<LoginKPI />} />
        <Route
          path="/kpi"
          element={
            <ProtectedRoute>
              <KPIDashboard />
            </ProtectedRoute>
          }
        />

        {/* finished/* */}
        <Route path="/finished">
          <Route
            path="data"
            element={
              <ProtectedRoute>
                <FinishedProductsData />
              </ProtectedRoute>
            }
          />
          <Route
            path="entry"
            element={
              <ProtectedRoute>
                <FinishedProductEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute>
                <FinishedProductReports />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* alias للمنتج النهائي */}
        <Route
          path="/finished-product-entry"
          element={
            <ProtectedRoute>
              <FinishedProductEntry />
            </ProtectedRoute>
          }
        />

        {/* 🆕 مسار السيارات */}
        <Route
          path="/cars"
          element={
            <ProtectedRoute>
              <CarIconPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
