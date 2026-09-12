import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { QueryProvider } from './api/QueryProvider';
import { registerServiceWorker } from './sw/registerServiceWorker';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryProvider>
        <App />
      </QueryProvider>
    </React.StrictMode>
  );
}

if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    registerServiceWorker('/sw.js');
  });
}
