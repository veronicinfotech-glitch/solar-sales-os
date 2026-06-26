"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_leads: 0,
    new: 0,
    contacted: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    today_calls: 0,
    overdue_calls: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/dashboard-stats`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const metrics = [
    { label: "Total Leads", value: stats.total_leads, color: "text-slate-900" },
    { label: "New", value: stats.new, color: "text-blue-600" },
    { label: "Contacted", value: stats.contacted, color: "text-slate-600" },
    { label: "Hot", value: stats.hot, color: "text-red-600" },
    { label: "Warm", value: stats.warm, color: "text-amber-600" },
    { label: "Cold", value: stats.cold, color: "text-slate-400" },
    { label: "Today's Calls", value: stats.today_calls, color: "text-green-600" },
    { label: "Overdue Calls", value: stats.overdue_calls, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">CRM Overview</p>
        </div>
        <Link
          href="/leads"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View All Leads
        </Link>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {metric.label}
              </p>
              <p className={`mt-3 text-3xl font-bold ${metric.color}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
