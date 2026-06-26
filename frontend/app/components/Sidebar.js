"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();

  const menu = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Calculator", path: "/" },
    { name: "Leads", path: "/leads" },
    { name: "Follow Ups", path: "/followups" },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 h-screen w-72 border-r border-slate-800 bg-slate-900 px-5 py-6 text-white shadow-2xl shadow-slate-900/20 transition-transform duration-300 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <div className="mb-8 flex items-start justify-between rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
            Solar Sales OS
          </p>
          <h1 className="mt-2 text-xl font-bold text-white">
            Command Center
          </h1>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            onClick={onClose}
            className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
              pathname === item.path
                ? "bg-blue-600"
                : "text-slate-300 hover:bg-blue-600 hover:text-white"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </aside>
  );
}