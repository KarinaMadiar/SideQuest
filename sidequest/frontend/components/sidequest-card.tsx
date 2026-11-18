'use client';

import React from 'react';
import Link from 'next/link';
import { SideQuest } from '@/types';
import { formatDateKyiv, SIDEQUEST_CATEGORIES, STATUS_LABELS } from '@/lib/utils';
import { Calendar, MapPin, Users, CheckCircle } from 'lucide-react';

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Top Banner */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-900 border border-brand-100">
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </span>

          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <Link href={`/sidequests/${sidequest.id}`} className="group">
          <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-brand-800 transition line-clamp-2">
            {sidequest.title}
          </h3>
        </Link>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {sidequest.description}
        </p>
      </div>

      {/* Metadata */}
      <div className="px-5 py-3 bg-slate-50/50 border-y border-slate-100 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-700 flex-shrink-0" />
          <span className="font-medium text-slate-800">{formatDateKyiv(sidequest.starts_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="truncate">{sidequest.location}</span>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-5 pt-3 mt-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Users className="w-4 h-4 text-slate-400" />
          <div>
            <span className="font-bold text-slate-900">{sidequest.participant_count}</span>
            <span className="text-slate-500"> / {sidequest.capacity} місць</span>
            {isCanceled ? (
              <span className="block text-rose-600 font-semibold text-[11px]">Скасовано</span>
            ) : isFull ? (
              <span className="block text-amber-600 font-semibold text-[11px]">Групу набрано</span>
            ) : (
              <span className="block text-emerald-600 font-semibold text-[11px]">Вільних: {remainingSpots}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sidequest.is_joined ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              Ви берете участь
            </span>
          ) : !isCanceled && !isFull && onJoin ? (
            <button
              onClick={() => onJoin(sidequest.id)}
              disabled={loadingJoin}
              className="px-3.5 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-800 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
            >
              {loadingJoin ? 'Приєднання...' : 'Приєднатися'}
            </button>
          ) : null}

          <Link
            href={`/sidequests/${sidequest.id}`}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition"
          >
            Деталі
          </Link>
        </div>
      </div>
    </div>
  );
}
