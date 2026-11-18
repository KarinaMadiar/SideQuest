'use client';

import React from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { formatDateKyiv, EVENT_CATEGORIES, STATUS_LABELS } from '@/lib/utils';
import { Calendar, MapPin, Users, Building2, CheckCircle } from 'lucide-react';

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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Top Banner */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-50 text-gold-900 border border-gold-200">
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <Link href={`/events/${event.id}`} className="group">
          <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-gold-700 transition line-clamp-2">
            {event.title}
          </h3>
        </Link>

        {event.organization && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{event.organization.name}</span>
          </div>
        )}

        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {event.description}
        </p>
      </div>

      {/* Metadata */}
      <div className="px-5 py-3 bg-slate-50/50 border-y border-slate-100 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold-600 flex-shrink-0" />
          <span className="font-medium text-slate-800">{formatDateKyiv(event.starts_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-5 pt-3 mt-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Users className="w-4 h-4 text-slate-400" />
          <span>Планують піти: <strong className="text-slate-900">{event.attendee_count}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {event.is_attending ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              Ви йдете
            </span>
          ) : !isCanceled && onAttend ? (
            <button
              onClick={() => onAttend(event.id)}
              disabled={loadingAttend}
              className="px-3.5 py-1.5 rounded-lg bg-gold-600 hover:bg-gold-700 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
            >
              {loadingAttend ? 'Збереження...' : 'Планую піти'}
            </button>
          ) : null}

          <Link
            href={`/events/${event.id}`}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition"
          >
            Деталі
          </Link>
        </div>
      </div>
    </div>
  );
}
