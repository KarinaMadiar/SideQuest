'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { Compass, Calendar, PlusCircle, User, LogOut, Menu, X, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/', label: 'Стрічка', icon: Compass },
    ...(user ? [{ href: '/my-activities', label: 'Мої активності', icon: Calendar }] : []),
  ];

  const isOrganizerOrAdmin = user?.role === 'organizer' || user?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-brand-900 text-gold-400 flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <span className="font-extrabold text-brand-950 text-lg tracking-tight block">
                UCU <span className="text-gold-600">SideQuest</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block -mt-1">
                Спільнота УКУ
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 font-semibold'
                      : 'text-slate-600 hover:text-brand-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions & User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                <Link
                  href="/sidequests/create"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-900 hover:bg-brand-800 text-white text-sm font-medium transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Створити SideQuest</span>
                </Link>

                {isOrganizerOrAdmin && (
                  <Link
                    href="/events/create"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gold-500 bg-gold-50 text-gold-800 hover:bg-gold-100 text-sm font-medium transition shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Створити подію</span>
                  </Link>
                )}
              </>
            )}

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-700"
                      title="Мій профіль"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-semibold text-xs border border-brand-200">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left hidden lg:block">
                        <div className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {user.role === 'admin' ? 'Адміністратор' : user.role === 'organizer' ? 'Організатор' : 'Студент'}
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Вийти з акаунту"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/login"
                      className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      Увійти
                    </Link>
                    <Link
                      href="/register"
                      className="px-3.5 py-2 rounded-lg text-sm font-medium bg-gold-500 hover:bg-gold-600 text-white transition shadow-sm"
                    >
                      Реєстрація
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <Link
                href="/sidequests/create"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-900 text-white font-medium text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Створити SideQuest
              </Link>
              {isOrganizerOrAdmin && (
                <Link
                  href="/events/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-gold-500 bg-gold-50 text-gold-800 font-medium text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Створити подію
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium"
              >
                <User className="w-4 h-4" />
                Профіль ({user.name})
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Вийти
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm"
              >
                Увійти
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-lg bg-gold-500 text-white font-medium text-sm shadow-sm"
              >
                Реєстрація
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
