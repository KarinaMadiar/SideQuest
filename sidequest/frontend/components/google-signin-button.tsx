'use client';

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { AlertCircle, Info, Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  returnTo?: string;
  disabled?: boolean;
  label?: string;
}

export function GoogleSignInButton({
  returnTo = '/',
  disabled = false,
  label = 'Продовжити з Google (Continue with Google)',
}: GoogleSignInButtonProps) {
  const { cognitoConfig, loginWithGoogle } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = cognitoConfig.isConfigured;

  const handleClick = async () => {
    if (!isConfigured || disabled || redirecting) return;
    setError(null);
    setRedirecting(true);
    try {
      await loginWithGoogle(returnTo);
    } catch (err: any) {
      setError(err.message || 'Не вдалося перенаправити до Amazon Cognito / Google.');
      setRedirecting(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={!isConfigured || disabled || redirecting}
        aria-disabled={!isConfigured || disabled || redirecting}
        className={`w-full py-2.5 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-3 shadow-2xs ${
          isConfigured
            ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 cursor-pointer'
            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
        }`}
      >
        {redirecting ? (
          <Loader2 className="w-4 h-4 animate-spin text-brand-900" />
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill={isConfigured ? '#4285F4' : '#94A3B8'}
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill={isConfigured ? '#34A853' : '#94A3B8'}
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill={isConfigured ? '#FBBC05' : '#CBD5E1'}
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
            />
            <path
              fill={isConfigured ? '#EA4335' : '#94A3B8'}
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
        )}
        <span>
          {redirecting ? 'Перенаправлення до Amazon Cognito...' : label}
        </span>
      </button>

      {!isConfigured && (
        <div
          role="status"
          className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed"
        >
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700">
              Вхід через Google ще не налаштовано (Google sign-in is not configured yet).
            </span>{' '}
            Для активації вкажіть публічні параметри Amazon Cognito Hosted UI у змінних середовища (див.{' '}
            <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[10px]">.env.example</code>). Для локальної роботи використовуйте вхід за email та паролем.
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
