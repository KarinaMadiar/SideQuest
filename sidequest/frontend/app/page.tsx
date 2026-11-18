'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SideQuest, Event, SideQuestCategory, EventCategory } from '@/types';
import { SideQuestCard } from '@/components/sidequest-card';
import { EventCard } from '@/components/event-card';
import { useAuth } from '@/features/auth/AuthContext';
import { SIDEQUEST_CATEGORIES, EVENT_CATEGORIES } from '@/lib/utils';
import { Search, Compass, Calendar, PlusCircle, Sparkles, Filter, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'sidequests' | 'events'>('sidequests');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [sidequests, setSidequests] = useState<SideQuest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSidequests = async () => {
    try {
      const res = await api.sidequests.list({
        search: search || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        size: 50,
      });
      setSidequests(res.items);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.events.list({
        search: search || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        size: 50,
      });
      setEvents(res.items);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    if (activeTab === 'sidequests') {
      await fetchSidequests();
    } else {
      await fetchEvents();
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedCategory, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleJoinSidequest = async (id: string) => {
    if (!user) {
      alert('Будь ласка, увійдіть у свій акаунт, щоб приєднатися до SideQuest.');
      return;
    }
    setJoiningId(id);
    setActionError(null);
    try {
      const updated = await api.sidequests.join(id);
      setSidequests((prev) => prev.map((sq) => (sq.id === id ? updated : sq)));
    } catch (err: any) {
      setActionError(err.message || 'Не вдалося приєднатися');
    } finally {
      setJoiningId(null);
    }
  };

  const handleAttendEvent = async (id: string) => {
    if (!user) {
      alert('Будь ласка, увійдіть у свій акаунт, щоб позначити участь у події.');
      return;
    }
    setAttendingId(id);
    setActionError(null);
    try {
      const updated = await api.events.attend(id);
      setEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev)));
    } catch (err: any) {
      setActionError(err.message || 'Не вдалося зареєструватися');
    } finally {
      setAttendingId(null);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 text-white p-8 md:p-12 relative overflow-hidden shadow-lg border border-brand-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>UCU SideQuest Community</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Знаходь активності та людей, з якими по дорозі.
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-300 leading-relaxed font-normal">
            Хочеш піти на каву, зіграти в настільний теніс чи підготуватися до дедлайну?
            Створюй спонтанні SideQuests або долучайся до університетських подій кампусу.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/sidequests/create"
              className="px-5 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold text-sm transition shadow-md flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Створити SideQuest</span>
            </Link>
            <a
              href="#feed"
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition backdrop-blur border border-white/15"
            >
              Переглянути що відбувається
            </a>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">
            Закрити
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div id="feed" className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl w-fit">
            <button
              onClick={() => {
                setActiveTab('sidequests');
                setSelectedCategory('all');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'sidequests'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>SideQuests ({sidequests.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('events');
                setSelectedCategory('all');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'events'
                  ? 'bg-white text-gold-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Події УКУ ({events.length})</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Оновити</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'sidequests'
                    ? 'Пошук SideQuest за назвою, описом або локацією (напр., кава, теніс)...'
                    : 'Пошук подій за темою, спікером або локацією...'
                }
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-900 bg-white shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Фільтр за статусом"
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-900 shadow-2xs"
              >
                <option value="all">Усі статуси</option>
                {activeTab === 'sidequests' ? (
                  <>
                    <option value="open">Лише відкриті</option>
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
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Усі категорії
            </button>
            {activeTab === 'sidequests'
              ? Object.entries(SIDEQUEST_CATEGORIES).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => handleCategoryChange(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                      selectedCategory === key
                        ? 'bg-brand-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </button>
                ))
              : Object.entries(EVENT_CATEGORIES).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => handleCategoryChange(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                      selectedCategory === key
                        ? 'bg-gold-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </button>
                ))}
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
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
                За вказаними фільтрами чи пошуком активностей немає. Спробуйте змінити фільтри або створіть власний SideQuest!
              </p>
              <div className="mt-6">
                <Link
                  href="/sidequests/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-900 text-white font-semibold text-sm hover:bg-brand-800 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  Створити перший SideQuest
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
              За вашим запитом подій немає. Спробуйте очистити пошуковий запит.
            </p>
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
      </div>
    </div>
  );
}
