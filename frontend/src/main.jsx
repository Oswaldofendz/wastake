import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './components/Toast.jsx';
import './i18n/index.js';
import './index.css';
if(import.meta.env.PROD&&'serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(error=>console.warn('[SW] registration failed',error));
  });
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);


