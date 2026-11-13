import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import { AuthProvider } from './lib/auth';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" toastOptions={{
          duration: 3500,
          style: { background: '#241F1B', color: '#fff', borderRadius: '999px', fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 14, padding: '10px 18px' },
          success: { iconTheme: { primary: '#F5A477', secondary: '#241F1B' } },
          error: { iconTheme: { primary: '#F8E3DF', secondary: '#A8443A' } },
        }} />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
