'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SideQuest } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDateKyiv, SIDEQUEST_CATEGORIES, STATUS_LABELS } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  UserCheck,
  Ban,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function SideQuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [sidequest, setSidequest] = useState<SideQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'leave' | 'cancel' | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSidequest = async () => {
    try {
      const data = await api.sidequests.getById(id);
      setSidequest(data);
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити SideQuest');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadSidequest();
    }
  }, [id]);

  const handleJoin = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      const updated = await api.sidequests.join(id);
      setSidequest(updated);
      setActionMsg({ type: 'success', text: 'Ви успішно приєдналися до цього SideQuest!' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Не вдалося приєднатися' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    setConfirmMode(null);
    setActionMsg(null);
    try {
      const updated = await api.sidequests.leave(id);
      setSidequest(updated);
      setActionMsg({ type: 'success', text: 'Ви покинули цей SideQuest.' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Не вдалося вийти з активності' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setConfirmMode(null);
    setActionMsg(null);
    try {
      const updated = await api.sidequests.cancel(id);
      setSidequest(updated);
      setActionMsg({ type: 'success', text: 'SideQuest успішно скасовано.' });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Не вдалося скасувати SideQuest' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Завантаження деталей SideQuest...</p>
      </div>
    );
  }

  if (error || !sidequest) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-xl mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900">SideQuest не знайдено</h2>
        <p className="text-sm text-slate-500 mt-2">{error || 'Можливо, активність була видалена або посилання недійсне.'}</p>
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

  const cat = SIDEQUEST_CATEGORIES[sidequest.category] || { label: sidequest.category, icon: '⚡' };
  const statusInfo = STATUS_LABELS[sidequest.status] || { label: sidequest.status, className: 'bg-slate-100 text-slate-700' };

  const isCreator = user?.id === sidequest.creator.id;
  const isAdmin = user?.role === 'admin';
  const canCancel = (isCreator || isAdmin) && sidequest.status !== 'canceled';
  const isCanceled = sidequest.status === 'canceled';
  const remainingSpots = Math.max(0, sidequest.capacity - sidequest.participant_count);
  const isFull = sidequest.status === 'full' || remainingSpots === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Назад до списку</span>
      </Link>

      {/* Action feedback message */}
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

      {/* Main Detail Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-900 border border-brand-100">
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {sidequest.title}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-700 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Час початку</div>
              <div className="font-bold text-slate-900">{formatDateKyiv(sidequest.starts_at)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-700 shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Локація</div>
              <div className="font-bold text-slate-900">{sidequest.location}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Про активність</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
            {sidequest.description}
          </p>
        </div>

        {/* Action Buttons Section */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-5 h-5 text-slate-400" />
            <span>
              Учасники: <strong className="text-slate-900">{sidequest.participant_count}</strong> з <strong>{sidequest.capacity}</strong>
            </span>
            {isCanceled ? (
              <span className="text-rose-600 font-bold ml-2 text-xs">(Активність скасовано)</span>
            ) : isFull ? (
              <span className="text-amber-600 font-bold ml-2 text-xs">(Група набрана)</span>
            ) : (
              <span className="text-emerald-600 font-bold ml-2 text-xs">(Залишилось місць: {remainingSpots})</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canCancel && confirmMode !== 'cancel' && (
              <button
                type="button"
                onClick={() => setConfirmMode('cancel')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                Скасувати SideQuest
              </button>
            )}

            {confirmMode === 'cancel' && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                <span className="text-rose-800 font-semibold">Підтвердити скасування?</span>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
                >
                  Так, скасувати
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold"
                >
                  Ні
                </button>
              </div>
            )}

            {sidequest.is_joined ? (
              confirmMode === 'leave' ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="text-amber-900 font-semibold">Покинути активність?</span>
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
                  >
                    Так, вийти
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmMode(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold"
                  >
                    Залишитись
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmMode('leave')}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-sm transition disabled:opacity-50"
                >
                  Покинути активність
                </button>
              )
            ) : !isCanceled && !isFull ? (
              <button
                type="button"
                onClick={handleJoin}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                {actionLoading ? 'Обробка...' : 'Приєднатися до компанії'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grid: Creator Info & Participants List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Host Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Організатор активності</h2>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-900 text-gold-400 font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              {sidequest.creator.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-snug">{sidequest.creator.name}</div>
              <div className="text-xs text-slate-500 capitalize mt-0.5">
                {sidequest.creator.role === 'admin' ? 'Адміністратор' : sidequest.creator.role === 'organizer' ? 'Організатор' : 'Студент УКУ'}
              </div>
            </div>
          </div>
          {isCreator && (
            <div className="mt-4 p-2.5 rounded-xl bg-brand-50 border border-brand-100 text-xs text-brand-800 font-medium">
              ⚡ Ви є автором цього SideQuest
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Хто приєднався ({sidequest.participants.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              {remainingSpots > 0 ? `Вільних місць: ${remainingSpots}` : 'Місць немає'}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {sidequest.participants.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {p.user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {p.user.name}
                      {p.user.id === sidequest.creator.id && (
                        <span className="ml-2 text-[10px] font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded-full">
                          Автор
                        </span>
                      )}
                      {user && p.user.id === user.id && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Ви
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Приєднався: {formatDateKyiv(p.joined_at)}
                    </div>
                  </div>
                </div>

                {p.user.visibility_settings === 'hidden' && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Приватний
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
