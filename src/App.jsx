// src/App.jsx
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import NotificationManager from "./components/NotificationManager";

// Lazy imports
const Login = lazy(() => import("./pages/Login"));
const Inspection = lazy(() => import("./pages/Inspection"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SupervisorDashboard = lazy(() => import("./pages/Supervisor"));

const DailyMonitorDashboard = lazy(() =>
  import("./pages/monitor/DailyMonitorDashboard")
);
const QCSReport = lazy(() => import("./pages/monitor/branches/QCSReport"));

// 🆕 Internal Audit – Reports Viewer
const InternalAuditReportsView = lazy(() =>
  import("./pages/monitor/InternalAuditReportsView")
);

const POS19Layout = lazy(() =>
  import("./pages/monitor/branches/pos19/POS19Layout")
);
const POS24Layout = lazy(() =>
  import("./pages/monitor/branches/pos24/POS24Layout")
);
const POS26Layout = lazy(() =>
  import("./pages/monitor/branches/pos26/POS26Layout")
);
const POS15Layout = lazy(() =>
  import("./pages/monitor/branches/pos15/POS15Layout")
);

// 🆕 ✅ POS 10 — التبويبات (إدخال)
const POS10Layout = lazy(() =>
  import("./pages/monitor/branches/pos 10/POS10Layout")
);

// 🆕 ✅ POS 10 — عرض التقارير (Viewer)
const POS10ReportsView = lazy(() =>
  import("./pages/monitor/branches/pos 10/POS10ReportsView")
);

// 🆕 ✅ POS 11 — إدخال
const POS11Layout = lazy(() =>
  import("./pages/monitor/branches/POS 11/POS11Layout")
);

// 🆕 ✅ POS 11 — عرض (Views Tabs)
const POS11ReportsViewLayout = lazy(() =>
  import("./pages/monitor/branches/POS 11/POS11ReportsViewLayout")
);

// 🆕 ✅ POS 19 — Viewer Hub
const POS19DailyView = lazy(() =>
  import("./pages/monitor/branches/pos19/POS19DailyView")
);

// ✅ إدخال + عرض FTR1
const FTR1Report = lazy(() =>
  import("./pages/monitor/branches/ftr1/FTR1Report")
);
const FTR1ReportView = lazy(() =>
  import("./pages/monitor/branches/ftr1/FTR1ReportView")
);

// ✅ إدخال + عرض FTR2
const FTR2Report = lazy(() =>
  import("./pages/monitor/branches/ftr2/FTR2Report")
);
const FTR2ReportView = lazy(() =>
  import("./pages/monitor/branches/ftr2/FTR2ReportView")
);

const OHCUpload = lazy(() => import("./pages/ohc/OHCUpload"));
const OHCView = lazy(() => import("./pages/ohc/OHCView"));

const QCSRawMaterialInspection = lazy(() =>
  import("./pages/monitor/branches/shipment_recc/QCSRawMaterialInspection")
);
const QCSRawMaterialView = lazy(() =>
  import("./pages/admin/QCSRawMaterialView")
);

// 🆕 ✅ تقرير عام موحّد (All Reports Summary)
const AllReportsView = lazy(() => import("./pages/admin/AllReportsView"));

const Returns = lazy(() => import("./pages/Returns"));
const ReturnView = lazy(() => import("./pages/ReturnView"));
const BrowseReturns = lazy(() => import("./pages/BrowseReturns"));
const ReturnsMenu = lazy(() => import("./ReturnsMenu"));

// ✅🆕 ENOC Returns (Input + Browse)
const ENOCReturnsInput = lazy(() => import("./pages/ENOC/ENOCReturnsInput"));
const ENOCReturnsBrowse = lazy(() => import("./pages/ENOC/ENOCReturnsBrowse"));

// ✅🆕 ENOC Returns (NEW Browse View Only - Red/Green)
const ENOCReturnsBrowseMenuView = lazy(() =>
  import("./pages/ENOC/ENOCReturnsBrowseMenuView")
);

const LoginKPI = lazy(() => import("./pages/LoginKPI"));
const KPIDashboard = lazy(() => import("./pages/KPIDashboard"));

// ✅ تم الإبقاء فقط على الإدخال والتقارير
const FinishedProductEntry = lazy(() =>
  import("./pages/finished/FinishedProductEntry")
);
const FinishedProductReports = lazy(() =>
  import("./pages/finished/FinishedProductReports")
);

// 🆕 سيارات
const CarIconPage = lazy(() => import("./pages/car/pages/CarIcon"));

// ✅✅✅ 🆕 موافقات السيارات (Input + View)
const CarApprovalsInput = lazy(() => import("./pages/car/pages/Approvals"));
const CarApprovalsView = lazy(() => import("./pages/car/pages/ApprovalsView"));

// 🆕 صيانة
const MaintenanceRequests = lazy(() =>
  import("./pages/maintenance/MaintenanceRequests")
);
const MaintenanceHome = lazy(() =>
  import("./pages/maintenance/MaintenanceHome")
);
const BrowseMaintenanceRequests = lazy(() =>
  import("./pages/maintenance/BrowseMaintenanceRequests")
);

// 🆕 🍖 Meat Daily
const MeatDailyInput = lazy(() => import("./pages/MeatDailyInput"));
const MeatDailyView = lazy(() => import("./pages/MeatDailyView"));
const BrowseMeatDaily = lazy(() => import("./pages/BrowseMeatDaily"));

/* 🆕 Production */
const ProductionHub = lazy(() =>
  import("./pages/monitor/branches/production/ProductionHub")
);
const PersonalHygienePRDInput = lazy(() =>
  import("./pages/monitor/branches/production/PersonalHygienePRDInput")
);
const CleaningChecklistPRDInput = lazy(() =>
  import("./pages/monitor/branches/production/CleaningChecklistPRDInput")
);
const PRDDefrostingRecordInput = lazy(() =>
  import("./pages/monitor/branches/production/PRDDefrostingRecordInput")
);

// 🆕 ✅ عرض تقارير الإنتاج
const PRDReportsView = lazy(() =>
  import("./pages/monitor/branches/production/PRDReportsView")
);

/* 🆕 مرتجعات الزبائن */
const CustomerReturns = lazy(() => import("./pages/CustomerReturns"));
const CustomerReturnView = lazy(() => import("./pages/CustomerReturnView"));
const BrowseCustomerReturns = lazy(() =>
  import("./pages/BrowseCustomerReturns")
);

// 🆕 ✅ عرض تقارير POS 15 (التبويبات)
const POS15ReportsView = lazy(() =>
  import("./pages/monitor/branches/pos15/POS15ReportsView")
);

// 🆕 ✅ عرض تقارير النظافة الشخصية POS 15
const POS15PersonalHygieneView = lazy(() =>
  import("./pages/monitor/branches/pos15/POS15PersonalHygieneView")
);

// 🆕 ✅ Fresh Chicken (عرض + إدخال)
const FreshChickenReportsView = lazy(() =>
  import("./pages/monitor/branches/qcs/FreshChickenReportsView")
);
const FreshChickenInter = lazy(() =>
  import("./pages/monitor/branches/qcs/FreshChickenInter")
);

/* 🆕 ✅ QCS — تبويبات عرض فقط (الجديدة) */
const QCSReportsView = lazy(() =>
  import("./pages/monitor/branches/qcs/QCSReportsView")
);

/* 🆕 🧾 Inventory Daily (Store) — إدخال + عرض */
const InventoryDailyInput = lazy(() =>
  import("./pages/store/InventoryDailyInput")
);
const InventoryDailyBrowse = lazy(() =>
  import("./pages/store/InventoryDailyBrowse")
);

// 🆕 🎓 Training Certificates – BFS / PIC / EFST
const TrainingCertificatesUpload = lazy(() =>
  import("./pages/BFS PIC EFST/TrainingCertificatesUpload")
);
const TrainingCertificatesView = lazy(() =>
  import("./pages/BFS PIC EFST/TrainingCertificatesView")
);

// 🆕 📘 ISO 22000 & HACCP Hub
const HaccpIsoMenu = lazy(() =>
  import("./pages/haccp and iso/HaccpIsoMenu")
);

// 📕 HACCP Manual — Master Reference Document
const FSMSManualView = lazy(() =>
  import("./pages/haccp and iso/FSMSManual/FSMSManualView")
);

// 📊 HACCP Linkage Dashboard
const HaccpDashboard = lazy(() =>
  import("./pages/haccp and iso/HaccpDashboard/HaccpDashboard")
);

// 📋 Management Review Meeting (MRM)
const MRMInput = lazy(() => import("./pages/haccp and iso/MRM/MRMInput"));
const MRMView  = lazy(() => import("./pages/haccp and iso/MRM/MRMView"));

// 🔍 Internal Audit
const InternalAuditInput = lazy(() => import("./pages/haccp and iso/InternalAudit/InternalAuditInput"));
const InternalAuditView  = lazy(() => import("./pages/haccp and iso/InternalAudit/InternalAuditView"));

// 🌡️ Calibration Log
const CalibrationInput = lazy(() => import("./pages/haccp and iso/Calibration/CalibrationInput"));
const CalibrationView  = lazy(() => import("./pages/haccp and iso/Calibration/CalibrationView"));

// 🌡 Internal Calibration Log (in-house ice-point/boiling/master-probe checks)
const InternalCalibrationInput = lazy(() => import("./pages/haccp and iso/InternalCalibration/InternalCalibrationInput"));
const InternalCalibrationView  = lazy(() => import("./pages/haccp and iso/InternalCalibration/InternalCalibrationView"));

// 📞 Customer Complaints (ISO 7.4 + 9.1.2)
const CustomerComplaintInput = lazy(() => import("./pages/haccp and iso/CustomerComplaints/CustomerComplaintInput"));
const CustomerComplaintView  = lazy(() => import("./pages/haccp and iso/CustomerComplaints/CustomerComplaintView"));

// 🎯 FSMS Objectives (ISO 6.2)
const ObjectivesInput = lazy(() => import("./pages/haccp and iso/Objectives/ObjectivesInput"));
const ObjectivesView  = lazy(() => import("./pages/haccp and iso/Objectives/ObjectivesView"));

// 📚 Document Master Register (ISO 7.5)
const DocumentRegisterInput = lazy(() => import("./pages/haccp and iso/DocumentRegister/DocumentRegisterInput"));
const DocumentRegisterView  = lazy(() => import("./pages/haccp and iso/DocumentRegister/DocumentRegisterView"));

// 📜 Food Safety Policy (ISO 5.2)
const FoodSafetyPolicyView = lazy(() => import("./pages/haccp and iso/FoodSafetyPolicy/FoodSafetyPolicyView"));

// 🚨 Real Product Recall (ISO 8.9.5)
const RealRecallInput = lazy(() => import("./pages/haccp and iso/RealRecall/RealRecallInput"));
const RealRecallView  = lazy(() => import("./pages/haccp and iso/RealRecall/RealRecallView"));

// 🌱 Continual Improvement Log (ISO 10.2)
const ContinualImprovementInput = lazy(() => import("./pages/haccp and iso/ContinualImprovement/ContinualImprovementInput"));
const ContinualImprovementView  = lazy(() => import("./pages/haccp and iso/ContinualImprovement/ContinualImprovementView"));

// 🪟 Glass & Brittle Plastic Register (Policy 2 + ISO 8.2 PRP)
const GlassRegisterInput = lazy(() => import("./pages/haccp and iso/GlassRegister/GlassRegisterInput"));
const GlassRegisterView  = lazy(() => import("./pages/haccp and iso/GlassRegister/GlassRegisterView"));

// 🎯 FSMS Risk Register (ISO 6.1 — closes SGS Stage 2 Major NC #2)
const RiskRegisterView = lazy(() => import("./pages/haccp and iso/RiskRegister/RiskRegisterView"));

// 💡 FSMS Opportunity Register (ISO 6.1 — actions to address risks AND opportunities)
const OpportunityRegisterView = lazy(() => import("./pages/haccp and iso/OpportunityRegister/OpportunityRegisterView"));

// 🔄 FSMS Change Management Log (ISO 6.3 — Planning of Changes)
const ChangeManagementLogView = lazy(() => import("./pages/haccp and iso/ChangeManagementLog/ChangeManagementLogView"));

// 🆕 📦 Product Details Input
const ProductDetailsInput = lazy(() =>
  import("./pages/haccp and iso/ProductDetailsInput")
);

// 🆕 📦 Product Details View (saved products)
const ProductDetailsView = lazy(() =>
  import("./pages/haccp and iso/ProductDetailsView")
);

// ✅ 🆕 Licenses & Contracts Input
const LicensesContractsInput = lazy(() =>
  import("./pages/haccp and iso/Licenses and Contracts/LicensesContractsInput")
);

// ✅ 🆕 Licenses & Contracts View
const LicensesContractsView = lazy(() =>
  import("./pages/haccp and iso/Licenses and Contracts/LicensesContractsView")
);

// ✅ 🆕 Municipality Inspection (Input + View)
const MunicipalityInspectionInput = lazy(() =>
  import("./pages/haccp and iso/MunicipalityInspectionInput")
);
const MunicipalityInspectionView = lazy(() =>
  import("./pages/haccp and iso/MunicipalityInspectionView")
);

// ✅🆕 Supplier Approval / Evaluation (PDF Literal Form)
const SupplierApproval = lazy(() =>
  import("./pages/haccp and iso/Supplier Approval/SupplierApproval")
);

// ✅🆕 Supplier Evaluation Hub (PARENT PAGE)
const SupplierEvaluationHub = lazy(() =>
  import("./pages/haccp and iso/Supplier Approval/SupplierEvaluationHub")
);

// ✅🆕 Supplier Evaluation Create (Generate link)
const SupplierEvaluationCreate = lazy(() =>
  import("./pages/haccp and iso/Supplier Approval/SupplierEvaluationCreate")
);

// ✅🆕 Supplier Evaluation Results (SUBMITTED)
const SupplierEvaluationResults = lazy(() =>
  import("./pages/haccp and iso/Supplier Approval/SupplierEvaluationResults")
);

// ✅🆕 Supplier Sent Links Tracker (sent / submitted / pending)
const SupplierSentLinks = lazy(() =>
  import("./pages/haccp and iso/Supplier Approval/SupplierSentLinks")
);

// ✅🆕 Public Supplier Page (token)
const SupplierEvaluationPublic = lazy(() =>
  import("./pages/haccp and iso/Supplier Approval/SupplierEvaluationPublic")
);

/* ✅🆕 التدريب الداخلي (جلسات تدريب + إنشاء + قائمة) */
const TrainingHome = lazy(() => import("./pages/training/TrainingHome"));
const TrainingSessionCreate = lazy(() =>
  import("./pages/training/TrainingSessionCreate")
);
const TrainingSessionsList = lazy(() =>
  import("./pages/training/TrainingSessionsList")
);
// ✅🆕 خطة التدريب السنوية (مصفوفة فروع × أشهر)
const TrainingAnnualPlan = lazy(() =>
  import("./pages/training/TrainingAnnualPlan")
);

// ✅🆕 صفحة المتدرّب (رابط/QR)
const TrainingQuizLink = lazy(() => import("./pages/training/TrainingQuizLink"));

// ✅ 🆕 SOP & sSOP Page
const SopSsopPage = lazy(() =>
  import("./pages/haccp and iso/SOP/SopSsopPage")
);

// ⚙️ Settings (Backup / Restore)
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));

// ⏰ Expiry Center — لوحة موحّدة لكل تواريخ الانتهاء
const ExpiryCenter = lazy(() => import("./pages/admin/ExpiryCenter"));

// 🔄 Mock Recall — تمرين السحب الوهمي (HACCP/ISO 22000)
const MockRecallInput    = lazy(() => import("./pages/haccp and iso/MockRecall/MockRecallInput"));
const MockRecallView     = lazy(() => import("./pages/haccp and iso/MockRecall/MockRecallView"));
const MockRecallSettings = lazy(() => import("./pages/haccp and iso/MockRecall/MockRecallSettings"));

// 🎯 CCP Monitoring — مراقبة نقاط التحكم الحرجة
const CCPInput    = lazy(() => import("./pages/haccp and iso/CCPMonitoring/CCPInput"));
const CCPView     = lazy(() => import("./pages/haccp and iso/CCPMonitoring/CCPView"));
const CCPSettings = lazy(() => import("./pages/haccp and iso/CCPMonitoring/CCPSettings"));

// 🦺 HSE — Health, Safety & Environment
const HSEMenu                  = lazy(() => import("./pages/hse/HSEMenu"));
const HSEVisionMission         = lazy(() => import("./pages/hse/HSEVisionMission"));
const HSELegalFramework        = lazy(() => import("./pages/hse/HSELegalFramework"));
const HSEOrgStructure          = lazy(() => import("./pages/hse/HSEOrgStructure"));
const HSEPolicies              = lazy(() => import("./pages/hse/HSEPolicies"));
const HSERiskRegister          = lazy(() => import("./pages/hse/HSERiskRegister"));
const HSESOPs                  = lazy(() => import("./pages/hse/HSESOPs"));
const HSEIncidentReport        = lazy(() => import("./pages/hse/HSEIncidentReport"));
const HSENearMiss              = lazy(() => import("./pages/hse/HSENearMiss"));
const HSEDailyInspection       = lazy(() => import("./pages/hse/HSEDailyInspection"));
const HSEWorkPermit            = lazy(() => import("./pages/hse/HSEWorkPermit"));
const HSEConfinedSpacePermit   = lazy(() => import("./pages/hse/HSEConfinedSpacePermit"));
const HSEExcavationPermit      = lazy(() => import("./pages/hse/HSEExcavationPermit"));
const HSEMonthlySafetyReport   = lazy(() => import("./pages/hse/HSEMonthlySafetyReport"));
const HSEInjurySummary         = lazy(() => import("./pages/hse/HSEInjurySummary"));
const HSEPreliminaryAccident   = lazy(() => import("./pages/hse/HSEPreliminaryAccident"));
const HSEFatalAccident         = lazy(() => import("./pages/hse/HSEFatalAccident"));
const HSEFinalAccident         = lazy(() => import("./pages/hse/HSEFinalAccident"));
const HSENCR                   = lazy(() => import("./pages/hse/HSENCR"));
const HSEDailyReport           = lazy(() => import("./pages/hse/HSEDailyReport"));
const HSEFireEquipment         = lazy(() => import("./pages/hse/HSEFireEquipment"));
const HSEToolboxMeeting        = lazy(() => import("./pages/hse/HSEToolboxMeeting"));
const HSEFireExtinguisherLocations = lazy(() => import("./pages/hse/HSEFireExtinguisherLocations"));
const HSEEmergencyContacts     = lazy(() => import("./pages/hse/HSEEmergencyContacts"));
const HSEHandPowerTools        = lazy(() => import("./pages/hse/HSEHandPowerTools"));
const HSELadderSafety          = lazy(() => import("./pages/hse/HSELadderSafety"));
const HSEWelfare               = lazy(() => import("./pages/hse/HSEWelfare"));
const HSEForkliftInspection    = lazy(() => import("./pages/hse/HSEForkliftInspection"));
const HSETemperatureLog        = lazy(() => import("./pages/hse/HSETemperatureLog"));
const HSEShipmentReceiving     = lazy(() => import("./pages/hse/HSEShipmentReceiving"));
const HSECleaningLog           = lazy(() => import("./pages/hse/HSECleaningLog"));
const HSESwabsLog              = lazy(() => import("./pages/hse/HSESwabsLog"));
const HSEPestControl           = lazy(() => import("./pages/hse/HSEPestControl"));
const HSEEquipmentMaintenance  = lazy(() => import("./pages/hse/HSEEquipmentMaintenance"));
const HSEMedicalChecks         = lazy(() => import("./pages/hse/HSEMedicalChecks"));
const HSEEvacuationDrills      = lazy(() => import("./pages/hse/HSEEvacuationDrills"));
const HSEPPELog                = lazy(() => import("./pages/hse/HSEPPELog"));
const HSEContractorsVisitors   = lazy(() => import("./pages/hse/HSEContractorsVisitors"));
const HSEWasteLog              = lazy(() => import("./pages/hse/HSEWasteLog"));
const HSECAPATracker           = lazy(() => import("./pages/hse/HSECAPATracker"));
const HSETrainingMatrix        = lazy(() => import("./pages/hse/HSETrainingMatrix"));
const HSELicenses              = lazy(() => import("./pages/hse/HSELicenses"));
const HSEKPIs                  = lazy(() => import("./pages/hse/HSEKPIs"));
const HSEBudget                = lazy(() => import("./pages/hse/HSEBudget"));
const HSEImplementationPlan    = lazy(() => import("./pages/hse/HSEImplementationPlan"));
const HSESuccessFactors        = lazy(() => import("./pages/hse/HSESuccessFactors"));

/** حماية المسارات الخاصة */
/** Redirects /old-path/t/:token → /new-path/:token preserving the real token value */
function TokenRedirect({ to }) {
  const { token } = useParams();
  return <Navigate to={`${to}/${encodeURIComponent(token || "")}`} replace />;
}

function ProtectedRoute({ children }) {
  let isAuthed = false;
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
    isAuthed = !!(raw && JSON.parse(raw));
  } catch {
    isAuthed = false;
  }
  return isAuthed ? children : <Navigate to="/" replace />;
}

// صفحة مؤقتة لأي فرع /monitor/:slug
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
    <div
      style={{
        padding: "2rem",
        direction: "rtl",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <h2>📝 صفحة تقارير الفرع / Branch Reports Page: {prettyName(slug)}</h2>
      <p>
        هذه صفحة مؤقتة. يمكنك لاحقًا استبدالها بنموذج الفرع الحقيقي. / This is a
        temporary page; you can later replace it with the real branch form.
      </p>
    </div>
  );
}

// 404
function NotFound() {
  return (
    <div style={{ padding: 24, direction: "rtl" }}>
      الصفحة غير موجودة / Page not found
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, direction: "rtl" }}>
          جارٍ التحميل… / Loading…
        </div>
      }
    >
      <NotificationManager />
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
        {/* ⏰ Expiry Center — مركز تواريخ الانتهاء */}
        <Route
          path="/admin/expiry-center"
          element={
            <ProtectedRoute>
              <ExpiryCenter />
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

        {/* ✅ التدريب الداخلي */}
        <Route
          path="/training"
          element={
            <ProtectedRoute>
              <TrainingHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/create"
          element={
            <ProtectedRoute>
              <TrainingSessionCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training/sessions"
          element={
            <ProtectedRoute>
              <TrainingSessionsList />
            </ProtectedRoute>
          }
        />
        {/* ✅🆕 خطة التدريب السنوية */}
        <Route
          path="/training/annual-plan"
          element={
            <ProtectedRoute>
              <TrainingAnnualPlan />
            </ProtectedRoute>
          }
        />

        {/* ✅🆕 رابط المتدرّب (بدون تسجيل دخول) — (SESSION + SLNO) */}
        <Route
          path="/training/quiz/:sessionId/:slNo"
          element={<TrainingQuizLink />}
        />

        {/* ✅🆕 رابط المتدرّب (بدون تسجيل دخول) — (TOKEN) */}
        <Route path="/t/:token" element={<TrainingQuizLink />} />

        {/* ✅🆕 Alias إضافي للتوكن (بدون تسجيل دخول) */}
        <Route path="/training/quiz/:token" element={<TrainingQuizLink />} />

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

          {/* 🆕 Internal Audit – Reports Viewer */}
          <Route
            path="internal-audit"
            element={
              <ProtectedRoute>
                <InternalAuditReportsView />
              </ProtectedRoute>
            }
          />

          {/* 🆕 FTR1 إدخال */}
          <Route
            path="ftr1"
            element={
              <ProtectedRoute>
                <FTR1Report />
              </ProtectedRoute>
            }
          />

          {/* 🆕 Production Hub + إدخالاته */}
          <Route
            path="production"
            element={
              <ProtectedRoute>
                <ProductionHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/personal-hygiene-prd/input"
            element={
              <ProtectedRoute>
                <PersonalHygienePRDInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/cleaning-checklist-prd/input"
            element={
              <ProtectedRoute>
                <CleaningChecklistPRDInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/prd-defrosting-record/input"
            element={
              <ProtectedRoute>
                <PRDDefrostingRecordInput />
              </ProtectedRoute>
            }
          />

          {/* موجودة سابقًا */}
          <Route
            path="qcs"
            element={
              <ProtectedRoute>
                <QCSReport />
              </ProtectedRoute>
            }
          />

          {/* ✅ POS — إدخال */}
          <Route
            path="pos19"
            element={
              <ProtectedRoute>
                <POS19Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos24"
            element={
              <ProtectedRoute>
                <POS24Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos26"
            element={
              <ProtectedRoute>
                <POS26Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos15"
            element={
              <ProtectedRoute>
                <POS15Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos10"
            element={
              <ProtectedRoute>
                <POS10Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos11"
            element={
              <ProtectedRoute>
                <POS11Layout />
              </ProtectedRoute>
            }
          />

          {/* ✅ POS 10 — Viewer */}
          <Route
            path="pos10/reports"
            element={
              <ProtectedRoute>
                <POS10ReportsView />
              </ProtectedRoute>
            }
          />

          {/* 🆕 عرض تقارير النظافة الشخصية POS15 */}
          <Route
            path="pos15/personal-hygiene"
            element={
              <ProtectedRoute>
                <POS15PersonalHygieneView />
              </ProtectedRoute>
            }
          />

          {/* FTR2 إدخال */}
          <Route
            path="ftr2"
            element={
              <ProtectedRoute>
                <FTR2Report />
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

          {/* 🆕 Fresh Chicken: صفحة الإدخال */}
          <Route
            path="branches/qcs/fresh-chicken-inter"
            element={
              <ProtectedRoute>
                <FreshChickenInter />
              </ProtectedRoute>
            }
          />

          {/* يُترك في النهاية */}
          <Route
            path=":slug"
            element={
              <ProtectedRoute>
                <BranchMonitorPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* admin/* */}
        <Route
          path="/admin/ftr1"
          element={
            <ProtectedRoute>
              <FTR1ReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ftr2"
          element={
            <ProtectedRoute>
              <FTR2ReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/production"
          element={
            <ProtectedRoute>
              <PRDReportsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pos15"
          element={
            <ProtectedRoute>
              <POS15ReportsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 POS 19 — صفحة العرض */}
        <Route
          path="/admin/pos19"
          element={
            <ProtectedRoute>
              <POS19DailyView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 POS 11 — صفحة العرض (Views Tabs) */}
        <Route
          path="/admin/pos11"
          element={
            <ProtectedRoute>
              <POS11ReportsViewLayout />
            </ProtectedRoute>
          }
        />

        {/* 🆕 POS 10 — صفحة العرض (Viewer) */}
        <Route
          path="/admin/pos10"
          element={
            <ProtectedRoute>
              <POS10ReportsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 Fresh Chicken: صفحة العرض (Viewer) */}
        <Route
          path="/admin/monitor/branches/qcs/fresh-chicken-reports"
          element={
            <ProtectedRoute>
              <FreshChickenReportsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 ✅ QCS — صفحة تبويبات العرض فقط */}
        <Route
          path="/admin/monitor/branches/qcs/reports"
          element={
            <ProtectedRoute>
              <QCSReportsView />
            </ProtectedRoute>
          }
        />
        {/* 🆕 Aliases */}
        <Route
          path="/admin/monitor/branches/qcs"
          element={<Navigate to="/admin/monitor/branches/qcs/reports" replace />}
        />
        <Route
          path="/admin/monitor/qcs"
          element={
            <ProtectedRoute>
              <QCSReportsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/qcs"
          element={
            <ProtectedRoute>
              <QCSReportsView />
            </ProtectedRoute>
          }
        />

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

        {/* 🆕 ✅ All Reports Summary */}
        <Route
          path="/admin/all-reports-view"
          element={
            <ProtectedRoute>
              <AllReportsView />
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
            path="menu"
            element={
              <ProtectedRoute>
                <ReturnsMenu />
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
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <BrowseReturns />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ✅✅✅ ENOC Returns routes */}
        <Route path="/enoc-returns">
          <Route
            path="input"
            element={
              <ProtectedRoute>
                <ENOCReturnsInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <ENOCReturnsBrowse />
              </ProtectedRoute>
            }
          />

          {/* ✅ NEW: Browse View Only (Red/Green) */}
          <Route
            path="browse-view"
            element={
              <ProtectedRoute>
                <ENOCReturnsBrowseMenuView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* returns-customers/* */}
        <Route path="/returns-customers">
          <Route
            path="new"
            element={
              <ProtectedRoute>
                <CustomerReturns />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <CustomerReturnView />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <BrowseCustomerReturns />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* meat-daily/* */}
        <Route path="/meat-daily">
          <Route
            path="input"
            element={
              <ProtectedRoute>
                <MeatDailyInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <MeatDailyView />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <BrowseMeatDaily />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* inventory-daily/* */}
        <Route path="/inventory-daily">
          <Route
            path="input"
            element={
              <ProtectedRoute>
                <InventoryDailyInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <InventoryDailyBrowse />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 🆕 📘 ISO 22000 & HACCP Hub */}
        <Route
          path="/haccp-iso"
          element={
            <ProtectedRoute>
              <HaccpIsoMenu />
            </ProtectedRoute>
          }
        />
        <Route path="/iso-haccp" element={<Navigate to="/haccp-iso" replace />} />

        {/* 📕 HACCP Manual (Master Document) */}
        <Route
          path="/haccp-iso/haccp-manual"
          element={
            <ProtectedRoute>
              <FSMSManualView />
            </ProtectedRoute>
          }
        />
        {/* Backward-compat redirect */}
        <Route
          path="/haccp-iso/fsms-manual"
          element={<Navigate to="/haccp-iso/haccp-manual" replace />}
        />

        {/* 📊 HACCP Linkage Dashboard */}
        <Route
          path="/haccp-iso/haccp-dashboard"
          element={
            <ProtectedRoute>
              <HaccpDashboard />
            </ProtectedRoute>
          }
        />

        {/* 📋 Management Review Meeting (MRM) */}
        <Route
          path="/haccp-iso/mrm"
          element={
            <ProtectedRoute>
              <MRMInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/mrm/view"
          element={
            <ProtectedRoute>
              <MRMView />
            </ProtectedRoute>
          }
        />

        {/* 🔍 Internal Audit */}
        <Route
          path="/haccp-iso/internal-audit"
          element={
            <ProtectedRoute>
              <InternalAuditInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/internal-audit/view"
          element={
            <ProtectedRoute>
              <InternalAuditView />
            </ProtectedRoute>
          }
        />

        {/* 🌡️ Calibration Log */}
        <Route
          path="/haccp-iso/calibration"
          element={
            <ProtectedRoute>
              <CalibrationInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/calibration/view"
          element={
            <ProtectedRoute>
              <CalibrationView />
            </ProtectedRoute>
          }
        />

        {/* 🌡 Internal Calibration Log (in-house verification, all branches) */}
        <Route
          path="/haccp-iso/internal-calibration"
          element={
            <ProtectedRoute>
              <InternalCalibrationInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/internal-calibration/view"
          element={
            <ProtectedRoute>
              <InternalCalibrationView />
            </ProtectedRoute>
          }
        />

        {/* 📞 Customer Complaints (ISO 7.4 + 9.1.2) */}
        <Route
          path="/haccp-iso/customer-complaints"
          element={
            <ProtectedRoute>
              <CustomerComplaintInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/customer-complaints/view"
          element={
            <ProtectedRoute>
              <CustomerComplaintView />
            </ProtectedRoute>
          }
        />

        {/* 🎯 FSMS Objectives (ISO 6.2) */}
        <Route
          path="/haccp-iso/objectives"
          element={
            <ProtectedRoute>
              <ObjectivesInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/objectives/view"
          element={
            <ProtectedRoute>
              <ObjectivesView />
            </ProtectedRoute>
          }
        />

        {/* 📚 Document Master Register (ISO 7.5) */}
        <Route
          path="/haccp-iso/document-register"
          element={
            <ProtectedRoute>
              <DocumentRegisterInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/document-register/view"
          element={
            <ProtectedRoute>
              <DocumentRegisterView />
            </ProtectedRoute>
          }
        />

        {/* 📜 Food Safety Policy (ISO 5.2) */}
        <Route
          path="/haccp-iso/food-safety-policy"
          element={
            <ProtectedRoute>
              <FoodSafetyPolicyView />
            </ProtectedRoute>
          }
        />

        {/* 🚨 Real Product Recall (ISO 8.9.5) */}
        <Route
          path="/haccp-iso/real-recall"
          element={
            <ProtectedRoute>
              <RealRecallInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/real-recall/view"
          element={
            <ProtectedRoute>
              <RealRecallView />
            </ProtectedRoute>
          }
        />

        {/* 🌱 Continual Improvement Log (ISO 10.2) */}
        <Route
          path="/haccp-iso/continual-improvement"
          element={
            <ProtectedRoute>
              <ContinualImprovementInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/continual-improvement/view"
          element={
            <ProtectedRoute>
              <ContinualImprovementView />
            </ProtectedRoute>
          }
        />

        {/* 🪟 Glass & Brittle Plastic Register (Policy 2 + ISO 8.2 PRP) */}
        <Route
          path="/haccp-iso/glass-register"
          element={
            <ProtectedRoute>
              <GlassRegisterInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/glass-register/view"
          element={
            <ProtectedRoute>
              <GlassRegisterView />
            </ProtectedRoute>
          }
        />

        {/* 🎯 FSMS Risk Register (ISO 6.1 — closes SGS Stage 2 Major NC #2) */}
        <Route
          path="/haccp-iso/risk-register"
          element={
            <ProtectedRoute>
              <RiskRegisterView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/risk-register/view"
          element={
            <ProtectedRoute>
              <RiskRegisterView />
            </ProtectedRoute>
          }
        />

        {/* 💡 FSMS Opportunity Register (ISO 6.1 — companion to Risk Register) */}
        <Route
          path="/haccp-iso/opportunity-register"
          element={
            <ProtectedRoute>
              <OpportunityRegisterView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/opportunity-register/view"
          element={
            <ProtectedRoute>
              <OpportunityRegisterView />
            </ProtectedRoute>
          }
        />

        {/* 🔄 FSMS Change Management Log (ISO 6.3 — Planning of Changes) */}
        <Route
          path="/haccp-iso/change-management"
          element={
            <ProtectedRoute>
              <ChangeManagementLogView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/change-management/view"
          element={
            <ProtectedRoute>
              <ChangeManagementLogView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 Product Details */}
        <Route
          path="/haccp-iso/product-details"
          element={
            <ProtectedRoute>
              <ProductDetailsInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/product-details/view"
          element={
            <ProtectedRoute>
              <ProductDetailsView />
            </ProtectedRoute>
          }
        />

        {/* ✅ Licenses & Contracts */}
        <Route
          path="/haccp-iso/licenses-contracts"
          element={
            <ProtectedRoute>
              <LicensesContractsInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/licenses-contracts/view"
          element={
            <ProtectedRoute>
              <LicensesContractsView />
            </ProtectedRoute>
          }
        />

        {/* 🔄 Mock Recall — Traceability Drill */}
        <Route
          path="/haccp-iso/mock-recall"
          element={
            <ProtectedRoute>
              <MockRecallInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/mock-recall/view"
          element={
            <ProtectedRoute>
              <MockRecallView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/mock-recall/settings"
          element={
            <ProtectedRoute>
              <MockRecallSettings />
            </ProtectedRoute>
          }
        />

        {/* 🎯 CCP Monitoring */}
        <Route
          path="/haccp-iso/ccp-monitoring"
          element={
            <ProtectedRoute>
              <CCPInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/ccp-monitoring/view"
          element={
            <ProtectedRoute>
              <CCPView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/ccp-monitoring/settings"
          element={
            <ProtectedRoute>
              <CCPSettings />
            </ProtectedRoute>
          }
        />

        {/* ✅✅ Municipality Inspection */}
        <Route
          path="/haccp-iso/dm-inspection"
          element={
            <ProtectedRoute>
              <MunicipalityInspectionInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/dm-inspection/view"
          element={
            <ProtectedRoute>
              <MunicipalityInspectionView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/haccp-iso/dm-inspection/input"
          element={<Navigate to="/haccp-iso/dm-inspection" replace />}
        />

        {/* ✅✅ Supplier Evaluation HUB (Parent) */}
        <Route
          path="/haccp-iso/supplier-evaluation"
          element={
            <ProtectedRoute>
              <SupplierEvaluationHub />
            </ProtectedRoute>
          }
        />

        {/* ✅ Supplier Evaluation: Create */}
        <Route
          path="/haccp-iso/supplier-evaluation/create"
          element={
            <ProtectedRoute>
              <SupplierEvaluationCreate />
            </ProtectedRoute>
          }
        />

        {/* ✅✅✅ Supplier Evaluation: RESULTS (SUBMITTED) */}
        <Route
          path="/haccp-iso/supplier-evaluation/results"
          element={
            <ProtectedRoute>
              <SupplierEvaluationResults />
            </ProtectedRoute>
          }
        />

        {/* ✅🆕 Supplier Evaluation: SENT LINKS TRACKER */}
        <Route
          path="/haccp-iso/supplier-evaluation/sent-links"
          element={
            <ProtectedRoute>
              <SupplierSentLinks />
            </ProtectedRoute>
          }
        />

        {/* ✅✅✅ PUBLIC SUPPLIER LINK (NO login) */}
        <Route
          path="/supplier-approval/t/:token"
          element={<SupplierEvaluationPublic />}
        />
        <Route
          path="/supplier-approval/:token"
          element={<SupplierEvaluationPublic />}
        />
        <Route
          path="/supplier-evaluation/t/:token"
          element={<TokenRedirect to="/supplier-approval/t" />}
        />
        <Route
          path="/supplier-evaluation/:token"
          element={<TokenRedirect to="/supplier-approval" />}
        />

        {/* ✅✅ Supplier Self-Assessment Form (PDF Literal Form) */}
        <Route
          path="/haccp-iso/supplier-approval"
          element={
            <ProtectedRoute>
              <SupplierApproval />
            </ProtectedRoute>
          }
        />

        {/* ✅ 🆕 SOP & sSOP */}
        <Route
          path="/haccp-iso/sop-ssop"
          element={
            <ProtectedRoute>
              <SopSsopPage />
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/finished-product-reports"
          element={
            <ProtectedRoute>
              <FinishedProductReports />
            </ProtectedRoute>
          }
        />
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

        {/* ✅✅✅ مسارات موافقات السيارات */}
        <Route
          path="/car/approvals"
          element={
            <ProtectedRoute>
              <CarApprovalsInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/car/approvals-view"
          element={
            <ProtectedRoute>
              <CarApprovalsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 مسار طلبات الصيانة */}
        <Route
          path="/maintenance-requests"
          element={
            <ProtectedRoute>
              <MaintenanceRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-browse"
          element={
            <ProtectedRoute>
              <BrowseMaintenanceRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-home"
          element={
            <ProtectedRoute>
              <MaintenanceHome />
            </ProtectedRoute>
          }
        />

        {/* 🆕 🎓 Training Certificates */}
        <Route
          path="/training-certificates"
          element={
            <ProtectedRoute>
              <TrainingCertificatesUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training-certificates/view"
          element={
            <ProtectedRoute>
              <TrainingCertificatesView />
            </ProtectedRoute>
          }
        />

        {/* 🦺 HSE — Health, Safety & Environment */}
        <Route path="/hse" element={<ProtectedRoute><HSEMenu /></ProtectedRoute>} />
        <Route path="/hse/vision-mission" element={<ProtectedRoute><HSEVisionMission /></ProtectedRoute>} />
        <Route path="/hse/legal-framework" element={<ProtectedRoute><HSELegalFramework /></ProtectedRoute>} />
        <Route path="/hse/org-structure" element={<ProtectedRoute><HSEOrgStructure /></ProtectedRoute>} />
        <Route path="/hse/policies" element={<ProtectedRoute><HSEPolicies /></ProtectedRoute>} />
        <Route path="/hse/risk-register" element={<ProtectedRoute><HSERiskRegister /></ProtectedRoute>} />
        <Route path="/hse/sops" element={<ProtectedRoute><HSESOPs /></ProtectedRoute>} />
        <Route path="/hse/incident-report" element={<ProtectedRoute><HSEIncidentReport /></ProtectedRoute>} />
        <Route path="/hse/near-miss" element={<ProtectedRoute><HSENearMiss /></ProtectedRoute>} />
        <Route path="/hse/daily-inspection" element={<ProtectedRoute><HSEDailyInspection /></ProtectedRoute>} />
        <Route path="/hse/work-permit" element={<ProtectedRoute><HSEWorkPermit /></ProtectedRoute>} />
        <Route path="/hse/confined-space-permit" element={<ProtectedRoute><HSEConfinedSpacePermit /></ProtectedRoute>} />
        <Route path="/hse/excavation-permit" element={<ProtectedRoute><HSEExcavationPermit /></ProtectedRoute>} />
        <Route path="/hse/monthly-safety-report" element={<ProtectedRoute><HSEMonthlySafetyReport /></ProtectedRoute>} />
        <Route path="/hse/injury-summary" element={<ProtectedRoute><HSEInjurySummary /></ProtectedRoute>} />
        <Route path="/hse/preliminary-accident" element={<ProtectedRoute><HSEPreliminaryAccident /></ProtectedRoute>} />
        <Route path="/hse/fatal-accident" element={<ProtectedRoute><HSEFatalAccident /></ProtectedRoute>} />
        <Route path="/hse/final-accident" element={<ProtectedRoute><HSEFinalAccident /></ProtectedRoute>} />
        <Route path="/hse/ncr" element={<ProtectedRoute><HSENCR /></ProtectedRoute>} />
        <Route path="/hse/daily-report" element={<ProtectedRoute><HSEDailyReport /></ProtectedRoute>} />
        <Route path="/hse/fire-equipment" element={<ProtectedRoute><HSEFireEquipment /></ProtectedRoute>} />
        <Route path="/hse/toolbox-meeting" element={<ProtectedRoute><HSEToolboxMeeting /></ProtectedRoute>} />
        <Route path="/hse/fire-extinguisher-locations" element={<ProtectedRoute><HSEFireExtinguisherLocations /></ProtectedRoute>} />
        <Route path="/hse/emergency-contacts" element={<ProtectedRoute><HSEEmergencyContacts /></ProtectedRoute>} />
        <Route path="/hse/hand-power-tools" element={<ProtectedRoute><HSEHandPowerTools /></ProtectedRoute>} />
        <Route path="/hse/ladder-safety" element={<ProtectedRoute><HSELadderSafety /></ProtectedRoute>} />
        <Route path="/hse/welfare" element={<ProtectedRoute><HSEWelfare /></ProtectedRoute>} />
        <Route path="/hse/forklift-inspection" element={<ProtectedRoute><HSEForkliftInspection /></ProtectedRoute>} />
        <Route path="/hse/temperature-log" element={<ProtectedRoute><HSETemperatureLog /></ProtectedRoute>} />
        <Route path="/hse/shipment-receiving" element={<ProtectedRoute><HSEShipmentReceiving /></ProtectedRoute>} />
        <Route path="/hse/cleaning-log" element={<ProtectedRoute><HSECleaningLog /></ProtectedRoute>} />
        <Route path="/hse/swabs-log" element={<ProtectedRoute><HSESwabsLog /></ProtectedRoute>} />
        <Route path="/hse/pest-control" element={<ProtectedRoute><HSEPestControl /></ProtectedRoute>} />
        <Route path="/hse/equipment-maintenance" element={<ProtectedRoute><HSEEquipmentMaintenance /></ProtectedRoute>} />
        <Route path="/hse/medical-checks" element={<ProtectedRoute><HSEMedicalChecks /></ProtectedRoute>} />
        <Route path="/hse/evacuation-drills" element={<ProtectedRoute><HSEEvacuationDrills /></ProtectedRoute>} />
        <Route path="/hse/ppe-log" element={<ProtectedRoute><HSEPPELog /></ProtectedRoute>} />
        <Route path="/hse/contractors-visitors" element={<ProtectedRoute><HSEContractorsVisitors /></ProtectedRoute>} />
        <Route path="/hse/waste-log" element={<ProtectedRoute><HSEWasteLog /></ProtectedRoute>} />
        <Route path="/hse/capa-tracker" element={<ProtectedRoute><HSECAPATracker /></ProtectedRoute>} />
        <Route path="/hse/training-matrix" element={<ProtectedRoute><HSETrainingMatrix /></ProtectedRoute>} />
        <Route path="/hse/licenses" element={<ProtectedRoute><HSELicenses /></ProtectedRoute>} />
        <Route path="/hse/kpis" element={<ProtectedRoute><HSEKPIs /></ProtectedRoute>} />
        <Route path="/hse/budget" element={<ProtectedRoute><HSEBudget /></ProtectedRoute>} />
        <Route path="/hse/implementation-plan" element={<ProtectedRoute><HSEImplementationPlan /></ProtectedRoute>} />
        <Route path="/hse/success-factors" element={<ProtectedRoute><HSESuccessFactors /></ProtectedRoute>} />

        {/* ⚙️ Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}