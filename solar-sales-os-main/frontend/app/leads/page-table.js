"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LeadsTableView() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

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
    if (!window.confirm("Delete this lead?")) return;
    try {
      await fetch(`${API}/delete-lead/${id}`, {
        method: "DELETE",
      });
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await fetch(`${API}/update-lead/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      fetchLeads();
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const searchText = search.toLowerCase();
    const matchSearch =
      (lead.name || "").toLowerCase().includes(searchText) ||
      String(lead.phone || "").toLowerCase().includes(searchText);
    const matchStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "hot":
        return "bg-red-100 text-red-700";
      case "warm":
        return "bg-amber-100 text-amber-700";
      case "cold":
        return "bg-slate-100 text-slate-700";
      case "closed":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Leads (Table View)</h1>
        <p className="mt-2 text-slate-600">Optimized table layout for fast rendering.</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <input
          type="text"
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition focus:border-blue-500 md:w-40"
        >
          <option value="all">All ({leads.length})</option>
          <option value="new">New ({leads.filter((l) => l.status === "new").length})</option>
          <option value="hot">Hot ({leads.filter((l) => l.status === "hot").length})</option>
          <option value="warm">Warm ({leads.filter((l) => l.status === "warm").length})</option>
          <option value="cold">Cold ({leads.filter((l) => l.status === "cold").length})</option>
          <option value="closed">Closed ({leads.filter((l) => l.status === "closed").length})</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Bill</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Survey Date</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                  Loading...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                  No leads found
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{lead.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{lead.phone}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">₹{lead.bill || 0}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status || "new"}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium outline-none ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      <option value="new">New</option>
                      <option value="hot">Hot</option>
                      <option value="warm">Warm</option>
                      <option value="cold">Cold</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{lead.survey_date || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setEditingId(lead.id);
                        setEditForm({ name: lead.name, phone: lead.phone, bill: lead.bill });
                      }}
                      className="mr-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Edit Lead</h2>
            <input
              value={editForm.name || ""}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Customer Name"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
            />
            <input
              value={editForm.phone || ""}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="Phone"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
            />
            <input
              value={editForm.bill || ""}
              onChange={(e) => setEditForm({ ...editForm, bill: e.target.value })}
              placeholder="Monthly Bill"
              className="mb-6 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingId(null)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 font-medium text-slate-800 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
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
