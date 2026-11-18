'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { SideQuest, Event } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { SideQuestCard } from '@/components/sidequest-card';
import { EventCard } from '@/components/event-card';
import { Compass, Calendar, PlusCircle, CheckCircle, Sparkles } from 'lucide-react';

export default function MyActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'joined' | 'created' | 'events'>('joined');
  const [joinedSidequests, setJoinedSidequests] = useState<SideQuest[]>([]);
  const [createdSidequests, setCreatedSidequests] = useState<SideQuest[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [joinedRes, createdRes, eventsRes] = await Promise.all([
        api.sidequests.getMySidequests('joined'),
        api.sidequests.getMySidequests('created'),
        api.events.getMyEvents(),
      ]);
      setJoinedSidequests(joinedRes.items);
      setCreatedSidequests(createdRes.items);
      setAttendingEvents(eventsRes.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Завантаження ваших активностей...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Мої активності
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Керуйте своїми SideQuests та подіями, які плануєте відвідати
          </p>
        </div>

        <Link
          href="/sidequests/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-900 text-white font-semibold text-xs hover:bg-brand-800 transition shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Створити новий SideQuest</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl w-fit">
        <button
          onClick={() => setTab('joined')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'joined' ? 'bg-white text-brand-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Приєднані SideQuests ({joinedSidequests.length})</span>
        </button>

        <button
          onClick={() => setTab('created')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'created' ? 'bg-white text-brand-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Створені мною ({createdSidequests.length})</span>
        </button>

        <button
          onClick={() => setTab('events')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            tab === 'events' ? 'bg-white text-gold-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Події ({attendingEvents.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'joined' ? (
        joinedSidequests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
              🤝
            </div>
            <h3 className="text-base font-bold text-slate-900">Ви ще не приєдналися до жодного SideQuest</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Перегляньте актуальні пропозиції у стрічці та знайдіть компанію на каву чи спільне навчання!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold hover:bg-brand-800 transition"
            >
              Перейти до стрічки
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinedSidequests.map((sq) => (
              <SideQuestCard key={sq.id} sidequest={sq} />
            ))}
          </div>
        )
      ) : tab === 'created' ? (
        createdSidequests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-900">Ви ще не створювали SideQuests</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Організуйте прогулянку, настільні ігри або спільну роботу над дедлайном.
            </p>
            <Link
              href="/sidequests/create"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold hover:bg-brand-800 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Створити перший SideQuest
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {createdSidequests.map((sq) => (
              <SideQuestCard key={sq.id} sidequest={sq} />
            ))}
          </div>
        )
      ) : attendingEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
            🎓
          </div>
          <h3 className="text-base font-bold text-slate-900">Ви ще не обрали подій для відвідування</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Ознайомтеся з університетськими лекціями, воркшопами та кар'єрними зустрічами.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 bg-gold-600 text-white rounded-xl text-xs font-bold hover:bg-gold-700 transition"
          >
            Переглянути події
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attendingEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
