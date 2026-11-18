'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDateKyiv } from '@/lib/utils';
import { User, Shield, CheckCircle2, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [visibilitySettings, setVisibilitySettings] = useState<'public' | 'campus_only' | 'hidden'>('public');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      setName(user.name);
      setProfileDescription(user.profile_description || '');
      setVisibilitySettings(user.visibility_settings);
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      await api.users.updateMe({
        name,
        profile_description: profileDescription || null,
        visibility_settings: visibilitySettings,
      });
      await refreshUser();
      setMsg({ type: 'success', text: 'Профіль успішно оновлено!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Не вдалося зберегти зміни' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Завантаження профілю...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-6 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Назад до стрічки</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-900 text-gold-400 font-extrabold text-2xl flex items-center justify-center shadow-sm">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{user.email}</span>
              <span>•</span>
              <span className="font-semibold text-brand-800 capitalize">
                {user.role === 'admin' ? 'Адміністратор' : user.role === 'organizer' ? 'Організатор' : 'Студент'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Зареєстровано: {formatDateKyiv(user.created_at)}
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              msg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="opacity-70 hover:opacity-100 font-bold">
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ім'я та прізвище *
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Короткий опис про себе / Інтереси
            </label>
            <textarea
              rows={3}
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              placeholder="Спеціальність, курс, захоплення (напр., біг, шахи, програмування на Python)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 leading-relaxed"
            />
          </div>

          {/* Privacy Settings */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4 text-brand-800" />
              <span>Налаштування приватності профілю</span>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibilitySettings === 'public'}
                  onChange={() => setVisibilitySettings('public')}
                  className="mt-0.5 text-brand-900 focus:ring-brand-900"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Публічний профіль (Рекомендовано)</div>
                  <div className="text-[11px] text-slate-500">Ваше ім'я відображається у списках учасників SideQuests та подій.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="radio"
                  name="visibility"
                  value="campus_only"
                  checked={visibilitySettings === 'campus_only'}
                  onChange={() => setVisibilitySettings('campus_only')}
                  className="mt-0.5 text-brand-900 focus:ring-brand-900"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Лише для авторизованих користувачів УКУ</div>
                  <div className="text-[11px] text-slate-500">Гості платформи без входу не бачать ваше ім'я у списках.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="radio"
                  name="visibility"
                  value="hidden"
                  checked={visibilitySettings === 'hidden'}
                  onChange={() => setVisibilitySettings('hidden')}
                  className="mt-0.5 text-brand-900 focus:ring-brand-900"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Анонімний режим</div>
                  <div className="text-[11px] text-slate-500">Ваше ім'я замінюється на "Анонімний учасник" у публічних списках.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Збереження...' : 'Зберегти зміни'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
