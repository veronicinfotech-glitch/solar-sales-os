"use client";

import { Bell, Menu, Search } from "lucide-react";

export default function Navbar({
  notificationCount = 0,
  onMenuClick,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Solar Sales OS
          </p>
          <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">
            Premium Sales Workspace
          </h1>
        </div>

        <div className="hidden w-full max-w-xl md:block">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSearchSubmit();
                }
              }}
              placeholder="Search lead"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600">
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-white shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              A
            </div>
            <div>
              <p className="text-sm font-semibold">Admin</p>
              <p className="text-xs text-slate-300">Operations</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}