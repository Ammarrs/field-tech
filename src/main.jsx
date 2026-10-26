import React from 'react';
import ReactDOM from 'react-dom/client';
import { isConfigured } from './lib/supabase';
import { AuthProvider } from './auth';
import Root from './Root';
import './styles.css';

function SetupNeeded() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <strong>إعدادات Supabase ناقصة</strong>
        <p className="meta">
          اعمل ملف <code>.env.local</code> في جذر المشروع وحط فيه الإعدادات، وأعد تشغيل npm run dev.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isConfigured ? (
      <AuthProvider>
        <Root />
      </AuthProvider>
    ) : (
      <SetupNeeded />
    )}
  </React.StrictMode>
);