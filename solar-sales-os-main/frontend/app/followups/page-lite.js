"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function FollowUpsLite() {
  const [leads, setLeads] = useState([]);
  const [reminders, setReminders] = useState({
    today: [],
    overdue: [],
  });

  useEffect(() => {
    fetch(`${API}/follow-ups`)
      .then((res) => res.json())
      .then((data) => setLeads(data))
      .catch((err) => console.error(err));

    fetch(`${API}/followup-reminders`)
      .then((res) => res.json())
      .then((data) => setReminders(data))
      .catch((err) => console.error(err));
  }, []);

  const sendFollowUp = async (leadId) => {
    try {
      const msgRes = await fetch(`${API}/followup-message/${leadId}`);
      const msgData = await msgRes.json();

      if (msgData.follow_up_count >= 3) {
        alert("All follow-ups completed");
        return;
      }

      const normalizedPhone = String(msgData.phone || "")
        .replace(/\D/g, "")
        .replace(/^91/, "")
        .replace(/^0+/, "");

      const whatsappUrl =
        `https://wa.me/91${normalizedPhone}?text=` +
        encodeURIComponent(msgData.message);

      window.open(whatsappUrl, "_blank");

      await fetch(`${API}/send-followup/${leadId}`, {
        method: "POST",
      });

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? { ...lead, follow_up_count: lead.follow_up_count + 1 }
            : lead
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "hot":
        return "text-red-600 font-semibold";
      case "warm":
        return "text-amber-600 font-semibold";
      case "cold":
        return "text-slate-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Follow-Ups (Lite)</h1>
        <p className="mt-2 text-slate-600">Minimal rendering. No heavy components.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Overdue</p>
          <h1 className="mt-2 text-4xl font-bold text-red-500">{reminders.overdue?.length || 0}</h1>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Today</p>
          <h1 className="mt-2 text-4xl font-bold text-amber-500">{reminders.today?.length || 0}</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Today&apos;s Calls</h2>
          <div className="space-y-2">
            {(reminders.today || []).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.phone}</p>
                </div>
                <span className={`text-xs font-semibold ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
            ))}
            {(reminders.today || []).length === 0 && (
              <p className="text-sm text-slate-600">No calls due today.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Overdue Calls</h2>
          <div className="space-y-2">
            {(reminders.overdue || []).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.phone}</p>
                </div>
                <span className="text-xs font-semibold text-red-600">OVERDUE</span>
              </div>
            ))}
            {(reminders.overdue || []).length === 0 && (
              <p className="text-sm text-slate-600">No overdue calls.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Pending Follow-Ups</h2>
        {leads.length === 0 ? (
          <p className="text-slate-600">No pending follow-ups.</p>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.phone}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                      lead.status
                    )}`}>
                      {lead.follow_up_count || 0}/3
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => sendFollowUp(lead.id)}
                  disabled={lead.follow_up_count >= 3}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {lead.follow_up_count === 0
                    ? "FU #1"
                    : lead.follow_up_count === 1
                      ? "FU #2"
                      : lead.follow_up_count === 2
                        ? "FU #3"
                        : "Done"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
