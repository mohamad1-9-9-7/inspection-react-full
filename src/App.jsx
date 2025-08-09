// App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
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

// (اختياري) مكون لحماية المسارات
function ProtectedRoute({ children }) {
  const isAuthed = true; // بدّلها بمنطق التحقق الحقيقي
  return isAuthed ? children : <Navigate to="/" replace />;
}

// (اختياري) صفحة 404
function NotFound() {
  return <div style={{ padding: 24 }}>الصفحة غير موجودة</div>;
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>جارٍ التحميل…</div>}>
      <Routes>
        {/* الجذر */}
        <Route path="/" element={<Login />} />
        <Route path="/inspection" element={<ProtectedRoute><Inspection /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/supervisor" element={<ProtectedRoute><SupervisorDashboard /></ProtectedRoute>} />

        {/* monitor/* */}
        <Route path="/monitor">
          <Route index element={<ProtectedRoute><DailyMonitorDashboard /></ProtectedRoute>} />
          <Route path="qcs" element={<ProtectedRoute><QCSReport /></ProtectedRoute>} />
          <Route path="pos19" element={<ProtectedRoute><POS19Report /></ProtectedRoute>} />
          <Route path="qcs-raw-material-inspection" element={<ProtectedRoute><QCSRawMaterialInspection /></ProtectedRoute>} />
        </Route>

        {/* ohc/* */}
        <Route path="/ohc">
          <Route index element={<ProtectedRoute><OHCUpload /></ProtectedRoute>} />
          <Route path="view" element={<ProtectedRoute><OHCView /></ProtectedRoute>} />
        </Route>

        {/* admin/QCS raw material view */}
        <Route path="/qcs-raw-material-view" element={<ProtectedRoute><QCSRawMaterialView /></ProtectedRoute>} />

        {/* returns/* */}
        <Route path="/returns">
          <Route index element={<ProtectedRoute><Returns /></ProtectedRoute>} />
          <Route path="view" element={<ProtectedRoute><ReturnView /></ProtectedRoute>} />
        </Route>

        {/* KPI */}
        <Route path="/kpi-login" element={<LoginKPI />} />
        <Route path="/kpi" element={<ProtectedRoute><KPIDashboard /></ProtectedRoute>} />

        {/* finished/* */}
        <Route path="/finished">
          <Route path="data" element={<ProtectedRoute><FinishedProductsData /></ProtectedRoute>} />
          <Route path="entry" element={<ProtectedRoute><FinishedProductEntry /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute><FinishedProductReports /></ProtectedRoute>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
