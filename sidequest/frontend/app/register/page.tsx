'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { GoogleSignInButton } from '@/components/google-signin-button';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      await register({ name, email, password, role });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Не вдалося зареєструватися. Перевірте введені дані.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gold-500 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-sm mb-3">
            ✨
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Реєстрація в SideQuest
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Створіть профіль та долучайтеся до життя університету
          </p>
        </div>

        {/* Google / Cognito Federated Sign-In */}
        <div className="mb-6">
          <GoogleSignInButton disabled={loading} />
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            або заповніть анкету
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Ім&apos;я та прізвище
            </label>
            <input
              id="register-name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Остап Мельник"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Електронна пошта УКУ
            </label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@ucu.edu.ua"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Пароль
            </label>
            <input
              id="register-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Мінімум 6 символів"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Тип облікового запису
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Тип облікового запису">
              <button
                type="button"
                aria-pressed={role === 'student'}
                onClick={() => setRole('student')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                  role === 'student'
                    ? 'bg-brand-900 border-brand-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🎓 Студент
              </button>
              <button
                type="button"
                aria-pressed={role === 'organizer'}
                onClick={() => setRole('organizer')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                  role === 'organizer'
                    ? 'bg-gold-600 border-gold-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🏛️ Організатор
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Організатори можуть публікувати офіційні події та заходи від підрозділів УКУ.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gold-600 hover:bg-gold-700 text-white font-semibold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Реєстрація...' : 'Зареєструватися'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Вже маєте акаунт?{' '}
          <Link href="/login" className="text-brand-900 font-bold hover:underline">
            Увійти
          </Link>
        </div>
      </div>
    </div>
  );
}
