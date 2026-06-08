import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './styles/globals.css';

// ── تطبيق الـ Theme المحفوظ قبل ما React يرسم (بيمنع وميض الـ Light لحظة الفتح) ──
try {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
} catch { /* ignore — private browsing or blocked storage */ }

// لما نشتغل داخل Electron (file://) لازم HashRouter لأن BrowserRouter بيكسر
const isElectron =
  (typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' ||
      /electron/i.test(window.navigator.userAgent) ||
      window.electronAPI?.isElectron));

const Router = isElectron ? HashRouter : BrowserRouter;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </Router>
  </React.StrictMode>
);
