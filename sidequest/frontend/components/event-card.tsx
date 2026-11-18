'use client';

import React from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { formatDateKyiv, EVENT_CATEGORIES, STATUS_LABELS } from '@/lib/utils';
import { Calendar, MapPin, Users, Building2, CheckCircle, Award, ArrowRight, Mic } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onAttend?: (id: string) => void;
  loadingAttend?: boolean;
}

export function EventCard({ event, onAttend, loadingAttend }: EventCardProps) {
  const cat = EVENT_CATEGORIES[event.category] || { label: event.category, icon: '📌' };
  const statusInfo = STATUS_LABELS[event.status] || { label: event.status, className: 'bg-slate-100 text-slate-700' };
  const isCanceled = event.status === 'canceled';

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-gold-400 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Top Accent Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-gold-600 via-gold-500 to-amber-300" />

      {/* Top Banner */}
      <div className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold-600 text-white">
              <Award className="w-3 h-3" />
              <span>Подія УКУ</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-50 text-gold-900 border border-gold-200">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </span>
          </div>

          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Date/Time Eyebrow */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-gold-700 uppercase tracking-wide mb-1.5">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <time dateTime={event.starts_at}>{formatDateKyiv(event.starts_at)}</time>
        </div>

        <Link href={`/events/${event.id}`} className="block focus:outline-none">
          <h3 className="font-extrabold text-slate-900 text-lg leading-snug group-hover:text-gold-700 transition line-clamp-2">
            {event.title}
          </h3>
        </Link>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {event.description}
        </p>
      </div>

      {/* Metadata */}
      <div className="px-5 py-3 bg-slate-50/70 border-y border-slate-100 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate font-medium text-slate-700">{event.location}</span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-gold-600 flex-shrink-0" />
            <span className="truncate text-slate-600">
              Організатор:{' '}
              <strong className="text-slate-800 font-semibold">
                {event.organization ? event.organization.name : event.creator.name}
              </strong>
            </span>
          </div>

          {event.speakers && event.speakers.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[10px] font-bold flex-shrink-0">
              <Mic className="w-2.5 h-2.5" />
              {event.speakers.length} {event.speakers.length === 1 ? 'спікер' : 'спікери'}
            </span>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-5 pt-3.5 mt-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span>
            Планують піти: <strong className="text-slate-900 font-bold">{event.attendee_count}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {event.is_attending ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Ви йдете</span>
            </span>
          ) : !isCanceled && onAttend ? (
            <button
              type="button"
              onClick={() => onAttend(event.id)}
              disabled={loadingAttend}
              className="px-3.5 py-2 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
            >
              {loadingAttend ? 'Збереження...' : 'Планую піти'}
            </button>
          ) : null}

          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
          >
            <span>Деталі</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>
    </article>
  );
}
