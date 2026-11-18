'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Не вдалося увійти. Перевірте email та пароль.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    try {
      await login({ email: demoEmail, password: demoPass });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Не вдалося увійти під демо-акаунтом.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-900 text-gold-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-sm mb-3">
            ⚡
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Вхід у UCU SideQuest
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Знаходь події та однодумців у спільноті УКУ
          </p>
        </div>

        {/* Demo Accounts Bar */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Швидкий вхід для демонстрації (1 клік):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('student@ucu.edu.ua', 'StudentPass123!')}
              disabled={loading}
              className="py-1.5 px-2 bg-white hover:bg-amber-100/70 text-slate-800 border border-amber-300 rounded-lg text-xs font-medium text-center transition shadow-2xs"
            >
              🎓 Студент
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('organizer@ucu.edu.ua', 'OrganizerPass123!')}
              disabled={loading}
              className="py-1.5 px-2 bg-white hover:bg-amber-100/70 text-slate-800 border border-amber-300 rounded-lg text-xs font-medium text-center transition shadow-2xs"
            >
              🏛️ Організатор
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@ucu.edu.ua', 'AdminPass123!')}
              disabled={loading}
              className="py-1.5 px-2 bg-white hover:bg-amber-100/70 text-slate-800 border border-amber-300 rounded-lg text-xs font-medium text-center transition shadow-2xs"
            >
              🛡️ Адмін
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Електронна пошта
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@ucu.edu.ua"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 focus:border-brand-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 focus:border-brand-900 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-semibold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Вхід...' : 'Увійти'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Ще не маєте акаунту?{' '}
          <Link href="/register" className="text-gold-600 font-bold hover:underline">
            Зареєструватися
          </Link>
        </div>
      </div>
    </div>
  );
}
