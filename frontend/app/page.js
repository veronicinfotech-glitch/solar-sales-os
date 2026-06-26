"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bill, setBill] = useState("");
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setPhone("");
    setBill("");
  };

  const annualSavings = result?.annual_savings || 0;
  const cost = result?.cost || 0;
  const systemSize = result?.system_size || 0;

  // Memoize expensive calculations to prevent unnecessary recomputes
  const calculations = useMemo(() => {
    const monthlySaving = annualSavings / 12;
    const lifetimeSavings = annualSavings * 25;
    const roiPercent = cost > 0 ? (lifetimeSavings / cost) * 100 : 0;
    const roiLabels = result
      ? Array.from({ length: 12 }, (_, index) => `Year ${index + 1}`)
      : [];
    const roiSeries = result
      ? Array.from({ length: 12 }, (_, index) => ((index + 1) * annualSavings) - cost)
      : [];
    
    return {
      monthlySaving,
      lifetimeSavings,
      roiPercent,
      roiLabels,
      roiSeries,
    };
  }, [result, annualSavings, cost]);

  const { monthlySaving, lifetimeSavings, roiPercent, roiLabels, roiSeries } = calculations;

  const calculate = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const billValue = Number(bill);

    if (!trimmedName || !trimmedPhone || !bill) {
      alert("Fill all fields");
      return;
    }

    if (Number.isNaN(billValue) || billValue <= 0) {
      alert("Enter valid bill");
      return;
    }

    setSaving(true);

    try {
      const calculateRes = await fetch(`${API}/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bill: billValue,
        }),
      });

      const proposal = await calculateRes.json();
      setResult(proposal);

      await fetch(`${API}/save-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Solar Proposal Calculator
          </h1>
          <p className="mt-2 text-slate-600">
            Capture a lead and generate a solar proposal from the monthly bill.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition hover:bg-blue-600"
        >
          View Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
        <form
          onSubmit={calculate}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Quick Lead Entry
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add the customer details once. The proposal values are saved with
              the lead automatically.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Customer Name
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                placeholder="Amit Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Phone Number
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Monthly Bill
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
                placeholder="4500"
                type="number"
                min="1"
                value={bill}
                onChange={(e) => setBill(e.target.value)}
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Generating..." : "Generate Proposal"}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Proposal Output
          </h2>

          {result ? (
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">
                  System Size
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {result.system_size} kW
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Cost</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Rs {result.cost}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Savings</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    Rs {result.annual_savings}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Payback</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {result.payback_years} yrs
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-600">
                Enter a lead and monthly bill to see the proposal estimate here.
              </p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">ROI Analysis</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">25 Years Savings</p>
              <p className="mt-1 text-xl font-bold text-slate-900">Rs {lifetimeSavings.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Monthly Saving</p>
              <p className="mt-1 text-xl font-bold text-slate-900">Rs {monthlySaving.toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">CO₂ Reduction</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{Math.max(1, Math.round(systemSize * 1.5))} tons</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">ROI %</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{roiPercent.toFixed(0)}%</p>
            </div>
          </div>

          <div className="mt-6 flex h-80 items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {roiSeries.map((value, index) => {
              const maxValue = Math.max(...roiSeries, 1);
              const height = `${Math.max(10, (value / maxValue) * 100)}%`;

              return (
                <div key={roiLabels[index]} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t-lg bg-blue-600/80"
                    style={{ height }}
                  />
                  <span className="text-[10px] text-slate-500">{roiLabels[index]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
