"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function FollowUps() {
  const [leads, setLeads] = useState([]);
  const [reminders, setReminders] = useState(null);

  const fetchLeads = () => {
    fetch(`${API}/follow-ups`)
      .then((res) => res.json())
      .then((data) => setLeads(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchLeads();
    fetch(`${API}/followup-reminders`)
      .then((res) => res.json())
      .then((data) => setReminders(data))
      .catch((err) => console.error(err));
  }, []);

  const sendFollowUp = async (leadId) => {
    try {
      const msgRes = await fetch(
        `${API}/followup-message/${leadId}`
      );

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

      window.open(
        whatsappUrl,
        "_blank"
      );

      await fetch(
        `${API}/send-followup/${leadId}`,
        {
          method: "POST",
        }
      );

      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "hot":
        return "bg-red-100 text-red-700";

      case "warm":
        return "bg-yellow-100 text-yellow-700";

      case "cold":
        return "bg-blue-100 text-blue-700";

      case "closed":
        return "bg-green-100 text-green-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Follow-Up Management
        </h1>

        <p className="text-slate-600 mt-2">
          Track and manage pending customer follow-ups.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Overdue</p>
          <h1 className="mt-2 text-4xl font-bold text-red-500">{reminders?.overdue?.length || 0}</h1>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Today</p>
          <h1 className="mt-2 text-4xl font-bold text-amber-500">{reminders?.today?.length || 0}</h1>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tomorrow</p>
          <h1 className="mt-2 text-4xl font-bold text-blue-600">{reminders?.tomorrow?.length || 0}</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Completed</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900">{reminders?.completed?.length || 0}</h1>
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Today&apos;s Calls</h2>
          <div className="space-y-3">
            {(reminders?.today || []).map((lead) => (
              <div key={lead.id} className={`border-l-4 p-4 rounded-xl ${lead.status === "hot" ? "border-red-500 bg-red-50" : lead.status === "warm" ? "border-amber-500 bg-amber-50" : lead.status === "cold" ? "border-slate-400 bg-slate-50" : "border-green-500 bg-green-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
            {(reminders?.today || []).length === 0 && (
              <p className="text-gray-500">No calls due today.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Overdue Calls</h2>
          <div className="space-y-3">
            {(reminders?.overdue || []).map((lead) => (
              <div key={lead.id} className={`border-l-4 p-4 rounded-xl ${lead.status === "hot" ? "border-red-500 bg-red-50" : lead.status === "warm" ? "border-amber-500 bg-amber-50" : lead.status === "cold" ? "border-slate-400 bg-slate-50" : "border-green-500 bg-green-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                    Overdue
                  </span>
                </div>
              </div>
            ))}
            {(reminders?.overdue || []).length === 0 && (
              <p className="text-gray-500">No overdue calls.</p>
            )}
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            No Follow-Ups Pending 🎉
          </h2>

          <p className="text-slate-600 mt-2">
            All leads are up to date.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {leads.map((lead) => (
            <div
              key={lead.id}
              className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${lead.status === "hot" ? "border-l-4 border-l-red-500" : lead.status === "warm" ? "border-l-4 border-l-amber-500" : lead.status === "cold" ? "border-l-4 border-l-slate-400" : "border-l-4 border-l-green-500"}`}
            >
              <div className="flex justify-between items-start">

                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {lead.name}
                  </h2>

                  <p className="text-slate-500">
                    {lead.phone}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>

              </div>

              <div className="mt-6">

                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">
                    Follow-Ups Done
                  </span>

                  <span className="font-bold text-slate-900">
                    {lead.follow_up_count}/3
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3">

                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{
                      width: `${
                        (lead.follow_up_count / 3) * 100
                      }%`,
                    }}
                  />

                </div>

              </div>

              <button
                onClick={() =>
                  sendFollowUp(lead.id)
                }
                disabled={lead.follow_up_count >= 3}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {lead.follow_up_count === 0
                  ? "Follow-Up #1"
                  : lead.follow_up_count === 1
                    ? "Follow-Up #2"
                    : lead.follow_up_count === 2
                      ? "Follow-Up #3"
                      : "Completed"}
              </button>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}