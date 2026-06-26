"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();

  const menu = [
    { name: "Calculator", path: "/" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Leads", path: "/leads" },
    { name: "Follow-Ups", path: "/followups" },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-slate-900 px-5 py-6 text-white transition-transform duration-300 md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Solar CRM</h2>
          <p className="mt-1 text-xs text-slate-400">Lead Management</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            onClick={onClose}
            className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
              pathname === item.path
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-6 left-5 right-5">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="text-xs font-medium text-slate-300">Version 2.0</p>
          <p className="mt-1 text-xs text-slate-500">Professional CRM</p>
        </div>
      </div>
    </aside>
  );
}
