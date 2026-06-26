"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import { Doughnut } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    hot: 0,
    revenuePotential: 0,
    callsToday: 0,
    overdueCalls: 0,
    todaySurveys: 0,
    warm: 0,
    cold: 0,
  });
  const [reminders, setReminders] = useState({ today: [] });
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard-stats`).then((res) => res.json()),
      fetch(`${API}/followup-reminders`).then((res) => res.json()),
    ])
      .then(([statsData, reminderData]) => {
        setReminders({
          today: reminderData.today || [],
        });

        setChartData({
          labels: ["Hot", "Warm", "Cold"],
          datasets: [
            {
              data: [statsData.hot || 0, statsData.warm || 0, statsData.cold || 0],
              backgroundColor: ["#EF4444", "#F59E0B", "#64748B"],
              borderWidth: 0,
            },
          ],
        });

        setStats({
          total: statsData.total_leads || 0,
          hot: statsData.hot || 0,
          warm: statsData.warm || 0,
          cold: statsData.cold || 0,
          callsToday: statsData.today_calls || 0,
          overdueCalls: statsData.overdue_calls || 0,
          todaySurveys: statsData.today_surveys || 0,
          revenuePotential: statsData.revenue_potential || 0,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Live sales overview and follow-up command center.
          </p>
        </div>

        <Link
          href="/followups"
          className="inline-flex rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          View Followups
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-600">Loading...</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Leads</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Hot Leads</p>
          <h2 className="mt-2 text-2xl font-bold text-amber-500">{stats.hot}</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Today&apos;s Calls</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-600">{stats.callsToday}</h2>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Revenue Potential</p>
          <h2 className="mt-2 text-2xl font-bold text-emerald-600">₹{stats.revenuePotential.toLocaleString()}</h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Lead Status Chart</h2>
          {chartData && (
            <div className="mx-auto max-w-sm">
              <Doughnut data={chartData} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">Today&apos;s Followups</h2>
          <div className="space-y-3">
            {reminders.today.length > 0 ? (
              reminders.today.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    <p className="text-sm text-slate-500">{lead.phone}</p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    {lead.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No followups due today.</p>
            )}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Survey due today: <span className="font-semibold text-slate-900">{stats.todaySurveys}</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Overdue calls: <span className="font-semibold text-slate-900">{stats.overdueCalls}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
