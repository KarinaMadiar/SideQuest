'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { OrganizationBrief } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { EVENT_CATEGORIES } from '@/lib/utils';
import { ArrowLeft, PlusCircle, AlertCircle, Trash2, Sparkles } from 'lucide-react';

interface SpeakerInput {
  name: string;
  short_bio: string;
  position: string;
  linkedin_url: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [organizations, setOrganizations] = useState<OrganizationBrief[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('lecture');
  const [organizationId, setOrganizationId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [whyAttend, setWhyAttend] = useState('');
  const [preparationNotes, setPreparationNotes] = useState('');
  const [speakers, setSpeakers] = useState<SpeakerInput[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Default dates: in 3 days from 16:00 to 18:00
    const start = new Date();
    start.setDate(start.getDate() + 3);
    start.setHours(16, 0, 0, 0);
    const startStr = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    const end = new Date(start);
    end.setHours(18, 0, 0, 0);
    const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setStartsAt(startStr);
    setEndsAt(endStr);

    // Fetch organizations
    api.organizations.list().then(setOrganizations).catch(console.error);
  }, []);

  const addSpeaker = () => {
    setSpeakers([...speakers, { name: '', short_bio: '', position: '', linkedin_url: '' }]);
  };

  const removeSpeaker = (index: number) => {
    setSpeakers(speakers.filter((_, i) => i !== index));
  };

  const updateSpeaker = (index: number, field: keyof SpeakerInput, val: string) => {
    const updated = [...speakers];
    updated[index][field] = val;
    setSpeakers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
      setError('Лише користувачі з роллю організатора або адміністратора можуть створювати події.');
      return;
    }

    const startObj = new Date(startsAt);
    const endObj = new Date(endsAt);
    if (endObj <= startObj) {
      setError('Час завершення події повинен бути пізніше за час початку.');
      return;
    }

    setLoading(true);

    try {
      const validSpeakers = speakers
        .filter((s) => s.name.trim() && s.short_bio.trim())
        .map((s, idx) => ({
          name: s.name.trim(),
          short_bio: s.short_bio.trim(),
          position: s.position.trim() || null,
          linkedin_url: s.linkedin_url.trim() || null,
          display_order: idx + 1,
        }));

      const created = await api.events.create({
        title,
        description,
        category,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        location,
        organization_id: organizationId || null,
        registration_url: registrationUrl.trim() || null,
        why_attend: whyAttend.trim() || null,
        preparation_notes: preparationNotes.trim() || null,
        speakers: validSpeakers.length > 0 ? validSpeakers : undefined,
      });

      router.push(`/events/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Не вдалося створити подію.');
    } finally {
      setLoading(false);
    }
  };

  if (user && user.role !== 'organizer' && user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-xl mb-4">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-900">Доступ обмежено</h2>
        <p className="text-sm text-slate-500 mt-2">
          Створювати університетські події можуть лише організатори та адміністратори.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Повернутися на головну
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Назад до стрічки</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-gold-500 text-white flex items-center justify-center font-bold text-xl">
            🎓
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Створити університетську подію
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Публікація заходу від імені студентської організації або підрозділу УКУ
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Назва події *
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр.: Кар'єрна панель: Від стажування до Senior в IT"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Загальний опис події *
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишіть зміст, цілі та формат заходу..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 leading-relaxed"
            />
          </div>

          {/* Category & Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Категорія події *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
              >
                {Object.entries(EVENT_CATEGORIES).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Організація / Підрозділ УКУ
              </label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
              >
                <option value="">Без прив'язки до організації</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location & Registration Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Локація проведення *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Центр Шептицького, ауд. 002"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Посилання на зовнішню реєстрацію (необов'язково)
              </label>
              <input
                type="url"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="https://forms.gle/... або сайт події"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Час початку * (Europe/Kyiv)
              </label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Час завершення * (Europe/Kyiv)
              </label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Networking fields */}
          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm">Спеціальні блоки підготовки до події</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Чому варто відвідати? (Практична користь, для кого захід, що отримає учасник)
              </label>
              <textarea
                rows={3}
                value={whyAttend}
                onChange={(e) => setWhyAttend(e.target.value)}
                placeholder="Напр.: 1. Зрозумієте реальні вимоги до джуніорів. 2. Отримаєте фідбек на резюме від рекрутерів."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Як підготуватися до події? (Що взяти, що прочитати заздалегідь)
              </label>
              <textarea
                rows={3}
                value={preparationNotes}
                onChange={(e) => setPreparationNotes(e.target.value)}
                placeholder="Напр.: Роздрукуйте актуальне резюме та підготуйте 2 запитання до спікера."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
              />
            </div>
          </div>

          {/* Dynamic Speakers Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Спікери події</h3>
                <p className="text-xs text-slate-500">Додайте інформацію про запрошених гостей (необов'язково)</p>
              </div>
              <button
                type="button"
                onClick={addSpeaker}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-gold-600" />
                Додати спікера
              </button>
            </div>

            {speakers.map((sp, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative space-y-3">
                <button
                  type="button"
                  onClick={() => removeSpeaker(idx)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-rose-600 p-1"
                  title="Видалити спікера"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ім'я спікера *</label>
                    <input
                      type="text"
                      required
                      value={sp.name}
                      onChange={(e) => updateSpeaker(idx, 'name', e.target.value)}
                      placeholder="Олександр Дем'яненко"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gold-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Посада / Компанія</label>
                    <input
                      type="text"
                      value={sp.position}
                      onChange={(e) => updateSpeaker(idx, 'position', e.target.value)}
                      placeholder="Staff Software Engineer"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gold-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Коротка біографія *</label>
                  <textarea
                    rows={2}
                    required
                    value={sp.short_bio}
                    onChange={(e) => updateSpeaker(idx, 'short_bio', e.target.value)}
                    placeholder="Експерт з розподілених систем, випускник УКУ..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gold-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Посилання на LinkedIn / Профіль</label>
                  <input
                    type="url"
                    value={sp.linkedin_url}
                    onChange={(e) => updateSpeaker(idx, 'linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gold-500 bg-white"
                  />
                </div>
              </div>
            ))}
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
              className="px-6 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-bold text-sm transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Публікація...' : 'Опублікувати подію'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
