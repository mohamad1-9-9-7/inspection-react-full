import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './styles/globals.css';

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
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
