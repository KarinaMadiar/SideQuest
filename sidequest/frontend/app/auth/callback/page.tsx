'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeCognitoCallback } = useAuth();

  const processedRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');
    const oauthErrorDesc = searchParams.get('error_description');

    if (oauthError) {
      setStatus('error');
      setErrorMessage(
        oauthErrorDesc
          ? `Помилка авторизації Cognito/Google: ${oauthErrorDesc}`
          : `Авторизацію перервано (${oauthError}).`
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage(
        'У відповіді OAuth відсутній код авторизації (code). Спробуйте увійти через сторінку входу ще раз.'
      );
      return;
    }

    (async () => {
      try {
        const redirectTarget = await completeCognitoCallback(code, state);
        setStatus('success');
        setTimeout(() => {
          router.replace(redirectTarget || '/');
        }, 400);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.message ||
            'Не вдалося завершити автентифікацію через Amazon Cognito. Перевірте налаштування та спробуйте знову.'
        );
      }
    })();
  }, [searchParams, completeCognitoCallback, router]);

  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center">
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-900 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Завершення входу через Google...
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Перевіряємо токен Amazon Cognito та синхронізуємо ваш профіль UCU SideQuest.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Вхід успішний!
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Перенаправляємо вас до UCU SideQuest...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Не вдалося виконати вхід
            </h1>
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-4 mt-4 text-left leading-relaxed">
              {errorMessage}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-semibold text-sm transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Повернутися до входу</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
              >
                На головну
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/80 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-brand-900 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Обробка перенаправлення OAuth...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
