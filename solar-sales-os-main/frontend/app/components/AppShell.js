"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AppShell({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const loadNotifications = () => {
      fetch(`${API}/notifications`)
        .then((res) => res.json())
        .then((data) => setNotificationCount(data.length || 0))
        .catch((err) => console.error(err));
    };

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSearchSubmit = () => {
    const query = searchValue.trim();

    if (!query) return;

    router.push(`/leads?search=${encodeURIComponent(query)}`);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen md:pl-72">
        <Navbar
          notificationCount={notificationCount}
          onMenuClick={() => setSidebarOpen(true)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearchSubmit={handleSearchSubmit}
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
        />
      )}
    </div>
  );
}