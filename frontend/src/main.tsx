import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { QueryProvider } from './api/QueryProvider';
import { AuthProvider } from './context/AuthContext';
import { registerServiceWorker } from './sw/registerServiceWorker';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryProvider>
    </React.StrictMode>
  );
}

if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    registerServiceWorker('/sw.js');
  });
}
