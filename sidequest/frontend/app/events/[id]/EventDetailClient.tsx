'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Event } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDateKyiv, EVENT_CATEGORIES, STATUS_LABELS } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  ExternalLink,
  Building2,
  Sparkles,
  HelpCircle,
  Linkedin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rawId = params?.id as string | undefined;
  const [id, setId] = useState<string>(rawId && rawId !== 'view' ? rawId : '');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const pathId = pathParts[1];
      const queryId = new URLSearchParams(window.location.search).get('id');
      if (pathId && pathId !== 'view' && pathId !== 'create') {
        setId(pathId);
      } else if (queryId) {
        setId(queryId);
      } else if (rawId && rawId !== 'view') {
        setId(rawId);
      }
    }
  }, [rawId]);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEvent = async (targetId: string) => {
    try {
      const data = await api.events.getById(targetId);
      setEvent(data);
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити подію');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadEvent(id);
    }
  }, [id]);

  const handleAttend = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      const updated = await api.events.attend(id);
      setEvent(updated);
      setActionMsg({ type: 'success', text: 'Ви успішно позначили, що плануєте відвідати цю подію!' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Не вдалося зареєструватися' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      const updated = await api.events.leave(id);
      setEvent(updated);
      setActionMsg({ type: 'success', text: 'Участь у події скасовано.' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Не вдалося скасувати участь' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="w-10 h-10 border-4 border-gold-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Завантаження деталей події...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900">Подію не знайдено</h2>
        <p className="text-sm text-slate-500 mt-2">{error || 'Можливо, подію було видалено або посилання застаріло.'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Повернутися до стрічки
        </Link>
      </div>
    );
  }

  const cat = EVENT_CATEGORIES[event.category] || { label: event.category, icon: '📌' };
  const statusInfo = STATUS_LABELS[event.status] || { label: event.status, className: 'bg-slate-100 text-slate-700' };
  const isCanceled = event.status === 'canceled';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Назад до списку подій</span>
      </Link>

      {actionMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm font-medium ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-50 text-gold-900 border border-gold-200">
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {event.title}
        </h1>

        {event.organization && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-600 font-medium">
            <Building2 className="w-4 h-4 text-gold-600" />
            <span>Організатор: <strong className="text-slate-900">{event.organization.name}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-gold-600 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Дата та час</div>
              <div className="font-bold text-slate-900">{formatDateKyiv(event.starts_at)}</div>
              <div className="text-xs text-slate-500">до {formatDateKyiv(event.ends_at)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-gold-600 shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Локація</div>
              <div className="font-bold text-slate-900">{event.location}</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Опис події</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
            {event.description}
          </p>
        </div>

        {event.registration_url && (
          <div className="mt-6 p-4 rounded-2xl bg-brand-50/80 border border-brand-200 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-brand-950 text-sm">Офіційна реєстрація на подію</div>
              <div className="text-xs text-brand-700 mt-0.5">Організатор надав зовнішнє посилання для підтвердження участі</div>
            </div>
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-semibold text-xs transition shadow-sm flex-shrink-0"
            >
              <span>Зареєструватися</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-5 h-5 text-slate-400" />
            <span>
              Планують відвідати: <strong className="text-slate-900">{event.attendee_count}</strong> людей
            </span>
          </div>

          <div className="flex items-center gap-3">
            {event.is_attending ? (
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-sm transition disabled:opacity-50"
              >
                Скасувати участь
              </button>
            ) : !isCanceled ? (
              <button
                onClick={handleAttend}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-bold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {actionLoading ? 'Обробка...' : 'Я планую піти'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gold-100 text-gold-800 flex items-center justify-center font-bold text-sm">
              💡
            </div>
            <h2 className="text-base font-bold text-slate-900">Чому варто відвідати?</h2>
          </div>

          {event.why_attend ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.why_attend}
            </p>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                Організатор ще не додав розширений опис користі події.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-sm">
              📝
            </div>
            <h2 className="text-base font-bold text-slate-900">Як підготуватися до події?</h2>
          </div>

          {event.preparation_notes ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.preparation_notes}
            </p>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                Спеціальних матеріалів для підготовки не вимагається.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Спікери та гості заходу ({event.speakers.length})
        </h2>

        {event.speakers.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">
              Список спікерів уточнюється або подія має вільний формат дискусії.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.speakers.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                      {s.position && (
                        <div className="text-xs font-medium text-slate-500 mt-0.5">{s.position}</div>
                      )}
                    </div>
                    {s.linkedin_url && (
                      <a
                        href={s.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:text-brand-900 p-1 rounded hover:bg-white transition"
                        title="Профіль у LinkedIn"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {s.short_bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Студенти, які планують піти ({event.attendees.length})
        </h2>

        {event.attendees.length === 0 ? (
          <p className="text-xs text-slate-500">Поки що ніхто не позначив участь. Будьте першими!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {event.attendees.map((a) => (
              <div
                key={a.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
              >
                <div className="w-5 h-5 rounded-full bg-gold-400 text-slate-900 flex items-center justify-center font-bold text-[10px]">
                  {a.user.name.slice(0, 1)}
                </div>
                <span>{a.user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
