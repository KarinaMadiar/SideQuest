'use client';

import React from 'react';
import Link from 'next/link';
import { SideQuest } from '@/types';
import { formatDateKyiv, SIDEQUEST_CATEGORIES, STATUS_LABELS } from '@/lib/utils';
import { Calendar, MapPin, Users, CheckCircle, Compass, ArrowRight } from 'lucide-react';

interface SideQuestCardProps {
  sidequest: SideQuest;
  onJoin?: (id: string) => void;
  loadingJoin?: boolean;
}

export function SideQuestCard({ sidequest, onJoin, loadingJoin }: SideQuestCardProps) {
  const cat = SIDEQUEST_CATEGORIES[sidequest.category] || { label: sidequest.category, icon: '⚡' };
  const statusInfo = STATUS_LABELS[sidequest.status] || { label: sidequest.status, className: 'bg-slate-100 text-slate-700' };

  const remainingSpots = Math.max(0, sidequest.capacity - sidequest.participant_count);
  const isFull = sidequest.status === 'full' || remainingSpots === 0;
  const isCanceled = sidequest.status === 'canceled';
  const fillPercent = Math.min(100, Math.round((sidequest.participant_count / Math.max(1, sidequest.capacity)) * 100));

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-brand-300 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Top Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500" />

      {/* Header & Badges */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-900 text-white">
              <Compass className="w-3 h-3 text-gold-400" />
              <span>SideQuest</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-900 border border-brand-100">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </span>
          </div>

          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Date/Time Eyebrow (Meetup-style) */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 uppercase tracking-wide mb-1.5">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <time dateTime={sidequest.starts_at}>{formatDateKyiv(sidequest.starts_at)}</time>
        </div>

        <Link href={`/sidequests/${sidequest.id}`} className="block focus:outline-none">
          <h3 className="font-extrabold text-slate-900 text-lg leading-snug group-hover:text-brand-800 transition line-clamp-2">
            {sidequest.title}
          </h3>
        </Link>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {sidequest.description}
        </p>
      </div>

      {/* Location & Organizer Metadata */}
      <div className="px-5 py-3 bg-slate-50/70 border-y border-slate-100 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate font-medium text-slate-700">{sidequest.location}</span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-brand-900 text-gold-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
              {sidequest.creator.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="truncate text-slate-600">
              Автор: <strong className="text-slate-800 font-semibold">{sidequest.creator.name}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Capacity & Actions */}
      <div className="p-5 pt-3.5 mt-auto space-y-3">
        {/* Capacity Bar & Avatar Stack */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5 overflow-hidden">
                {sidequest.participants.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    title={p.user.name}
                    className="w-6 h-6 rounded-full bg-brand-100 border-2 border-white text-brand-900 font-bold text-[10px] flex items-center justify-center"
                  >
                    {p.user.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-slate-600">
                <strong className="text-slate-900 font-bold">{sidequest.participant_count}</strong> / {sidequest.capacity} місць
              </span>
            </div>

            {isCanceled ? (
              <span className="text-rose-600 font-bold text-[11px]">Скасовано</span>
            ) : isFull ? (
              <span className="text-amber-600 font-bold text-[11px]">Групу набрано</span>
            ) : (
              <span className="text-emerald-700 font-bold text-[11px]">Вільних: {remainingSpots}</span>
            )}
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isCanceled ? 'bg-rose-400' : isFull ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {sidequest.is_joined ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Ви берете участь</span>
            </span>
          ) : !isCanceled && !isFull && onJoin ? (
            <button
              type="button"
              onClick={() => onJoin(sidequest.id)}
              disabled={loadingJoin}
              className="px-3.5 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
            >
              {loadingJoin ? 'Приєднання...' : 'Приєднатися'}
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              {isCanceled ? 'Недоступно' : isFull ? 'Місць немає' : ''}
            </span>
          )}

          <Link
            href={`/sidequests/${sidequest.id}`}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition ml-auto"
          >
            <span>Деталі</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>
    </article>
  );
}
