'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { SideQuest, Event } from '@/types';
import { SideQuestCard } from '@/components/sidequest-card';
import { EventCard } from '@/components/event-card';
import { useAuth } from '@/features/auth/AuthContext';
import { SIDEQUEST_CATEGORIES, EVENT_CATEGORIES } from '@/lib/utils';
import {
  Search,
  Compass,
  Calendar,
  PlusCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'sidequests' | 'events'>('sidequests');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [sidequests, setSidequests] = useState<SideQuest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sqRes, evRes] = await Promise.all([
        api.sidequests.list({
          search: search || undefined,
          category: activeTab === 'sidequests' && selectedCategory !== 'all' ? selectedCategory : undefined,
          status: activeTab === 'sidequests' && selectedStatus !== 'all' ? selectedStatus : undefined,
          size: 50,
        }),
        api.events.list({
          search: search || undefined,
          category: activeTab === 'events' && selectedCategory !== 'all' ? selectedCategory : undefined,
          status: activeTab === 'events' && selectedStatus !== 'all' ? selectedStatus : undefined,
          size: 50,
        }),
      ]);
      setSidequests(sqRes.items);
      setEvents(evRes.items);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Не вдалося завантажити стрічку активностей. Перевірте з\'єднання із сервером.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, selectedStatus, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 220);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleJoinSidequest = async (id: string) => {
    if (!user) {
      setFeedback({
        type: 'error',
        text: 'Щоб приєднатися до SideQuest, будь ласка, увійдіть у свій обліковий запис.',
      });
      router.push('/login');
      return;
    }
    setJoiningId(id);
    setFeedback(null);
    try {
      const updated = await api.sidequests.join(id);
      setSidequests((prev) => prev.map((sq) => (sq.id === id ? updated : sq)));
      setFeedback({
        type: 'success',
        text: `Ви успішно приєдналися до «${updated.title}»!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Не вдалося приєднатися до SideQuest.',
      });
    } finally {
      setJoiningId(null);
    }
  };

  const handleAttendEvent = async (id: string) => {
    if (!user) {
      setFeedback({
        type: 'error',
        text: 'Щоб позначити участь у події УКУ, будь ласка, увійдіть у свій обліковий запис.',
      });
      router.push('/login');
      return;
    }
    setAttendingId(id);
    setFeedback(null);
    try {
      const updated = await api.events.attend(id);
      setEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev)));
      setFeedback({
        type: 'success',
        text: `Ви позначили, що плануєте відвідати «${updated.title}»!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Не вдалося зареєструватися на подію.',
      });
    } finally {
      setAttendingId(null);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters = search.trim() !== '' || selectedCategory !== 'all' || selectedStatus !== 'all';

  return (
    <div className="space-y-8">
      {/* Meetup-Inspired Hero & Prominent Discovery Search */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 text-white p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-lg border border-brand-800">
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>Платформа подій та зустрічей спільноти УКУ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Знаходь людей, ідеї та події на кампусі УКУ.
          </h1>
          <p className="mt-3.5 text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Шукаєш компанію на ранкову каву у Трапезній, партнерів для настільного тенісу чи готуєшся до відкритої лекції? Обирай те, що тобі близьке, або ініціюй власну зустріч.
          </p>

          {/* Prominent Meetup-style Search Bar inside Hero */}
          <div className="mt-6 bg-white/95 backdrop-blur p-2 rounded-2xl shadow-lg border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-3xl">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 ml-3.5 flex-shrink-0" />
              <label htmlFor="hero-search-input" className="sr-only">
                Пошук активностей та подій
              </label>
              <input
                id="hero-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Шукати за темою, локацією чи назвою (напр., кава, теніс, Шептицького, IT)..."
                className="w-full pl-3 pr-8 py-2.5 text-sm text-slate-900 bg-transparent placeholder:text-slate-400 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Очистити пошук"
                  className="p-1.5 text-slate-400 hover:text-slate-700 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href="#feed"
                className="px-5 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm transition text-center whitespace-nowrap"
              >
                Знайти активності
              </a>
              <Link
                href="/sidequests/create"
                className="px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Створити SideQuest</span>
              </Link>
            </div>
          </div>

          {/* Two Content Types Visual Guide */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('sidequests');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className={`text-left p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                activeTab === 'sidequests'
                  ? 'bg-white/15 border-gold-400/60 shadow-xs'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-brand-800 border border-brand-600 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Студентські SideQuests</span>
                  <span className="px-2 py-0.5 rounded-full bg-brand-700 text-[10px] text-gold-300">
                    {sidequests.length}
                  </span>
                </div>
                <p className="text-slate-300 mt-0.5 leading-snug">
                  Спонтанні неформальні зустрічі у невеликих групах: кава, спорт, прогулянки, підготовка до пар.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('events');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className={`text-left p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                activeTab === 'events'
                  ? 'bg-white/15 border-gold-400/60 shadow-xs'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-gold-500/20 border border-gold-400/40 text-gold-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Події та можливості УКУ</span>
                  <span className="px-2 py-0.5 rounded-full bg-gold-500/30 text-[10px] text-gold-200">
                    {events.length}
                  </span>
                </div>
                <p className="text-slate-300 mt-0.5 leading-snug">
                  Лекції, воркшопи та кар&apos;єрні заходи від університетських центрів і студентських організацій.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100 px-2 py-1"
          >
            Закрити
          </button>
        </div>
      )}

      {/* Main Discovery Feed Area */}
      <section id="feed" className="space-y-6">
        {/* Tabs & Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/75 rounded-2xl w-fit" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sidequests'}
              onClick={() => {
                setActiveTab('sidequests');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'sidequests'
                  ? 'bg-white text-brand-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4 text-brand-700" />
              <span>SideQuests ({sidequests.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'events'}
              onClick={() => {
                setActiveTab('events');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'events'
                  ? 'bg-white text-gold-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-gold-600" />
              <span>Події УКУ ({events.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="status-filter-select" className="text-xs font-semibold text-slate-500">
              Статус:
            </label>
            <select
              id="status-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Фільтр за статусом"
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-900 shadow-2xs"
            >
              <option value="all">Усі статуси</option>
              {activeTab === 'sidequests' ? (
                <>
                  <option value="open">Лише відкриті (є місця)</option>
                  <option value="full">Заповнені</option>
                  <option value="canceled">Скасовані</option>
                </>
              ) : (
                <>
                  <option value="published">Опубліковані</option>
                  <option value="canceled">Скасовані</option>
                </>
              )}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Скинути фільтри</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Оновити</span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label="Фільтр за категорією">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Усі категорії
          </button>
          {activeTab === 'sidequests'
            ? Object.entries(SIDEQUEST_CATEGORIES).map(([key, info]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    selectedCategory === key
                      ? 'bg-brand-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))
            : Object.entries(EVENT_CATEGORIES).map(([key, info]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    selectedCategory === key
                      ? 'bg-gold-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'sidequests' ? (
          sidequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
                🔍
              </div>
              <h3 className="text-lg font-bold text-slate-900">SideQuests не знайдено</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                За вказаними фільтрами чи пошуком активностей немає. Спробуйте скинути фільтри або створіть власний SideQuest!
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                  >
                    Скинути фільтри
                  </button>
                )}
                <Link
                  href="/sidequests/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-900 text-white font-semibold text-sm hover:bg-brand-800 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  Створити SideQuest
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sidequests.map((sq) => (
                <SideQuestCard
                  key={sq.id}
                  sidequest={sq}
                  onJoin={handleJoinSidequest}
                  loadingJoin={joiningId === sq.id}
                />
              ))}
            </div>
          )
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
              🎓
            </div>
            <h3 className="text-lg font-bold text-slate-900">Подій не знайдено</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              За вашим запитом подій немає. Спробуйте очистити пошуковий запит або змінити категорію.
            </p>
            {hasActiveFilters && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Скинути фільтри
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onAttend={handleAttendEvent}
                loadingAttend={attendingId === ev.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Community Callout Section (Meetup-inspired Bottom Banner) */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-900 border border-brand-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Маєш ідею для спільної справи на кампусі?
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Не чекай особливої нагоди — створи власний SideQuest за хвилину та запроси студентів УКУ на пробіжку, обговорення книги або підготовку до іспиту.
            </p>
          </div>
        </div>
        <Link
          href="/sidequests/create"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-sm transition shadow-xs whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ініціювати SideQuest</span>
        </Link>
      </section>
    </div>
  );
}
