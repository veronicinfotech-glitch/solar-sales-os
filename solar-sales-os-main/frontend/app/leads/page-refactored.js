"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2, Edit2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchLeads = useCallback(() => {
    fetch(`${API}/leads`)
      .then((res) => res.json())
      .then((data) => {
        setLeads(
          [...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API}/update-status/${id}?status=${status}`, { method: "PUT" });
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
      await fetch(`${API}/delete-lead/${id}`, { method: "DELETE" });
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await fetch(`${API}/update-lead/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      fetchLeads();
      setEditId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const searchText = search.toLowerCase();
    const matchSearch =
      (lead.name || "").toLowerCase().includes(searchText) ||
      String(lead.phone || "").includes(searchText);
    const matchStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "hot":
        return "bg-red-50 text-red-700 border-red-200";
      case "warm":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "closed":
        return "bg-green-50 text-green-700 border-green-200";
      case "lost":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-600">Manage and track all customer leads</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">No leads found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-700">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-700">
                    Bill
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-700">
                    Survey
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {lead.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      ₹{lead.bill || 0}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status || "new"}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`rounded border px-2 py-1 text-xs font-medium focus:outline-none ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="closed">Closed</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {lead.survey_date || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setEditId(lead.id);
                          setEditForm({
                            name: lead.name,
                            phone: lead.phone,
                            bill: lead.bill,
                          });
                        }}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 lg:hidden">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{lead.name}</p>
                    <p className="text-sm text-slate-600">{lead.phone}</p>
                  </div>
                  <select
                    value={lead.status || "new"}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${getStatusColor(
                      lead.status
                    )}`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-600">₹{lead.bill || 0}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditId(lead.id);
                        setEditForm({
                          name: lead.name,
                          phone: lead.phone,
                          bill: lead.bill,
                        });
                      }}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Edit Lead</h2>
            <input
              value={editForm.name || ""}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Name"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              value={editForm.phone || ""}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="Phone"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              value={editForm.bill || ""}
              onChange={(e) => setEditForm({ ...editForm, bill: e.target.value })}
              placeholder="Monthly Bill"
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditId(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
