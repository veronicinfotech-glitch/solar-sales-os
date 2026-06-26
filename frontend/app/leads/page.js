"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingLead, setEditingLead] = useState(null);
  const [noteLead, setNoteLead] = useState(null);
  const [noteValue, setNoteValue] = useState("");
  const [surveyLead, setSurveyLead] = useState(null);
  const [surveyDate, setSurveyDate] = useState("");
  const [loading, setLoading] = useState(true);

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    bill: "",
  });

  const fetchLeads = () => {
    fetch(`${API}/leads`)
      .then((res) => res.json())
      .then((data) =>
        setLeads(
          [...data].sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
          )
        )
      )
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API}/update-status/${id}?status=${status}`, {
        method: "PUT",
      });

      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLead = async (id) => {
    const confirmDelete = window.confirm("Delete this lead?");

    if (!confirmDelete) return;

    try {
      await fetch(`${API}/delete-lead/${id}`, {
        method: "DELETE",
      });

      setLeads((prev) => prev.filter((lead) => lead.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setEditForm({
      name: lead.name,
      phone: lead.phone,
      bill: lead.bill,
    });
  };

  const saveEdit = async () => {
    try {
      await fetch(`${API}/update-lead/${editingLead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      fetchLeads();
      setEditingLead(null);
    } catch (err) {
      console.error(err);
    }
  };

  const sendWhatsApp = async (leadId) => {
    const res = await fetch(`${API}/whatsapp/${leadId}`);
    const data = await res.json();

    if (!data.phone || !data.message) {
      console.error(data.error || "Unable to prepare WhatsApp message");
      return;
    }

    const normalizedPhone = String(data.phone || "").replace(/\D/g, "").replace(/^91/, "").replace(/^0+/, "");
    const url = `https://wa.me/91${normalizedPhone}?text=` + encodeURIComponent(data.message);
    window.open(url, "_blank");
  };

  const editNotes = async (lead) => {
    setNoteLead(lead);
    setNoteValue(lead.notes || "");
  };

  const saveNotes = async () => {
    if (!noteLead) return;

    await fetch(`${API}/update-notes/${noteLead.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: noteValue }),
    });

    fetchLeads();
    setNoteLead(null);
    setNoteValue("");
  };

  const scheduleSurvey = async (lead) => {
    setSurveyLead(lead);
    setSurveyDate(lead.survey_date || "");
  };

  const saveSurveyDate = async () => {
    if (!surveyLead) return;

    if (!surveyDate) {
      alert("Select a survey date");
      return;
    }

    await fetch(`${API}/schedule-survey/${surveyLead.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ survey_date: surveyDate }),
    });

    fetchLeads();
    setSurveyLead(null);
    setSurveyDate("");
  };

  const filteredLeads = leads.filter((lead) => {
    const searchText = search.toLowerCase();
    const matchSearch =
      (lead.name || "").toLowerCase().includes(searchText) ||
      String(lead.phone || "").toLowerCase().includes(searchText) ||
      (lead.notes || "").toLowerCase().includes(searchText);

    const matchStatus =
      statusFilter === "all" || lead.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Leads Management</h1>
        <p className="mt-2 text-slate-600">Manage all customer leads.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["All", "all"],
          ["New", "new"],
          ["Contacted", "contacted"],
          ["Hot", "hot"],
          ["Warm", "warm"],
          ["Closed", "closed"],
          ["Lost", "lost"],
        ].map(([label, value]) => {
          const count =
            value === "all"
              ? leads.length
              : leads.filter((lead) => lead.status === value).length;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-xl border px-3 py-3 text-left shadow-sm transition ${statusFilter === value ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <input
            type="text"
            placeholder="Search Lead"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${lead.status === "hot" ? "border-l-4 border-l-red-500" : lead.status === "warm" ? "border-l-4 border-l-amber-500" : lead.status === "cold" ? "border-l-4 border-l-slate-400" : lead.status === "closed" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-blue-500"}`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <h2 className="mr-2 text-base font-semibold text-slate-900">{lead.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{lead.phone || "-"}</span>
                  <select
                    value={lead.status || "new"}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 outline-none"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="closed">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">₹{lead.bill || 0}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{lead.survey_date || "No survey"}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditModal(lead)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => window.open(`${API}/generate-proposal/${lead.id}`, "_blank")}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                  >
                    Proposal
                  </button>

                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => sendWhatsApp(lead.id)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    WhatsApp
                  </button>

                  <button
                    onClick={() => editNotes(lead)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                  >
                    Notes
                  </button>

                  <button
                    onClick={() => scheduleSurvey(lead)}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                  >
                    Survey
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">No Leads Found</h2>
            <p className="mt-2 text-slate-600">
              Add your first lead to start tracking solar customers.
            </p>
          </div>
        )}
      </div>

      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Edit Lead</h2>

            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Customer Name"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
            />

            <input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="Phone Number"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
            />

            <input
              value={editForm.bill}
              onChange={(e) => setEditForm({ ...editForm, bill: e.target.value })}
              placeholder="Monthly Bill"
              className="mb-6 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingLead(null)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-800 transition hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                className="rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {surveyLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900">Schedule Survey</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick a valid survey date for {surveyLead.name}.
            </p>

            <label className="mt-6 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Survey Date</span>
              <input
                type="date"
                value={surveyDate}
                onChange={(e) => setSurveyDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSurveyLead(null);
                  setSurveyDate("");
                }}
                className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-800 transition hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                onClick={saveSurveyDate}
                className="rounded-xl bg-cyan-600 px-4 py-2.5 font-medium text-white transition hover:bg-cyan-700"
              >
                Save Survey
              </button>
            </div>
          </div>
        </div>
      )}

      {noteLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">Lead Notes</h2>
            <p className="mt-2 text-sm text-slate-600">Update notes for {noteLead.name}.</p>

            <textarea
              rows={6}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setNoteLead(null);
                  setNoteValue("");
                }}
                className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-800 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
