"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Calculator() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bill, setBill] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setPhone("");
    setBill("");
    setResult(null);
  };

  const handleCalculate = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const billValue = Number(bill);

    if (!trimmedName || !trimmedPhone || !billValue) {
      alert("Please fill all fields");
      return;
    }

    if (billValue <= 0) {
      alert("Monthly bill must be greater than 0");
      return;
    }

    setLoading(true);

    try {
      const calculateRes = await fetch(`${API}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill: billValue }),
      });

      const proposal = await calculateRes.json();
      setResult(proposal);

      await fetch(`${API}/save-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          bill: billValue,
          system_size: proposal.system_size,
          annual_savings: proposal.annual_savings,
        }),
      });

      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error calculating proposal");
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    if (!result) return null;
    const annual = result.annual_savings || 0;
    const cost = result.cost || 0;
    const lifetime = annual * 25;
    const roi = cost > 0 ? ((lifetime - cost) / cost) * 100 : 0;
    return {
      monthly: annual / 12,
      lifetime,
      roi: roi.toFixed(0),
      payback: result.payback_years,
    };
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Solar Proposal</h1>
          <p className="mt-1 text-sm text-slate-600">Quick calculation tool</p>
        </div>
        <Link
          href="/leads"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          View All Leads
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-1">
          <form onSubmit={handleCalculate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Customer Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Monthly Bill (₹)
              </label>
              <input
                type="number"
                value={bill}
                onChange={(e) => setBill(e.target.value)}
                placeholder="5000"
                min="1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? "Calculating..." : "Calculate Proposal"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-2">
          {!result ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-600">Enter details to see proposal</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    System Size
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {result.system_size} <span className="text-lg">kW</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Cost
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    ₹{(result.cost / 100000).toFixed(1)}L
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Annual Savings
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    ₹{(result.annual_savings / 1000).toFixed(0)}k
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Monthly Saving
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    ₹{Math.round(metrics.monthly)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Payback
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {metrics.payback} <span className="text-lg">yrs</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    25-Year ROI
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    {metrics.roi}%
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-medium text-slate-700">
                  25-Year Savings: <span className="text-lg font-bold text-green-600">₹{(metrics.lifetime / 100000).toFixed(1)}L</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
