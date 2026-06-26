"use client";

import { Search } from "lucide-react";

export default function Navbar({
  notificationCount = 0,
  onMenuClick,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 md:hidden"
          aria-label="Open sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
            Solar Sales CRM
          </h1>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden w-full max-w-xs md:block">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSearchSubmit();
                }
              }}
              placeholder="Search leads..."
              className="flex-1 bg-transparent text-sm placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Notification Badge */}
        {notificationCount > 0 && (
          <div className="inline-flex items-center justify-center rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
            {notificationCount}
          </div>
        )}
      </div>
    </header>
  );
}
