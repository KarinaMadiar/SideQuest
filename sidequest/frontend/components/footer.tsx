import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">UCU SideQuest</span>
            <span>•</span>
            <span>Студентська платформа Українського Католицького Університету</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Часовий пояс: Europe/Kyiv</span>
            <span>•</span>
            <span>Львів, вул. Козельницька, 2а</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
