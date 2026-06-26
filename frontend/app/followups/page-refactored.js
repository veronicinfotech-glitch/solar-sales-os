"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function FollowUpsPage() {
  const [leads, setLeads] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [today, setToday] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/follow-ups`).then((res) => res.json()),
      fetch(`${API}/followup-reminders`).then((res) => res.json()),
    ])
      .then(([leadsData, remindersData]) => {
        setLeads(leadsData || []);
        setOverdue(remindersData?.overdue || []);
        setToday(remindersData?.today || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const sendFollowUp = async (leadId) => {
    try {
      const msgRes = await fetch(`${API}/followup-message/${leadId}`);
      const msgData = await msgRes.json();

      if (msgData.follow_up_count >= 3) {
        alert("All 3 follow-ups completed for this lead");
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

      await fetch(`${API}/send-followup/${leadId}`, { method: "POST" });

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? { ...lead, follow_up_count: (lead.follow_up_count || 0) + 1 }
            : lead
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "hot":
        return "bg-red-50 text-red-700 border-red-200";
      case "warm":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cold":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Follow-Ups</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track and send customer follow-ups
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium uppercase text-red-600">Overdue</p>
              <p className="mt-2 text-2xl font-bold text-red-700">
                {overdue.length}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium uppercase text-amber-600">Today</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {today.length}
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-medium uppercase text-blue-600">
                Pending
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-700">
                {leads.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-600">
                Completed
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-700">
                {leads.filter((l) => l.follow_up_count >= 3).length}
              </p>
            </div>
          </div>

          {/* Overdue Section */}
          {overdue.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <h2 className="mb-4 font-semibold text-red-900">
                ⚠️ Overdue Calls ({overdue.length})
              </h2>
              <div className="space-y-2">
                {overdue.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg bg-white px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{lead.name}</p>
                      <p className="text-sm text-slate-600">{lead.phone}</p>
                    </div>
                    <span
                      className={`rounded-lg border px-3 py-1 text-xs font-medium ${getStatusBadge(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {today.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
              <h2 className="mb-4 font-semibold text-amber-900">
                📅 Due Today ({today.length})
              </h2>
              <div className="space-y-2">
                {today.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg bg-white px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{lead.name}</p>
                      <p className="text-sm text-slate-600">{lead.phone}</p>
                    </div>
                    <span
                      className={`rounded-lg border px-3 py-1 text-xs font-medium ${getStatusBadge(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Follow-Ups */}
          {leads.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">No pending follow-ups</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 font-semibold text-slate-900">
                Pending Follow-Ups ({leads.length})
              </h2>
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {lead.name}
                        </p>
                        <span
                          className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${getStatusBadge(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {lead.phone}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Follow-ups: {lead.follow_up_count}/3
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendFollowUp(lead.id)}
                        disabled={lead.follow_up_count >= 3}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <MessageCircle size={14} />
                        {lead.follow_up_count === 0
                          ? "Start"
                          : lead.follow_up_count < 3
                            ? `FU #${lead.follow_up_count + 1}`
                            : "Done"}
                      </button>
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
