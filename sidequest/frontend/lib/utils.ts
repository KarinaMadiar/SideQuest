import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SideQuestCategory, EventCategory, SideQuestStatus, EventStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateKyiv(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export const SIDEQUEST_CATEGORIES: Record<SideQuestCategory, { label: string; icon: string }> = {
  coffee: { label: 'Кава та розмови', icon: '☕' },
  sports: { label: 'Спорт та активність', icon: '⚽' },
  walks: { label: 'Прогулянки', icon: '🌲' },
  study: { label: 'Спільне навчання', icon: '📚' },
  culture: { label: 'Культура та кіно', icon: '🎭' },
  career: { label: 'Кар\'єра та нетворкінг', icon: '💼' },
  volunteering: { label: 'Волонтерство', icon: '🤝' },
  other: { label: 'Інше', icon: '✨' },
};

export const EVENT_CATEGORIES: Record<EventCategory, { label: string; icon: string }> = {
  lecture: { label: 'Лекція', icon: '🎓' },
  workshop: { label: 'Воркшоп / Тренінг', icon: '🛠️' },
  conference: { label: 'Конференція', icon: '🏛️' },
  career: { label: 'Кар\'єрна подія', icon: '💼' },
  social: { label: 'Студентська зустріч', icon: '🎉' },
  culture: { label: 'Культурний захід', icon: '🎨' },
  other: { label: 'Інше', icon: '📌' },
};

export const STATUS_LABELS: Record<SideQuestStatus | EventStatus, { label: string; className: string }> = {
  open: { label: 'Відкрито', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  full: { label: 'Заповнено', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  canceled: { label: 'Скасовано', className: 'bg-rose-100 text-rose-800 border-rose-200 line-through' },
  completed: { label: 'Завершено', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  published: { label: 'Опубліковано', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};
