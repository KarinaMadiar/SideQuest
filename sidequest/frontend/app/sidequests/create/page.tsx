'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { SIDEQUEST_CATEGORIES } from '@/lib/utils';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CreateSideQuestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coffee');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Default to tomorrow 10:00 Kyiv time for convenient creation
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setStartsAt(localIso);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!user) {
      setError('Для створення SideQuest необхідно увійти в систему.');
      return;
    }

    // Client-side date check
    const startObj = new Date(startsAt);
    const now = new Date();
    if (startObj <= now) {
      setError('Час початку активності не може бути в минулому.');
      return;
    }

    if (endsAt) {
      const endObj = new Date(endsAt);
      if (endObj <= startObj) {
        setError('Час завершення повинен бути пізніше за час початку.');
        return;
      }
    }

    setLoading(true);

    try {
      const created = await api.sidequests.create({
        title,
        description,
        category,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        location,
        capacity: Number(capacity),
      });

      router.push(`/sidequests/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Не вдалося створити SideQuest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Назад до стрічки</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-brand-900 text-gold-400 flex items-center justify-center font-bold text-xl">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Створити новий SideQuest
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Опишіть активність, час, локацію та запрошуйте спільноту УКУ
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="sq-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Назва SideQuest *
            </label>
            <input
              id="sq-title"
              type="text"
              required
              minLength={3}
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр.: Кава та обговорення стартап-хакатону"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="sq-description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Опис активності *
            </label>
            <textarea
              id="sq-description"
              required
              rows={4}
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Розкажіть детальніше: чим займатиметеся, кого шукаєте, що взяти з собою..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 leading-relaxed"
            />
          </div>

          {/* Category & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sq-category" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Категорія *
              </label>
              <select
                id="sq-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white"
              >
                {Object.entries(SIDEQUEST_CATEGORIES).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sq-capacity" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Кількість учасників (включно з вами) *
              </label>
              <input
                id="sq-capacity"
                type="number"
                required
                min={2}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Від 2 до 50 осіб</span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="sq-location" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Локація на кампусі або в місті *
            </label>
            <input
              id="sq-location"
              type="text"
              required
              minLength={2}
              maxLength={255}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Напр.: Центр Шептицького, кабінка 304 або Трапезна"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sq-starts-at" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Час початку * (Europe/Kyiv)
              </label>
              <input
                id="sq-starts-at"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>

            <div>
              <label htmlFor="sq-ends-at" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Час завершення (необов&apos;язково)
              </label>
              <input
                id="sq-ends-at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Скасувати
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-sm transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? 'Публікація...' : 'Опублікувати SideQuest'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
